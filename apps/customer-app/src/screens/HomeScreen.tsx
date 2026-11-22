import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Product, Category, Promotion, formatPaiseToRupees } from '@mymart/shared';
import {
  getActiveCategories,
  getActiveProducts,
  getActivePromotions,
  getStoreSettings,
} from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { CategoryPill } from '../components/CategoryPill';
import { BannerCarousel } from '../components/BannerCarousel';
import { useCartStore } from '../store/cartStore';

interface HomeScreenProps {
  onSelectProduct: (product: Product) => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onSelectCategory: (category: Category) => void;
  onOpenAddressSelector: () => void;
  selectedAddressText: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectProduct,
  onOpenSearch,
  onOpenCart,
  onSelectCategory,
  onOpenAddressSelector,
  selectedAddressText,
}) => {
  const { getTotalCount, getSubtotalPaise } = useCartStore();
  const totalCount = getTotalCount();
  const subtotal = getSubtotalPaise();

  const { data: storeSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  });

  const { data: categories, isLoading: loadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ['active-categories'],
    queryFn: getActiveCategories,
  });

  const { data: promotions, refetch: refetchPromos } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: getActivePromotions,
  });

  const { data: products, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['active-products'],
    queryFn: () => getActiveProducts(),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSettings(), refetchCategories(), refetchPromos(), refetchProducts()]);
    setRefreshing(false);
  };

  const featuredProducts = (products || []).filter((p) => p.is_featured);
  const bestSellers = (products || []).slice(0, 6);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onOpenAddressSelector}
          activeOpacity={0.8}
          style={styles.addressWrapper}
        >
          <View style={styles.deliveryBadge}>
            <Text style={styles.deliveryBadgeText}>⚡ 10-15 MINS</Text>
          </View>
          <View style={styles.addressRow}>
            <Text style={styles.addressText} numberOfLines={1}>
              {selectedAddressText || 'Delivering to Bengaluru - 560038'}
            </Text>
            <Text style={styles.addressArrow}>▼</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar (Tapping opens search screen) */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onOpenSearch}
          style={styles.searchBar}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>
            Search &quot;fresh milk&quot;, &quot;apples&quot;, &quot;chips&quot;...
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Store Closed Banner if applicable */}
        {storeSettings && !storeSettings.is_store_open && (
          <View style={styles.storeClosedBanner}>
            <Text style={styles.storeClosedTitle}>Store Temporarily Closed</Text>
            <Text style={styles.storeClosedText}>
              We are currently not accepting new delivery orders. Browsing is available.
            </Text>
          </View>
        )}

        {/* Promotional Banner Carousel */}
        {promotions && promotions.length > 0 && (
          <BannerCarousel promotions={promotions} />
        )}

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Categories</Text>
        </View>
        {loadingCategories ? (
          <ActivityIndicator color="#16a34a" style={{ marginVertical: 12 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories?.map((cat) => (
              <CategoryPill
                key={cat.id}
                category={cat}
                onPress={() => onSelectCategory(cat)}
              />
            ))}
          </ScrollView>
        )}

        {/* Curated Featured Products */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Spotlight & Featured</Text>
                <Text style={styles.sectionSubtitle}>Handpicked fresh groceries</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsHorizontalScroll}
            >
              {featuredProducts.map((prod) => (
                <View key={prod.id} style={{ marginRight: 12 }}>
                  <ProductCard
                    product={prod}
                    onPress={() => onSelectProduct(prod)}
                    width={150}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Best Sellers Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Popular & Best Sellers</Text>
              <Text style={styles.sectionSubtitle}>Most ordered in your area</Text>
            </View>
          </View>

          {loadingProducts ? (
            <ActivityIndicator color="#16a34a" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.productGrid}>
              {bestSellers.map((prod) => (
                <View key={prod.id} style={styles.gridItem}>
                  <ProductCard
                    product={prod}
                    onPress={() => onSelectProduct(prod)}
                    width="100%"
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Cart Bar */}
      {totalCount > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onOpenCart}
            style={styles.floatingCartBar}
          >
            <View>
              <Text style={styles.cartCountText}>
                {totalCount} {totalCount === 1 ? 'ITEM' : 'ITEMS'}
              </Text>
              <Text style={styles.cartTotalText}>{formatPaiseToRupees(subtotal)}</Text>
            </View>

            <View style={styles.cartActionWrapper}>
              <Text style={styles.cartActionText}>View Cart</Text>
              <Text style={styles.cartArrowText}>→</Text>
            </View>
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
    paddingBottom: 6,
    backgroundColor: '#ffffff',
  },
  addressWrapper: {
    alignSelf: 'flex-start',
  },
  deliveryBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  deliveryBadgeText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    maxWidth: 260,
  },
  addressArrow: {
    fontSize: 10,
    color: '#64748b',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchPlaceholder: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  storeClosedBanner: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  storeClosedTitle: {
    color: '#e11d48',
    fontWeight: '900',
    fontSize: 13,
  },
  storeClosedText: {
    color: '#9f1239',
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  productsHorizontalScroll: {
    paddingHorizontal: 16,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 4,
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
    letterSpacing: 0.5,
  },
  cartTotalText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  cartActionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  cartArrowText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
