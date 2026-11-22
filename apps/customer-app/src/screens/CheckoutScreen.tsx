import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { CustomerAddress, formatPaiseToRupees, formatIndianAddress } from '@mymart/shared';
import { useCartStore } from '../store/cartStore';
import { getCustomerAddresses, getStoreSettings, placeOrder } from '../lib/api';
import { useCustomerAuth } from '../context/AuthContext';

interface CheckoutScreenProps {
  onBack: () => void;
  onOrderPlaced: (orderId: string, orderNumber: string) => void;
  onManageAddresses: () => void;
  onRequireAuth: () => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  onBack,
  onOrderPlaced,
  onManageAddresses,
  onRequireAuth,
}) => {
  const { items, getSubtotalPaise, clearCart } = useCartStore();
  const subtotal = getSubtotalPaise();
  const { isAuthenticated } = useCustomerAuth();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  });

  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ['customer-addresses'],
    queryFn: getCustomerAddresses,
  });

  // Pick default address once addresses load
  React.useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId);

  // Check pincode serviceability
  const isPincodeServiceable =
    selectedAddress &&
    storeSettings?.serviceable_pincodes?.includes(selectedAddress.pincode);

  const deliveryFee =
    subtotal >= (storeSettings?.free_delivery_threshold_paise ?? 24900)
      ? 0
      : storeSettings?.delivery_fee_paise ?? 2500;
  const totalPayable = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!selectedAddress) {
      setErrorMessage('Please select or add a delivery address');
      return;
    }

    if (!isPincodeServiceable) {
      setErrorMessage(
        `Sorry, PIN code ${selectedAddress.pincode} is currently not serviceable for quick delivery.`
      );
      return;
    }

    if (storeSettings && !storeSettings.is_store_open) {
      setErrorMessage('The store is currently closed. Orders cannot be placed at this time.');
      return;
    }

    if (storeSettings && subtotal < storeSettings.minimum_order_paise) {
      setErrorMessage(
        `Order amount must be at least ${formatPaiseToRupees(storeSettings.minimum_order_paise)}`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        address_id: selectedAddress.id,
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };

      const result = await placeOrder(payload);
      clearCart();
      onOrderPlaced(result.order_id, result.order_number);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Address Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={onManageAddresses}>
              <Text style={styles.cardAction}>
                {addresses && addresses.length > 0 ? 'Change / Add' : '+ Add Address'}
              </Text>
            </TouchableOpacity>
          </View>

          {loadingAddresses ? (
            <ActivityIndicator color="#16a34a" style={{ marginVertical: 10 }} />
          ) : selectedAddress ? (
            <View style={styles.addressBox}>
              <View style={styles.addressNameRow}>
                <Text style={styles.addressName}>{selectedAddress.full_name}</Text>
                <View style={styles.phoneBadge}>
                  <Text style={styles.phoneText}>{selectedAddress.phone}</Text>
                </View>
              </View>

              <Text style={styles.addressDetail}>
                {formatIndianAddress(selectedAddress)}
              </Text>

              {isPincodeServiceable ? (
                <View style={styles.serviceableTag}>
                  <Text style={styles.serviceableText}>✓ PIN {selectedAddress.pincode} Serviceable (10-15m)</Text>
                </View>
              ) : (
                <View style={styles.unserviceableTag}>
                  <Text style={styles.unserviceableText}>✗ PIN {selectedAddress.pincode} Not Serviceable</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity onPress={onManageAddresses} style={styles.noAddressBox}>
              <Text style={styles.noAddressText}>No saved addresses found. Tap to add one.</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentOption}>
            <View style={styles.radioOuter}>
              <View style={styles.radioInner} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentName}>Cash on Delivery (COD)</Text>
              <Text style={styles.paymentSub}>Pay with cash or UPI to delivery rider at door</Text>
            </View>
            <Text style={styles.codBadge}>SUPPORTED</Text>
          </View>
        </View>

        {/* Items Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items in this Order ({items.length})</Text>
          <View style={styles.itemsSummaryList}>
            {items.map(({ product, quantity }) => (
              <View key={product.id} style={styles.itemSummaryRow}>
                <Text style={styles.itemSummaryTitle} numberOfLines={1}>
                  {quantity} × {product.name}
                </Text>
                <Text style={styles.itemSummaryPrice}>
                  {formatPaiseToRupees(product.selling_price_paise * quantity)}
                </Text>
              </View>
            ))}
          </View>

          {/* Pricing Breakdown */}
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownVal}>{formatPaiseToRupees(subtotal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Delivery Partner Fee</Text>
              <Text
                style={[
                  styles.breakdownVal,
                  deliveryFee === 0 ? { color: '#16a34a', fontWeight: 'bold' } : {},
                ]}
              >
                {deliveryFee === 0 ? 'FREE' : formatPaiseToRupees(deliveryFee)}
              </Text>
            </View>
            <View style={[styles.breakdownRow, styles.totalBreakdown]}>
              <Text style={styles.totalBreakdownLabel}>Total Payable</Text>
              <Text style={styles.totalBreakdownVal}>{formatPaiseToRupees(totalPayable)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Sticky Bottom */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>TOTAL BILL</Text>
          <Text style={styles.bottomAmount}>{formatPaiseToRupees(totalPayable)}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePlaceOrder}
          disabled={isSubmitting || !isPincodeServiceable}
          style={[styles.placeOrderBtn, !isPincodeServiceable && styles.placeOrderBtnDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.placeOrderBtnText}>Place COD Order →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  errorBanner: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardAction: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '800',
  },
  addressBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  phoneBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phoneText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#334155',
    fontWeight: '700',
  },
  addressDetail: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 2,
  },
  serviceableTag: {
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignSelf: 'flex-start',
  },
  serviceableText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '800',
  },
  unserviceableTag: {
    marginTop: 8,
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignSelf: 'flex-start',
  },
  unserviceableText: {
    color: '#e11d48',
    fontSize: 10,
    fontWeight: '800',
  },
  noAddressBox: {
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    alignItems: 'center',
  },
  noAddressText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#16a34a',
    marginTop: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16a34a',
  },
  paymentName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  codBadge: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemsSummaryList: {
    marginTop: 10,
    gap: 8,
  },
  itemSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSummaryTitle: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    marginRight: 12,
  },
  itemSummaryPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  breakdown: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 4,
  },
  totalBreakdownLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalBreakdownVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803d',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '800',
  },
  bottomAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  placeOrderBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  placeOrderBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  placeOrderBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
