import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Package,
  Star,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Product, Category, formatPaiseToRupees, calculateDiscountPercentage } from '@mymart/shared';
import { getProducts, getCategories, deleteProduct, updateProduct } from '../lib/api';
import { ConfirmModal } from '../components/ConfirmModal';

export const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data: products, isLoading: productsLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateProduct(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ id, is_featured }: { id: string; is_featured: boolean }) =>
      updateProduct(id, { is_featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
  });

  // Filtered and searched list
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((prod) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.sku.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchesCategory =
        selectedCategory === 'all' || prod.category_id === selectedCategory;

      // Stock
      let matchesStock = true;
      if (stockFilter === 'in_stock') {
        matchesStock = prod.stock_quantity > prod.low_stock_threshold;
      } else if (stockFilter === 'low_stock') {
        matchesStock = prod.stock_quantity > 0 && prod.stock_quantity <= prod.low_stock_threshold;
      } else if (stockFilter === 'out_of_stock') {
        matchesStock = prod.stock_quantity === 0;
      }

      // Active
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = prod.is_active;
      if (statusFilter === 'inactive') matchesStatus = !prod.is_active;

      return matchesSearch && matchesCategory && matchesStock && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, stockFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Product Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage groceries, prices in paise, stock levels, and media
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, brand, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
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

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Stock Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (≤ threshold)</option>
            <option value="out_of_stock">Out of Stock (= 0)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Visibility</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU / Brand</th>
                <th className="py-3 px-4">Unit / Weight</th>
                <th className="py-3 px-4">Selling Price & MRP</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4 text-center">Featured</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {productsLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading products catalog...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const discount = calculateDiscountPercentage(
                    product.mrp_paise,
                    product.selling_price_paise
                  );
                  const isLow =
                    product.stock_quantity > 0 &&
                    product.stock_quantity <= product.low_stock_threshold;
                  const isOut = product.stock_quantity === 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/60 transition">
                      {/* Product Image & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {product.image_urls?.[0] ? (
                              <img
                                src={product.image_urls[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-1 max-w-[200px]">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {categories?.find((c) => c.id === product.category_id)?.name ||
                                'Uncategorized'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU & Brand */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{product.brand}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{product.sku}</div>
                      </td>

                      {/* Unit / Weight */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700">
                          {product.unit_label}
                        </span>
                      </td>

                      {/* Price & MRP */}
                      <td className="py-3 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {formatPaiseToRupees(product.selling_price_paise)}
                          </span>
                          {product.mrp_paise > product.selling_price_paise && (
                            <span className="text-[11px] text-slate-400 line-through">
                              {formatPaiseToRupees(product.mrp_paise)}
                            </span>
                          )}
                        </div>
                        {discount > 0 && (
                          <div className="text-[10px] font-bold text-emerald-600">
                            {discount}% OFF
                          </div>
                        )}
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span
                            className={
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }
                          >
                            {product.stock_quantity}
                          </span>
                          {isOut ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md font-bold">
                              Out
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md font-bold">
                              Low
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Min: {product.low_stock_threshold}
                        </div>
                      </td>

                      {/* Featured Star Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            toggleFeaturedMutation.mutate({
                              id: product.id,
                              is_featured: !product.is_featured,
                            })
                          }
                          className={`p-1.5 rounded-lg transition ${
                            product.is_featured
                              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                          }`}
                          title="Toggle Featured"
                        >
                          <Star
                            className="w-4 h-4"
                            fill={product.is_featured ? 'currentColor' : 'none'}
                          />
                        </button>
                      </td>

                      {/* Active Status Switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: product.id,
                              is_active: !product.is_active,
                            })
                          }
                          className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            product.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              product.is_active ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
