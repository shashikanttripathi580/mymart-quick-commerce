import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import { Promotion } from '@mymart/shared';
import { getPromotions, getCategories, createPromotion, updatePromotion, deletePromotion } from '../lib/api';
import { ImageUploader } from '../components/ImageUploader';
import { ConfirmModal } from '../components/ConfirmModal';

export const Offers: React.FC = () => {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const { data: promotions, isLoading, refetch } = useQuery({
    queryKey: ['promotions'],
    queryFn: getPromotions,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const openAddModal = () => {
    setEditingPromo(null);
    setTitle('');
    setDescription('');
    setBannerUrl('https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80');
    setCategoryId('');
    setSortOrder((promotions?.length || 0) + 1);
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: Promotion) => {
    setEditingPromo(p);
    setTitle(p.title);
    setDescription(p.description || '');
    setBannerUrl(p.banner_url);
    setCategoryId(p.category_id || '');
    setSortOrder(p.sort_order);
    setIsActive(p.is_active);
    setFormError(null);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      if (!title.trim()) throw new Error('Promotion title is required');
      if (!bannerUrl.trim()) throw new Error('Banner image is required');

      const payload: Partial<Promotion> = {
        title: title.trim(),
        description: description.trim() || null,
        banner_url: bannerUrl.trim(),
        category_id: categoryId || null,
        sort_order: Number(sortOrder) || 1,
        is_active: isActive,
      };

      if (editingPromo) {
        return updatePromotion(editingPromo.id, payload);
      } else {
        return createPromotion(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setModalOpen(false);
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to save promotion');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Promotions & Hero Banners
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage home screen promotional carousels, marketing copy, and sale highlights
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
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promotional Banner</span>
          </button>
        </div>
      </div>

      {/* Promos List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading promotions...
          </div>
        ) : promotions && promotions.length > 0 ? (
          promotions.map((promo) => (
            <div
              key={promo.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col group"
            >
              <div className="relative aspect-[21/9] w-full bg-slate-900 overflow-hidden">
                <img
                  src={promo.banner_url}
                  alt={promo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                      promo.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                    }`}
                  >
                    {promo.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-1 inline-block">
                    Order: {promo.sort_order}
                  </span>
                  <h3 className="font-extrabold text-sm line-clamp-1">{promo.title}</h3>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-slate-600 line-clamp-2">
                  {promo.description || 'No subtitle text'}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {categories?.find((c) => c.id === promo.category_id)?.name ||
                      'General Store Offer'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(promo)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(promo)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">No active promotions</p>
          </div>
        )}
      </div>

      {/* Add / Edit Promo Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              {editingPromo ? 'Edit Promotion' : 'New Promotional Banner'}
            </h2>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Main Headline / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Super Saver Wednesday: Up to 40% Off!"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtitle / Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fresh vegetables and fruits delivered in 10 minutes..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <ImageUploader
                  value={bannerUrl}
                  onChange={(url) => setBannerUrl(url)}
                  label="Hero Banner Image (Wide Ratio)"
                  helperText="Recommended 1200x500px resolution. Stored on Cloudflare R2."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Link to Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">No link (General Banner)</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Carousel Sort Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Active (Show in customer app carousel)
                  </span>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPromo ? 'Update Banner' : 'Create Banner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Banner"
        message={`Are you sure you want to delete the promotion "${deleteTarget?.title}"?`}
        confirmText="Confirm Delete"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
