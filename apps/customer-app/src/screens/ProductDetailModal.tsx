import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Product, formatPaiseToRupees, calculateDiscountPercentage } from '@mymart/shared';
import { useCartStore } from '../store/cartStore';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenCart: () => void;
}

const { width } = Dimensions.get('window');

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenCart,
}) => {
  if (!product) return null;

  const { getItemQuantity, addItem, updateQuantity, getTotalCount } = useCartStore();
  const quantity = getItemQuantity(product.id);
  const totalCartCount = getTotalCount();
  const discount = calculateDiscountPercentage(product.mrp_paise, product.selling_price_paise);
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        {/* Header with Close & Cart count */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {product.brand}
          </Text>
          <TouchableOpacity onPress={onOpenCart} style={styles.cartIconBtn}>
            <Text style={styles.cartIconText}>🛒</Text>
            {totalCartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Large Image */}
          <View style={styles.imageWrapper}>
            <Image
              source={{
                uri:
                  product.image_urls?.[0] ||
                  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
              }}
              style={styles.image}
              resizeMode="contain"
            />
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discount}% OFF</Text>
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.infoSection}>
            <View style={styles.badgeRow}>
              <View style={styles.deliveryBadge}>
                <Text style={styles.deliveryBadgeText}>⚡ 10-15 MINS DELIVERY</Text>
              </View>
              <Text style={styles.unitText}>{product.unit_label}</Text>
            </View>

            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.brandSubtitle}>By {product.brand}</Text>

            {/* Price Box */}
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.sellingPrice}>
                  {formatPaiseToRupees(product.selling_price_paise)}
                </Text>
                {product.mrp_paise > product.selling_price_paise && (
                  <Text style={styles.mrpPrice}>
                    {formatPaiseToRupees(product.mrp_paise)}
                  </Text>
                )}
                {discount > 0 && (
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>Save {discount}%</Text>
                  </View>
                )}
              </View>
              <Text style={styles.taxNotice}>(Inclusive of all taxes)</Text>
            </View>

            {/* Description */}
            <View style={styles.descSection}>
              <Text style={styles.descHeading}>Product Highlights</Text>
              <Text style={styles.descBody}>
                {product.description ||
                  'Sourced freshly and stored under temperature-controlled hygiene standards for guaranteed quality.'}
              </Text>
            </View>

            {/* Trust Badges */}
            <View style={styles.guaranteeBox}>
              <View style={styles.guaranteeItem}>
                <Text style={styles.guaranteeIcon}>🛡️</Text>
                <View>
                  <Text style={styles.guaranteeTitle}>Authentic & Fresh</Text>
                  <Text style={styles.guaranteeDesc}>100% quality guarantee from MyMart</Text>
                </View>
              </View>
              <View style={styles.guaranteeItem}>
                <Text style={styles.guaranteeIcon}>⚡</Text>
                <View>
                  <Text style={styles.guaranteeTitle}>Superfast Delivery</Text>
                  <Text style={styles.guaranteeDesc}>Delivered straight from nearest dark store</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Sticky Action Bar */}
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomPriceLabel}>Total Price</Text>
            <Text style={styles.bottomPriceValue}>
              {formatPaiseToRupees(product.selling_price_paise * (quantity > 0 ? quantity : 1))}
            </Text>
          </View>

          {isOutOfStock ? (
            <View style={styles.disabledBtn}>
              <Text style={styles.disabledBtnText}>Currently Out of Stock</Text>
            </View>
          ) : quantity === 0 ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => addItem(product)}
              style={styles.addBtn}
            >
              <Text style={styles.addBtnText}>ADD TO CART</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.bottomStepper}>
              <TouchableOpacity
                onPress={() => updateQuantity(product.id, quantity - 1)}
                style={styles.bottomStepBtn}
              >
                <Text style={styles.bottomStepText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.bottomStepCount}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => addItem(product)}
                style={styles.bottomStepBtn}
              >
                <Text style={styles.bottomStepText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '70%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  cartIconBtn: {
    padding: 6,
    position: 'relative',
  },
  cartIconText: {
    fontSize: 18,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  scroll: {
    paddingBottom: 20,
  },
  imageWrapper: {
    width: '100%',
    height: 260,
    backgroundColor: '#f8fafc',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '80%',
    height: '80%',
  },
  discountBadge: {
    position: 'absolute',
    top: 14,
    left: 16,
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  infoSection: {
    padding: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  deliveryBadgeText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '900',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 24,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 14,
  },
  priceContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sellingPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  mrpPrice: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountPillText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '900',
  },
  taxNotice: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  descSection: {
    marginBottom: 16,
  },
  descHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  descBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  guaranteeBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  guaranteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guaranteeIcon: {
    fontSize: 20,
  },
  guaranteeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  guaranteeDesc: {
    fontSize: 10,
    color: '#64748b',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  bottomPriceLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  addBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  bottomStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  bottomStepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bottomStepText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  bottomStepCount: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 10,
  },
  disabledBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  disabledBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
});
