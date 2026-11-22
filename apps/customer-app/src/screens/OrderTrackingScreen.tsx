import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_DETAILS,
  ORDER_STATUS_PROGRESS,
  formatPaiseToRupees,
  formatIndianAddress,
} from '@mymart/shared';
import { getOrderById } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface OrderTrackingScreenProps {
  orderId: string;
  onBackToHome: () => void;
}

export const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({
  orderId,
  onBackToHome,
}) => {
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-details', orderId],
    queryFn: () => getOrderById(orderId),
    refetchInterval: 5000, // Backup poll every 5s
  });

  // Supabase Realtime Listener for instant updates
  useEffect(() => {
    if (!isSupabaseConfigured || !orderId) return;

    const channel = supabase
      .channel(`order_track_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  if (isLoading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#16a34a" size="large" />
        <Text style={styles.loadingText}>Fetching order live tracking...</Text>
      </View>
    );
  }

  const currentStatus = order.order_status;
  const statusInfo = ORDER_STATUS_DETAILS[currentStatus];
  const isCancelled = currentStatus === 'cancelled';
  const currentStepIndex = ORDER_STATUS_PROGRESS.indexOf(currentStatus);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackToHome} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Order Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Order Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor },
          ]}
        >
          <View style={styles.statusBannerHeader}>
            <Text style={[styles.statusBannerTitle, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
            <View style={styles.livePulseWrapper}>
              <View style={[styles.livePulseDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.livePulseText, { color: statusInfo.color }]}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.statusBannerDesc}>{statusInfo.description}</Text>

          {!isCancelled && currentStatus !== 'delivered' && (
            <View style={styles.etaBox}>
              <Text style={styles.etaTitle}>Estimated Arrival: 8 - 12 Minutes</Text>
              <Text style={styles.etaSubtitle}>
                Dark store manager is preparing your items in sanitized bags
              </Text>
            </View>
          )}
        </View>

        {/* Stepper Timeline */}
        {!isCancelled && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fulfillment Timeline</Text>
            <View style={styles.timelineContainer}>
              {ORDER_STATUS_PROGRESS.map((stepStatus, index) => {
                const stepDetails = ORDER_STATUS_DETAILS[stepStatus];
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <View key={stepStatus} style={styles.timelineStep}>
                    {/* Circle icon */}
                    <View
                      style={[
                        styles.timelineCircle,
                        isCompleted && styles.timelineCircleCompleted,
                        isCurrent && styles.timelineCircleCurrent,
                      ]}
                    >
                      <Text style={styles.timelineCircleText}>
                        {isCompleted ? '✓' : index + 1}
                      </Text>
                    </View>

                    {/* Step label */}
                    <View style={styles.timelineContent}>
                      <Text
                        style={[
                          styles.timelineStepLabel,
                          isCompleted && styles.timelineStepLabelCompleted,
                          isCurrent && styles.timelineStepLabelCurrent,
                        ]}
                      >
                        {stepDetails.label}
                      </Text>
                      {isCurrent && (
                        <Text style={styles.timelineCurrentDesc}>
                          {stepDetails.description}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Delivery Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <Text style={styles.recipientName}>{order.address_snapshot?.full_name}</Text>
          <Text style={styles.recipientPhone}>Phone: {order.address_snapshot?.phone}</Text>
          <Text style={styles.recipientAddress}>
            {formatIndianAddress(order.address_snapshot)}
          </Text>
        </View>

        {/* Order Details & Items Card */}
        <View style={styles.card}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.cardTitle}>Order #{order.order_number}</Text>
            <Text style={styles.paymentMethodBadge}>CASH ON DELIVERY</Text>
          </View>

          <View style={styles.itemsList}>
            {order.order_items?.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Image
                  source={{ uri: item.product_image_snapshot }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.product_name_snapshot}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.unit_label_snapshot} × {item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  {formatPaiseToRupees(item.line_total_paise)}
                </Text>
              </View>
            ))}
          </View>

          {/* Pricing summary */}
          <View style={styles.billBox}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billVal}>{formatPaiseToRupees(order.subtotal_paise)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Charge</Text>
              <Text style={styles.billVal}>
                {order.delivery_fee_paise === 0
                  ? 'FREE'
                  : formatPaiseToRupees(order.delivery_fee_paise)}
              </Text>
            </View>
            <View style={[styles.billRow, styles.totalBillRow]}>
              <Text style={styles.totalBillLabel}>Total Amount (COD)</Text>
              <Text style={styles.totalBillVal}>{formatPaiseToRupees(order.total_paise)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Back Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={onBackToHome} style={styles.homeBtn}>
          <Text style={styles.homeBtnText}>Continue Shopping</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
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
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  scroll: {
    padding: 16,
    paddingBottom: 90,
  },
  statusBanner: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  statusBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBannerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  livePulseWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  livePulseText: {
    fontSize: 10,
    fontWeight: '900',
  },
  statusBannerDesc: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  etaBox: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    padding: 10,
  },
  etaTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  etaSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  timelineContainer: {
    gap: 16,
    marginTop: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  timelineCircleCompleted: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  timelineCircleCurrent: {
    backgroundColor: '#2563eb',
    borderColor: '#bfdbfe',
    transform: [{ scale: 1.1 }],
  },
  timelineCircleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },
  timelineContent: {
    flex: 1,
  },
  timelineStepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  timelineStepLabelCompleted: {
    color: '#0f172a',
    fontWeight: '800',
  },
  timelineStepLabelCurrent: {
    color: '#2563eb',
    fontWeight: '900',
  },
  timelineCurrentDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  recipientPhone: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#64748b',
    marginTop: 2,
  },
  recipientAddress: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 4,
  },
  orderNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentMethodBadge: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemMeta: {
    fontSize: 10,
    color: '#94a3b8',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  billBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  billVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalBillRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
    marginTop: 4,
  },
  totalBillLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalBillVal: {
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
    paddingVertical: 12,
  },
  homeBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  homeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
