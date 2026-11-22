import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Product, formatPaiseToRupees, calculateDiscountPercentage } from '@mymart/shared';
import { useCartStore } from '../store/cartStore';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  width?: number | string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  width = 160,
}) => {
  const { getItemQuantity, addItem, updateQuantity } = useCartStore();
  const quantity = getItemQuantity(product.id);
  const discount = calculateDiscountPercentage(product.mrp_paise, product.selling_price_paise);
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { width: width as any }]}
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              product.image_urls?.[0] ||
              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
          }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Discount Badge */}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        {/* Delivery Time Pill */}
        <View style={styles.deliveryBadge}>
          <Text style={styles.deliveryText}>⚡ 10 MINS</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Brand & Unit */}
        <View style={styles.metaRow}>
          <Text style={styles.brandText} numberOfLines={1}>
            {product.brand}
          </Text>
          <Text style={styles.unitText}>{product.unit_label}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price & Action Row */}
        <View style={styles.priceRow}>
          <View style={styles.priceWrapper}>
            <Text style={styles.sellingPrice}>
              {formatPaiseToRupees(product.selling_price_paise)}
            </Text>
            {product.mrp_paise > product.selling_price_paise && (
              <Text style={styles.mrpPrice}>
                {formatPaiseToRupees(product.mrp_paise)}
              </Text>
            )}
          </View>

          {/* Add / Stepper Button */}
          {isOutOfStock ? (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>OUT</Text>
            </View>
          ) : quantity === 0 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => addItem(product)}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={() => updateQuantity(product.id, quantity - 1)}
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperCount}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => addItem(product)}
                style={styles.stepperBtn}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  deliveryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryText: {
    color: '#0f172a',
    fontSize: 9,
    fontWeight: '800',
  },
  content: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  unitText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 16,
    marginBottom: 8,
    minHeight: 32,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceWrapper: {
    flex: 1,
  },
  sellingPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  mrpPrice: {
    fontSize: 10,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  addButton: {
    backgroundColor: '#ffffff',
    borderColor: '#16a34a',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '900',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  stepperBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stepperBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  stepperCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  outOfStockBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outOfStockText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
});
