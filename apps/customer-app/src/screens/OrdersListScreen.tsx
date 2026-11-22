import React from 'react';
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
import { Order, formatPaiseToRupees, ORDER_STATUS_DETAILS } from '@mymart/shared';
import { getCustomerOrders } from '../lib/api';
import { useCartStore } from '../store/cartStore';

interface OrdersListScreenProps {
  onTrackOrder: (orderId: string) => void;
  onExploreProducts: () => void;
}

export const OrdersListScreen: React.FC<OrdersListScreenProps> = ({
  onTrackOrder,
  onExploreProducts,
}) => {
  const { addItem } = useCartStore();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: getCustomerOrders,
  });

  const handleReorder = (order: Order) => {
    order.order_items?.forEach((item) => {
      // Create minimal product representation for reorder
      addItem({
        id: item.product_id,
        name: item.product_name_snapshot,
        slug: '',
        sku: '',
        brand: '',
        category_id: '',
        unit_label: item.unit_label_snapshot,
        description: null,
        selling_price_paise: item.unit_price_paise,
        mrp_paise: item.unit_price_paise,
        stock_quantity: 99,
        low_stock_threshold: 5,
        image_urls: [item.product_image_snapshot],
        is_active: true,
        is_featured: false,
        created_at: '',
        updated_at: '',
      });
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
        ) : orders && orders.length > 0 ? (
          orders.map((order) => {
            const statusInfo = ORDER_STATUS_DETAILS[order.order_status];

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Items previews */}
                <View style={styles.thumbnailsRow}>
                  {order.order_items?.slice(0, 4).map((item) => (
                    <Image
                      key={item.id}
                      source={{ uri: item.product_image_snapshot }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ))}
                  {(order.order_items?.length || 0) > 4 && (
                    <View style={styles.moreThumbnails}>
                      <Text style={styles.moreText}>
                        +{(order.order_items?.length || 0) - 4}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.orderCardFooter}>
                  <View>
                    <Text style={styles.totalLabel}>Total (COD)</Text>
                    <Text style={styles.totalValue}>{formatPaiseToRupees(order.total_paise)}</Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => handleReorder(order)}
                      style={styles.reorderBtn}
                    >
                      <Text style={styles.reorderBtnText}>Reorder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => onTrackOrder(order.id)}
                      style={styles.trackBtn}
                    >
                      <Text style={styles.trackBtnText}>Track Order →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Orders Placed Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your orders will show up here as soon as you place your first quick delivery order.
            </Text>
            <TouchableOpacity onPress={onExploreProducts} style={styles.browseBtn}>
              <Text style={styles.browseBtnText}>Browse Groceries</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
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
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moreThumbnails: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reorderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  reorderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  trackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  browseBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
