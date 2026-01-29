'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { useRole } from '../../../../hooks/useAuth';
import { Header } from '../../../../components/layout/Header';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { AVAILABLE_CATEGORY_ICONS } from '../../../../lib/constants';
import { generateSlug } from '../../../../lib/utils';
import { Save, ArrowLeft } from 'lucide-react';

export default function NewCategoryPage() {
  const router = useRouter();
  const { canManageCategories } = useRole();
  const createCategory = useMutation(api.categories.createCategory);
  const categories = useQuery(api.categories.getAllCategories);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    slug: '',
    order: 0,
    name_en: '',
    name_ro: '',
    name_it: '',
    description_en: '',
    description_ro: '',
    description_it: '',
    iconKey: 'moon',
    isActive: true,
  });

  // Auto-generate slug from English name
  const handleNameEnChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name_en: value,
      slug: generateSlug(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      // Set order to be last if not specified
      const order = formData.order || (categories?.length || 0) + 1;

      await createCategory({
        ...formData,
        order,
      });

      router.push('/dashboard/categories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
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

  return (
    <div className="p-6">
      <Header
        title="New Category"
        subtitle="Create a new story category"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Categories', href: '/dashboard/categories' },
          { label: 'New Category' },
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
              <p className="mt-1 text-xs text-gray-500">Display order (0 = auto)</p>
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
                onChange={(e) => handleNameEnChange(e.target.value)}
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
                        className={`p-2 text-2xl rounded-lg border-2 transition-colors ${
                          formData.iconKey === key
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
              loading={isSubmitting}
            >
              Create Category
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
