import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Package,
} from 'lucide-react';
import {
  rupeesToPaise,
  paiseToRupeesNumber,
  calculateDiscountPercentage,
  slugify,
  Product,
} from '@mymart/shared';
import { getProductById, getCategories, createProduct, updateProduct } from '../lib/api';
import { ImageUploader } from '../components/ImageUploader';

export const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitLabel, setUnitLabel] = useState('1 unit');
  const [description, setDescription] = useState('');
  const [sellingPriceRupees, setSellingPriceRupees] = useState<number | ''>('');
  const [mrpRupees, setMrpRupees] = useState<number | ''>('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>(50);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(10);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: existingProduct, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => (id ? getProductById(id) : null),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name);
      setSlug(existingProduct.slug);
      setSku(existingProduct.sku);
      setBrand(existingProduct.brand);
      setCategoryId(existingProduct.category_id);
      setUnitLabel(existingProduct.unit_label);
      setDescription(existingProduct.description || '');
      setSellingPriceRupees(paiseToRupeesNumber(existingProduct.selling_price_paise));
      setMrpRupees(paiseToRupeesNumber(existingProduct.mrp_paise));
      setStockQuantity(existingProduct.stock_quantity);
      setLowStockThreshold(existingProduct.low_stock_threshold);
      setImageUrl(existingProduct.image_urls?.[0] || '');
      setIsActive(existingProduct.is_active);
      setIsFeatured(existingProduct.is_featured);
    }
  }, [existingProduct]);

  // Auto-generate slug and SKU when typing name and brand in new mode
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isEditing) {
      setSlug(slugify(val));
    }
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBrand(val);
    if (!isEditing && !sku && val) {
      const brandCode = val.substring(0, 3).toUpperCase();
      const randomNum = Math.floor(100 + Math.random() * 900);
      setSku(`${brandCode}-${randomNum}`);
    }
  };

  const calculatedDiscount =
    typeof mrpRupees === 'number' && typeof sellingPriceRupees === 'number'
      ? calculateDiscountPercentage(rupeesToPaise(mrpRupees), rupeesToPaise(sellingPriceRupees))
      : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);

      // Validation
      if (!name.trim()) throw new Error('Product name is required');
      if (!brand.trim()) throw new Error('Brand name is required');
      if (!sku.trim()) throw new Error('SKU code is required');
      if (!categoryId) throw new Error('Please select a category');
      if (!unitLabel.trim()) throw new Error('Unit label (e.g. 500 g, 1 kg) is required');

      const sellingPaise = rupeesToPaise(sellingPriceRupees);
      const mrpPaise = rupeesToPaise(mrpRupees);

      if (sellingPaise <= 0) throw new Error('Selling price must be greater than zero');
      if (mrpPaise < sellingPaise) {
        throw new Error('MRP cannot be less than selling price');
      }

      const productPayload: Partial<Product> = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        sku: sku.trim().toUpperCase(),
        brand: brand.trim(),
        category_id: categoryId,
        unit_label: unitLabel.trim(),
        description: description.trim() || null,
        selling_price_paise: sellingPaise,
        mrp_paise: mrpPaise,
        stock_quantity: Number(stockQuantity) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        image_urls: imageUrl ? [imageUrl] : [],
        is_active: isActive,
        is_featured: isFeatured,
      };

      if (isEditing && id) {
        return updateProduct(id, productPayload);
      } else {
        return createProduct(productPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate('/products');
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to save product');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isEditing && loadingProduct) {
    return (
      <div className="py-16 text-center text-slate-400 flex flex-col items-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm font-semibold">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-xs text-slate-500">
              {isEditing ? `Modifying ${name || 'item'}` : 'Add a new grocery item to catalog'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
        </button>
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Basic Product Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Shimla Fresh Apples (Royal Delicious)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={handleBrandChange}
                placeholder="e.g. FarmFresh, Amul, Lays"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select a Category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unit / Weight Specification <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="e.g. 500 g, 1 kg, 1 L Tetrapack, Pack of 4"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                SKU (Stock Keeping Unit) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. FV-APP-001"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                URL Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="shimla-fresh-apples"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fresh, crisp, organic apples sourced directly from Himachal orchards..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Pricing & Inventory (Stored in integer Paise)
            </span>
            {calculatedDiscount > 0 && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                {calculatedDiscount}% Customer Discount
              </span>
            )}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Selling Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={sellingPriceRupees}
                onChange={(e) =>
                  setSellingPriceRupees(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="149.00"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Stored as: {rupeesToPaise(sellingPriceRupees)} paise
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                MRP (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={mrpRupees}
                onChange={(e) =>
                  setMrpRupees(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="189.00"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Stored as: {rupeesToPaise(mrpRupees)} paise
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Available Stock <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) =>
                  setStockQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                placeholder="50"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Current inventory units
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) =>
                  setLowStockThreshold(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                placeholder="10"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Warn when stock ≤ this
              </span>
            </div>
          </div>
        </div>

        {/* Product Media Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
            Product Image (Cloudflare R2 Storage)
          </h2>

          <ImageUploader
            value={imageUrl}
            onChange={(url) => setImageUrl(url)}
            label="Main Product Photograph"
            helperText="Direct S3 presigned upload to Cloudflare R2 bucket. Max 5MB."
          />
        </div>

        {/* Visibility & Badges Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
            Visibility & Badges
          </h2>

          <div className="flex flex-col sm:flex-row gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Active (Visible in Customer App)
                </span>
                <span className="text-[11px] text-slate-500">
                  Uncheck to temporarily hide product without deleting
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Featured (Show on Home Screen)
                </span>
                <span className="text-[11px] text-slate-500">
                  Highlighted in the top carousel and spotlight section
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/products"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
