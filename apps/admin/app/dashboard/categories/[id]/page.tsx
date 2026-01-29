'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from '../../../../../../convex/_generated/dataModel';
import { useRole } from '../../../../hooks/useAuth';
import { Header } from '../../../../components/layout/Header';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { SkeletonTable } from '../../../../components/ui/Loading';
import { AVAILABLE_CATEGORY_ICONS } from '../../../../lib/constants';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as Id<"categories">;

  const { canManageCategories } = useRole();
  const category = useQuery(api.categories.getCategoryById, { categoryId });
  const updateCategory = useMutation(api.categories.updateCategory);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    slug: '',
    order: 0,
    name_en: '',
    name_ro: '',
    name_it: '',
    description_en: '',
    description_ro: '',
    description_it: '',
    iconKey: 'bedtime',
    isActive: true,
  });

  // Load category data when available
  useEffect(() => {
    if (category) {
      setFormData({
        slug: category.slug,
        order: category.order,
        name_en: category.name_en,
        name_ro: category.name_ro,
        name_it: category.name_it,
        description_en: category.description_en || '',
        description_ro: category.description_ro || '',
        description_it: category.description_it || '',
        iconKey: category.iconKey,
        isActive: category.isActive,
      });
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.name_en.trim() || !formData.name_ro.trim() || !formData.name_it.trim()) {
      setError('All language names are required');
      return;
    }

    if (!formData.slug.trim()) {
      setError('Slug is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateCategory({
        categoryId,
        slug: formData.slug,
        order: formData.order,
        name_en: formData.name_en,
        name_ro: formData.name_ro,
        name_it: formData.name_it,
        description_en: formData.description_en,
        description_ro: formData.description_ro,
        description_it: formData.description_it,
        iconKey: formData.iconKey,
        isActive: formData.isActive,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canManageCategories) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center text-gray-500">
          <p>You do not have permission to manage categories.</p>
        </Card>
      </div>
    );
  }

  if (category === undefined) {
    return (
      <div className="p-6">
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (category === null) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center text-gray-500">
          <p>Category not found.</p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => router.push('/dashboard/categories')}
          >
            Back to Categories
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header
        title="Edit Category"
        subtitle={`Editing: ${category.name_en}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Categories', href: '/dashboard/categories' },
          { label: 'Edit' },
        ]}
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => router.push('/dashboard/categories')}
          >
            Back
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
              Category updated successfully!
            </div>
          )}

          {/* Slug & Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="input"
                placeholder="category-slug"
                required
              />
              <p className="mt-1 text-xs text-gray-500">URL-friendly identifier</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                className="input"
                min="0"
              />
              <p className="mt-1 text-xs text-gray-500">Display order</p>
            </div>
          </div>

          {/* Names */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Category Names</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (English) <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                className="input"
                placeholder="Enter English name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (Romanian) <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name_ro}
                onChange={(e) => setFormData(prev => ({ ...prev, name_ro: e.target.value }))}
                className="input"
                placeholder="Enter Romanian name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (Italian) <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name_it}
                onChange={(e) => setFormData(prev => ({ ...prev, name_it: e.target.value }))}
                className="input"
                placeholder="Enter Italian name"
                required
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Descriptions</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (English)
              </label>
              <textarea
                value={formData.description_en}
                onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                className="input"
                rows={2}
                placeholder="Enter English description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Romanian)
              </label>
              <textarea
                value={formData.description_ro}
                onChange={(e) => setFormData(prev => ({ ...prev, description_ro: e.target.value }))}
                className="input"
                rows={2}
                placeholder="Enter Romanian description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Italian)
              </label>
              <textarea
                value={formData.description_it}
                onChange={(e) => setFormData(prev => ({ ...prev, description_it: e.target.value }))}
                className="input"
                rows={2}
                placeholder="Enter Italian description"
              />
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-4">
              {AVAILABLE_CATEGORY_ICONS.map((group) => (
                <div key={group.category}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {group.category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.icons.map(({ key, icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, iconKey: key }))}
                        className={`p-2 text-2xl rounded-lg border-2 transition-colors ${formData.iconKey === key
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        title={label}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {formData.iconKey && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: <span className="text-2xl">{AVAILABLE_CATEGORY_ICONS.flatMap(g => g.icons).find(i => i.key === formData.iconKey)?.icon || '📚'}</span>
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active (visible to users)
            </label>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/dashboard/categories')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              leftIcon={<Save size={18} />}
              isLoading={isSubmitting} /* Deployment Fix */
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
