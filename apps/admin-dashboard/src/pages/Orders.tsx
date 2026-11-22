import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  Box,
  XCircle,
  Phone,
  MapPin,
  RefreshCw,
  Search,
  ChevronRight,
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  CreditCard,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  Order,
  OrderStatus,
  formatPaiseToRupees,
  formatIndianAddress,
  ORDER_STATUS_DETAILS,
  VALID_STATUS_TRANSITIONS,
} from '@mymart/shared';
import { getOrders, updateOrderStatus, subscribeToOrders } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';

export const Orders: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isDemoMode } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () => getOrders(activeTab),
  });

  // Check URL query param for deep linking to an order modal
  useEffect(() => {
    const orderIdParam = searchParams.get('id');
    if (orderIdParam && orders) {
      const match = orders.find((o) => o.id === orderIdParam);
      if (match) setSelectedOrder(match);
    }
  }, [searchParams, orders]);

  // Realtime subscriptions for orders (Supabase channel & Local SSE feed)
  useEffect(() => {
    const unsubscribe = subscribeToOrders(
      (_newOrder) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      },
      (updatedOrder) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        if (selectedOrder && selectedOrder.id === updatedOrder.id) {
          setSelectedOrder(updatedOrder);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient, selectedOrder]);

  // Mutation to update order status
  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      newStatus,
      reason,
    }: {
      orderId: string;
      newStatus: OrderStatus;
      reason?: string;
    }) => updateOrderStatus(orderId, newStatus, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (selectedOrder) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                order_status: variables.newStatus,
                cancel_reason: variables.reason || prev.cancel_reason,
              }
            : null
        );
      }
      setCancelModalOpen(false);
    },
  });

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    if (newStatus === 'cancelled') {
      setCancelModalOpen(true);
      return;
    }
    statusMutation.mutate({ orderId: selectedOrder.id, newStatus });
  };

  const handleConfirmCancel = () => {
    if (!selectedOrder) return;
    statusMutation.mutate({
      orderId: selectedOrder.id,
      newStatus: 'cancelled',
      reason: cancelReason,
    });
  };

  const tabs: { key: string; label: string; count?: number }[] = [
    { key: 'all', label: 'All Orders' },
    { key: 'placed', label: 'Placed (New)' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'packed', label: 'Packed' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const filteredOrders = (orders || []).filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.address_snapshot?.full_name?.toLowerCase().includes(q) ||
      o.address_snapshot?.phone?.includes(q) ||
      o.address_snapshot?.pincode?.includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Order Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Realtime order fulfillment pipeline and status transitions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-xs"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Mobile, or PIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Order #</th>
                <th className="py-3 px-5">Date & Time</th>
                <th className="py-3 px-5">Customer & Phone</th>
                <th className="py-3 px-5">Destination Area</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5">Total</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-800">
                        {order.address_snapshot?.full_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {order.address_snapshot?.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="truncate max-w-[170px] text-slate-600">
                        {order.address_snapshot?.area}, {order.address_snapshot?.pincode}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-medium">
                      {order.order_items?.length || 1} items
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-slate-900">
                      {formatPaiseToRupees(order.total_paise)}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={order.order_status} size="sm" />
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No orders found matching tab & search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-xl h-full md:h-[95vh] md:rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    {selectedOrder.order_number}
                  </h2>
                  <StatusBadge status={selectedOrder.order_status} size="md" />
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selectedOrder.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setSearchParams({});
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Order Status Action Buttons */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Workflow Actions
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedOrder.order_status === 'placed' && (
                    <button
                      onClick={() => handleStatusChange('confirmed')}
                      disabled={statusMutation.isPending}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Confirm Order
                    </button>
                  )}

                  {selectedOrder.order_status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange('packed')}
                      disabled={statusMutation.isPending}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <Box className="w-4 h-4" /> Mark Packed
                    </button>
                  )}

                  {selectedOrder.order_status === 'packed' && (
                    <button
                      onClick={() => handleStatusChange('out_for_delivery')}
                      disabled={statusMutation.isPending}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <Truck className="w-4 h-4" /> Out for Delivery
                    </button>
                  )}

                  {selectedOrder.order_status === 'out_for_delivery' && (
                    <button
                      onClick={() => handleStatusChange('delivered')}
                      disabled={statusMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Mark Delivered (Collect COD)
                    </button>
                  )}

                  {['placed', 'confirmed', 'packed'].includes(selectedOrder.order_status) && (
                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      disabled={statusMutation.isPending}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Order
                    </button>
                  )}
                </div>

                {selectedOrder.order_status === 'cancelled' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    <p className="font-bold">Order Cancelled</p>
                    <p className="text-[11px] mt-0.5">
                      Reason: {selectedOrder.cancel_reason || 'Store management cancellation'}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-bold mt-1">
                      ✓ Reserved inventory items were safely restored
                    </p>
                  </div>
                )}
              </div>

              {/* Delivery Address & Customer Snapshot */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Delivery Destination
                  </h3>
                  <a
                    href={`tel:${selectedOrder.address_snapshot?.phone}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Customer
                  </a>
                </div>

                <div className="text-xs space-y-1 text-slate-700">
                  <p className="font-bold text-slate-900 text-sm">
                    {selectedOrder.address_snapshot?.full_name}
                  </p>
                  <p className="font-mono text-slate-500">
                    Phone: {selectedOrder.address_snapshot?.phone}
                  </p>
                  <p className="text-slate-600 leading-relaxed pt-1">
                    {formatIndianAddress(selectedOrder.address_snapshot)}
                  </p>
                </div>
              </div>

              {/* Order Items Breakdown */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  Order Items ({selectedOrder.order_items?.length || 0})
                </h3>

                <div className="divide-y divide-slate-100">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.product_image_snapshot}
                          alt={item.product_name_snapshot}
                          className="w-11 h-11 rounded-xl object-cover bg-slate-50 border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs">
                            {item.product_name_snapshot}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.unit_label_snapshot} × {item.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-xs">
                          {formatPaiseToRupees(item.line_total_paise)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatPaiseToRupees(item.unit_price_paise)} / unit
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Breakdown */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800">
                      {formatPaiseToRupees(selectedOrder.subtotal_paise)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className="font-semibold text-slate-800">
                      {selectedOrder.delivery_fee_paise === 0
                        ? 'FREE'
                        : formatPaiseToRupees(selectedOrder.delivery_fee_paise)}
                    </span>
                  </div>
                  {selectedOrder.discount_paise > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatPaiseToRupees(selectedOrder.discount_paise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                    <span>Total Bill (COD)</span>
                    <span className="text-emerald-700">
                      {formatPaiseToRupees(selectedOrder.total_paise)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        title="Cancel Order & Restore Stock"
        message={`Cancelling order ${selectedOrder?.order_number} will immediately restore all product quantities to warehouse inventory.`}
        confirmText="Confirm Cancellation"
        isDestructive={true}
        isLoading={statusMutation.isPending}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
};
