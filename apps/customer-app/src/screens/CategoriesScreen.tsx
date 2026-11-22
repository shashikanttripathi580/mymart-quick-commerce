import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Category, Product, formatPaiseToRupees } from '@mymart/shared';
import { getActiveCategories, getActiveProducts } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { useCartStore } from '../store/cartStore';

interface CategoriesScreenProps {
  initialCategoryId?: string;
  onSelectProduct: (product: Product) => void;
  onOpenCart: () => void;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  initialCategoryId,
  onSelectProduct,
  onOpenCart,
}) => {
  const { getTotalCount, getSubtotalPaise } = useCartStore();
  const totalCount = getTotalCount();
  const subtotal = getSubtotalPaise();

  const [selectedCatId, setSelectedCatId] = useState<string | null>(initialCategoryId || null);
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'discount'>('featured');

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['active-categories'],
    queryFn: getActiveCategories,
  });

  // Set default category once loaded if none set
  React.useEffect(() => {
    if (!selectedCatId && categories && categories.length > 0) {
      setSelectedCatId(categories[0].id);
    }
  }, [categories, selectedCatId]);

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['active-products', selectedCatId],
    queryFn: () => (selectedCatId ? getActiveProducts(selectedCatId) : getActiveProducts()),
    enabled: Boolean(selectedCatId),
  });

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    const list = [...products];
    if (sortBy === 'price_low') {
      list.sort((a, b) => a.selling_price_paise - b.selling_price_paise);
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => b.selling_price_paise - a.selling_price_paise);
    } else if (sortBy === 'discount') {
      list.sort((a, b) => {
        const discA = (a.mrp_paise - a.selling_price_paise) / a.mrp_paise;
        const discB = (b.mrp_paise - b.selling_price_paise) / b.mrp_paise;
        return discB - discA;
      });
    }
    return list;
  }, [products, sortBy]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Categories</Text>
      </View>

      <View style={styles.body}>
        {/* Left Category Rail */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {loadingCategories ? (
              <ActivityIndicator color="#16a34a" style={{ marginTop: 20 }} />
            ) : (
              categories?.map((cat) => {
                const isSelected = cat.id === selectedCatId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCatId(cat.id)}
                    activeOpacity={0.8}
                    style={[styles.sidebarItem, isSelected && styles.sidebarItemSelected]}
                  >
                    <View style={styles.sidebarIconWrapper}>
                      <Image
                        source={{ uri: cat.image_url }}
                        style={styles.sidebarIcon}
                        resizeMode="cover"
                      />
                    </View>
                    <Text
                      style={[styles.sidebarText, isSelected && styles.sidebarTextSelected]}
                      numberOfLines={2}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Right Product Grid */}
        <View style={styles.mainContent}>
          {/* Sort Filter Chips */}
          <View style={styles.sortBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: 'featured', label: 'Popular' },
                { key: 'price_low', label: 'Price: Low to High' },
                { key: 'price_high', label: 'Price: High to Low' },
                { key: 'discount', label: 'Big Discounts' },
              ].map((s) => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setSortBy(s.key as any)}
                  style={[styles.sortChip, sortBy === s.key && styles.sortChipSelected]}
                >
                  <Text
                    style={[styles.sortChipText, sortBy === s.key && styles.sortChipTextSelected]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Products List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productsScroll}
          >
            {loadingProducts ? (
              <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
            ) : sortedProducts.length > 0 ? (
              <View style={styles.productGrid}>
                {sortedProducts.map((p) => (
                  <View key={p.id} style={styles.gridItem}>
                    <ProductCard
                      product={p}
                      onPress={() => onSelectProduct(p)}
                      width="100%"
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No products found in this category.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Floating Cart Bar */}
      {totalCount > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onOpenCart}
            style={styles.floatingCartBar}
          >
            <View>
              <Text style={styles.cartCountText}>{totalCount} ITEMS</Text>
              <Text style={styles.cartTotalText}>{formatPaiseToRupees(subtotal)}</Text>
            </View>
            <Text style={styles.cartActionText}>View Cart →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 84,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  sidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sidebarItemSelected: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
  },
  sidebarIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  sidebarIcon: {
    width: '100%',
    height: '100%',
  },
  sidebarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  sidebarTextSelected: {
    color: '#16a34a',
    fontWeight: '900',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  sortBar: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  sortChipSelected: {
    backgroundColor: '#16a34a',
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  sortChipTextSelected: {
    color: '#ffffff',
  },
  productsScroll: {
    paddingBottom: 90,
    paddingTop: 8,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 4,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  floatingCartBar: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  cartCountText: {
    color: '#dcfce7',
    fontSize: 10,
    fontWeight: '800',
  },
  cartTotalText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  cartActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
