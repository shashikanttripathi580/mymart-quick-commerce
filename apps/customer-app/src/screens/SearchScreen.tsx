import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Product } from '@mymart/shared';
import { getActiveProducts } from '../lib/api';
import { ProductCard } from '../components/ProductCard';

interface SearchScreenProps {
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onClose, onSelectProduct }) => {
  const [query, setQuery] = useState('');

  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['active-products'],
    queryFn: () => getActiveProducts(),
  });

  const searchResults = useMemo(() => {
    if (!query.trim() || !allProducts) return [];
    const q = query.toLowerCase().trim();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }, [allProducts, query]);

  const trendingSearches = [
    'Milk',
    'Butter',
    'Shimla Apples',
    'Lays Magic Masala',
    'Coca-Cola',
    'Atta',
    'Paneer',
  ];

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.inputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search grocery, fruits, drinks..."
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Results or Trending */}
      {query.trim().length === 0 ? (
        <View style={styles.trendingContainer}>
          <Text style={styles.trendingHeading}>Trending Searches</Text>
          <View style={styles.trendingChipsWrapper}>
            {trendingSearches.map((term) => (
              <TouchableOpacity
                key={term}
                onPress={() => setQuery(term)}
                style={styles.trendingChip}
              >
                <Text style={styles.trendingChipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : searchResults.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsScroll}
        >
          <Text style={styles.resultsCount}>
            Showing {searchResults.length} results for &quot;{query}&quot;
          </Text>
          <View style={styles.productGrid}>
            {searchResults.map((prod) => (
              <View key={prod.id} style={styles.gridItem}>
                <ProductCard
                  product={prod}
                  onPress={() => onSelectProduct(prod)}
                  width="100%"
                />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No matching products found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching for &quot;milk&quot;, &quot;apples&quot;, or &quot;bread&quot;
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  cancelBtn: {
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: '#16a34a',
    fontWeight: '800',
    fontSize: 14,
  },
  trendingContainer: {
    padding: 20,
  },
  trendingHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  trendingChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  trendingChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  resultsScroll: {
    padding: 12,
    paddingBottom: 40,
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
