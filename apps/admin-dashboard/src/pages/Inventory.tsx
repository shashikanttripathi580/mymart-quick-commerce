import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  RefreshCw,
  Edit3,
  Loader2,
  Package,
} from 'lucide-react';
import { Product } from '@mymart/shared';
import { getProducts, getCategories, adjustProductStock } from '../lib/api';

export const Inventory: React.FC = () => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [customStockValue, setCustomStockValue] = useState<number>(0);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const stockMutation = useMutation({
    mutationFn: ({
      productId,
      newStock,
      reason,
    }: {
      productId: string;
      newStock: number;
      reason?: string;
    }) => adjustProductStock(productId, newStock, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setEditingStockId(null);
    },
  });

  const handleQuickAdjust = (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock_quantity + delta);
    stockMutation.mutate({
      productId: product.id,
      newStock,
      reason: delta > 0 ? 'Quick Restock' : 'Stock Adjustment',
    });
  };

  const handleCustomStockSave = (productId: string) => {
    stockMutation.mutate({
      productId,
      newStock: Math.max(0, customStockValue),
      reason: 'Manual Inventory Audit',
    });
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || p.category_id === selectedCategory;

      let matchesFilter = true;
      if (filterType === 'low') {
        matchesFilter = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;
      } else if (filterType === 'out') {
        matchesFilter = p.stock_quantity === 0;
      }

      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [products, searchQuery, selectedCategory, filterType]);

  const outOfStockCount = (products || []).filter((p) => p.stock_quantity === 0).length;
  const lowStockCount = (products || []).filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Inventory & Warehouse Stock
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor real-time product quantities and execute instant stock adjustments
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-xs self-start"
          title="Refresh Inventory"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stock Health Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFilterType('all')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterType === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs uppercase font-bold tracking-wider opacity-70">
            Total Catalog SKUs
          </div>
          <div className="text-2xl font-black mt-1">{products?.length || 0}</div>
        </button>

        <button
          onClick={() => setFilterType('low')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterType === 'low'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200/80 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs uppercase font-bold tracking-wider opacity-70">
            <span>Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black mt-1 text-amber-600 group-hover:text-amber-700">
            {lowStockCount}
          </div>
        </button>

        <button
          onClick={() => setFilterType('out')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterType === 'out'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200/80 hover:bg-rose-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs uppercase font-bold tracking-wider opacity-70">
            <span>Out of Stock Items</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black mt-1 text-rose-600">
            {outOfStockCount}
          </div>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by SKU, Brand, or Product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Product & SKU</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Unit / Weight</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-center">Threshold</th>
                <th className="py-3 px-5 text-center">Current Stock</th>
                <th className="py-3 px-5 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading inventory details...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const isOut = product.stock_quantity === 0;
                  const isLow =
                    product.stock_quantity > 0 &&
                    product.stock_quantity <= product.low_stock_threshold;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition">
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900 line-clamp-1 max-w-[220px]">
                          {product.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {product.sku} • {product.brand}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-5">
                        <span className="text-slate-600">
                          {categories?.find((c) => c.id === product.category_id)?.name ||
                            'Uncategorized'}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700">
                          {product.unit_label}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-5 text-center">
                        {isOut ? (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                            Healthy
                          </span>
                        )}
                      </td>

                      {/* Threshold */}
                      <td className="py-3.5 px-5 text-center font-mono text-slate-500">
                        {product.low_stock_threshold}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-5 text-center">
                        {editingStockId === product.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={customStockValue}
                              onChange={(e) =>
                                setCustomStockValue(parseInt(e.target.value, 10) || 0)
                              }
                              className="w-16 px-2 py-1 text-xs border border-emerald-500 rounded-lg text-center font-bold focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleCustomStockSave(product.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingStockId(null)}
                              className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingStockId(product.id);
                              setCustomStockValue(product.stock_quantity);
                            }}
                            className="inline-flex items-center gap-1 cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded-lg transition"
                            title="Click to manually edit stock"
                          >
                            <span
                              className={`text-base font-black ${
                                isOut
                                  ? 'text-rose-600'
                                  : isLow
                                  ? 'text-amber-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {product.stock_quantity}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-400 opacity-60" />
                          </div>
                        )}
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickAdjust(product, -10)}
                            disabled={product.stock_quantity === 0 || stockMutation.isPending}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-40"
                            title="Reduce by 10"
                          >
                            -10
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(product, -1)}
                            disabled={product.stock_quantity === 0 || stockMutation.isPending}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40"
                            title="Reduce by 1"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(product, 1)}
                            disabled={stockMutation.isPending}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                            title="Add 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(product, 10)}
                            disabled={stockMutation.isPending}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition"
                            title="Add 10"
                          >
                            +10
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No products match the selected inventory filter.
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
