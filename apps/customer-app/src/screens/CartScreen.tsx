import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatPaiseToRupees } from '@mymart/shared';
import { useCartStore } from '../store/cartStore';
import { getStoreSettings } from '../lib/api';

interface CartScreenProps {
  onProceedToCheckout: () => void;
  onExploreProducts: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  onProceedToCheckout,
  onExploreProducts,
}) => {
  const { items, updateQuantity, removeItem, clearCart, getSubtotalPaise, revalidateCart } =
    useCartStore();
  const subtotal = getSubtotalPaise();

  const [isRevalidating, setIsRevalidating] = useState(false);
  const [validationAlerts, setValidationAlerts] = useState<string[]>([]);

  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  });

  const freeDeliveryThreshold = storeSettings?.free_delivery_threshold_paise ?? 24900;
  const standardDeliveryFee = storeSettings?.delivery_fee_paise ?? 2500;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : standardDeliveryFee;
  const totalPayable = subtotal + deliveryFee;

  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(1, subtotal / freeDeliveryThreshold);

  const handleCheckoutPress = async () => {
    setIsRevalidating(true);
    setValidationAlerts([]);

    try {
      const res = await revalidateCart();
      if (!res.isValid && res.changes.length > 0) {
        setValidationAlerts(res.changes);
        setIsRevalidating(false);
        return; // Prompt user of price/stock change before proceeding
      }
      onProceedToCheckout();
    } catch (e) {
      console.warn('Revalidation error:', e);
      onProceedToCheckout();
    } finally {
      setIsRevalidating(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptySubtitle}>
          You haven&apos;t added any groceries to your cart yet. Explore our fresh catalog!
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onExploreProducts}
          style={styles.exploreBtn}
        >
          <Text style={styles.exploreBtnText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart ({items.length})</Text>
        <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear Cart</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Revalidation alerts if any */}
        {validationAlerts.length > 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertHeading}>⚠️ Cart Updated to Match Store Inventory</Text>
            {validationAlerts.map((msg, i) => (
              <Text key={i} style={styles.alertMsg}>
                • {msg}
              </Text>
            ))}
          </View>
        )}

        {/* Free Delivery Progress Bar */}
        <View style={styles.deliveryProgressCard}>
          <View style={styles.deliveryProgressHeader}>
            <Text style={styles.deliveryProgressTitle}>
              {isFreeDelivery ? '🎉 Congratulations! You unlocked FREE Delivery' : `Add ${formatPaiseToRupees(amountNeededForFreeDelivery)} more for FREE Delivery`}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(freeDeliveryProgress * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Itemized Cart List */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsCardTitle}>Selected Groceries</Text>
          <View style={styles.itemsList}>
            {items.map(({ product, quantity }) => (
              <View key={product.id} style={styles.itemRow}>
                <Image
                  source={{
                    uri:
                      product.image_urls?.[0] ||
                      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
                  }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.itemUnit}>{product.unit_label}</Text>
                  <Text style={styles.itemPrice}>
                    {formatPaiseToRupees(product.selling_price_paise)}
                  </Text>
                </View>

                {/* Stepper */}
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => updateQuantity(product.id, quantity - 1)}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepCount}>{quantity}</Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(product.id, quantity + 1)}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bill Summary */}
        <View style={styles.billCard}>
          <Text style={styles.billCardTitle}>Bill Summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>{formatPaiseToRupees(subtotal)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Partner Fee</Text>
            <Text
              style={[
                styles.billValue,
                isFreeDelivery ? { color: '#16a34a', fontWeight: 'bold' } : {},
              ]}
            >
              {isFreeDelivery ? 'FREE' : formatPaiseToRupees(deliveryFee)}
            </Text>
          </View>

          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>To Pay (COD)</Text>
            <Text style={styles.totalValue}>{formatPaiseToRupees(totalPayable)}</Text>
          </View>
        </View>

        {/* Cancellation policy card */}
        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>⚡ Quick Commerce Delivery Promise</Text>
          <Text style={styles.policyBody}>
            Sanitized packaging, contactless doorstep delivery within 10-15 minutes. Cash on Delivery supported.
          </Text>
        </View>
      </ScrollView>

      {/* Checkout Action Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>TOTAL PAYABLE</Text>
          <Text style={styles.bottomAmount}>{formatPaiseToRupees(totalPayable)}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleCheckoutPress}
          disabled={isRevalidating}
          style={styles.checkoutBtn}
        >
          {isRevalidating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.checkoutBtnText}>Select Address & Pay →</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#e11d48',
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  alertBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  alertHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: '#b45309',
    marginBottom: 4,
  },
  alertMsg: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
  },
  deliveryProgressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deliveryProgressHeader: {
    marginBottom: 8,
  },
  deliveryProgressTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16a34a',
  },
  itemsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemsCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  itemsList: {
    gap: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 16,
  },
  itemUnit: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stepText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  stepCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  billCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803d',
  },
  policyCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 12,
  },
  policyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 2,
  },
  policyBody: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
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
  checkoutBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
