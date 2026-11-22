import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Plus,
  RefreshCw,
  IndianRupee,
  ChevronRight,
} from 'lucide-react';
import { formatPaiseToRupees, Order } from '@mymart/shared';
import { getDashboardStats, getOrders } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useAuth();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 15000, // auto poll every 15s as backup
  });

  const { data: recentOrders, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => getOrders('all'),
    refetchInterval: 15000,
  });

  // Supabase Realtime Listener for new orders
  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return;

    const channel = supabase
      .channel('admin_dashboard_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['recent-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, isDemoMode]);

  const handleRefresh = () => {
    refetchStats();
    refetchOrders();
  };

  const statCards = [
    {
      label: "Today's Sales",
      value: formatPaiseToRupees(stats?.todaySalesPaise ?? 0),
      subtext: `Total: ${formatPaiseToRupees(stats?.totalSalesPaise ?? 0)}`,
      icon: IndianRupee,
      color: 'emerald',
      bgGradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: "Today's Orders",
      value: stats?.todayOrders ?? 0,
      subtext: `${stats?.totalOrders ?? 0} total orders`,
      icon: ShoppingBag,
      color: 'blue',
      bgGradient: 'from-blue-500 to-indigo-600',
    },
    {
      label: 'Pending Orders',
      value: stats?.pendingOrders ?? 0,
      subtext: 'Action required immediately',
      icon: Clock,
      color: 'amber',
      bgGradient: 'from-amber-500 to-orange-600',
      highlight: (stats?.pendingOrders ?? 0) > 0,
    },
    {
      label: 'Completed Orders',
      value: stats?.completedOrders ?? 0,
      subtext: 'Delivered successfully',
      icon: CheckCircle,
      color: 'emerald',
      bgGradient: 'from-green-500 to-emerald-600',
    },
    {
      label: 'Total Products',
      value: stats?.totalProducts ?? 0,
      subtext: 'Active catalog items',
      icon: Package,
      color: 'violet',
      bgGradient: 'from-violet-500 to-purple-600',
    },
    {
      label: 'Low Stock Alerts',
      value: stats?.lowStockProducts ?? 0,
      subtext: `${stats?.outOfStockProducts ?? 0} completely out of stock`,
      icon: AlertTriangle,
      color: 'rose',
      bgGradient: 'from-rose-500 to-red-600',
      highlight: (stats?.lowStockProducts ?? 0) > 0 || (stats?.outOfStockProducts ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Realtime store metrics and live order stream
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-xs"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-md ${
                card.highlight
                  ? 'border-amber-300 ring-2 ring-amber-100'
                  : 'border-slate-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${card.bgGradient} text-white flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {statsLoading ? '...' : card.value}
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">
                  {card.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/orders"
          className="group p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-md shadow-blue-600/20 flex items-center justify-between transition transform hover:-translate-y-0.5"
        >
          <div>
            <h3 className="font-bold text-base">Process Orders</h3>
            <p className="text-xs text-blue-100 mt-0.5">
              {(stats?.pendingOrders ?? 0)} orders awaiting packing & dispatch
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/inventory"
          className="group p-5 bg-gradient-to-br from-amber-600 to-orange-700 rounded-2xl text-white shadow-md shadow-amber-600/20 flex items-center justify-between transition transform hover:-translate-y-0.5"
        >
          <div>
            <h3 className="font-bold text-base">Restock Inventory</h3>
            <p className="text-xs text-amber-100 mt-0.5">
              {(stats?.lowStockProducts ?? 0) + (stats?.outOfStockProducts ?? 0)} items below threshold
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/offers"
          className="group p-5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl text-white shadow-md shadow-emerald-600/20 flex items-center justify-between transition transform hover:-translate-y-0.5"
        >
          <div>
            <h3 className="font-bold text-base">Promotions & Banners</h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              Update discounts, hero offers and featured tags
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Customer Orders</h2>
            <p className="text-xs text-slate-500">Live order activity across the store</p>
          </div>
          <Link
            to="/orders"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All Orders <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Order #</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Area / City</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5">Total</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ordersLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading recent orders...
                  </td>
                </tr>
              ) : recentOrders && recentOrders.length > 0 ? (
                recentOrders.slice(0, 6).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {order.order_number}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-slate-800">
                        {order.address_snapshot?.full_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {order.address_snapshot?.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="truncate max-w-[160px]">
                        {order.address_snapshot?.area}, {order.address_snapshot?.city}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-medium">
                      {order.order_items?.length || 1} items
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {formatPaiseToRupees(order.total_paise)}
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={order.order_status} size="sm" />
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        to={`/orders?id=${order.id}`}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No orders placed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
