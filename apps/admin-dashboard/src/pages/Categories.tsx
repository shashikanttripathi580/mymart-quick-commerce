import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Tags,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  FolderTree,
  ArrowUpDown,
} from 'lucide-react';
import { Category, slugify } from '@mymart/shared';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/api';
import { ImageUploader } from '../components/ImageUploader';
import { ConfirmModal } from '../components/ConfirmModal';

export const Categories: React.FC = () => {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setImageUrl('https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=500&q=80');
    setDescription('');
    setSortOrder((categories?.length || 0) + 1);
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setImageUrl(cat.image_url);
    setDescription(cat.description || '');
    setSortOrder(cat.sort_order);
    setIsActive(cat.is_active);
    setFormError(null);
    setModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!editingCategory) {
      setSlug(slugify(val));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      if (!name.trim()) throw new Error('Category name is required');
      if (!imageUrl.trim()) throw new Error('Category image is required');

      const payload: Partial<Category> = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        image_url: imageUrl.trim(),
        description: description.trim() || null,
        sort_order: Number(sortOrder) || 1,
        is_active: isActive,
      };

      if (editingCategory) {
        return updateCategory(editingCategory.id, payload);
      } else {
        return createCategory(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setModalOpen(false);
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to save category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (err: Error) => {
      setDeleteError(err.message || 'Failed to delete category');
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Category Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Organize aisles and departments for the customer mobile app
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
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading categories...
          </div>
        ) : categories && categories.length > 0 ? (
          categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col group"
            >
              <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                      category.is_active
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-500 text-white'
                    }`}
                  >
                    {category.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div className="absolute bottom-2.5 left-2.5 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Order: {category.sort_order}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                    {category.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {category.description || 'No description provided'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {category.product_count ?? 0} Products
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(category);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <Tags className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">No categories found</p>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
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
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Fruits & Vegetables"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="fruits-vegetables"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fresh farm produce picked daily..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <ImageUploader
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  label="Category Cover Image"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Active & Visible
                    </span>
                  </label>
                </div>
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
                  <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? The system will prevent deletion if active products still belong to this category.`}
        confirmText="Confirm Delete"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};
