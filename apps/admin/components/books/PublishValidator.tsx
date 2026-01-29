'use client';

import { validateBookForPublishing } from '../../lib/utils';
import { Button } from '../ui/Button';
import { BookCover, BookPage } from '../../types';
import { CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react';

interface PublishValidatorProps {
  cover: BookCover;
  pages: BookPage[];
  categoryId: string;
  ageMin: number;
  ageMax: number;
  durationMin: number;
  onPublish: () => void;
  onCancel: () => void;
  isPublishing: boolean;
}

export function PublishValidator({
  cover,
  pages,
  categoryId,
  ageMin,
  ageMax,
  durationMin,
  onPublish,
  onCancel,
  isPublishing,
}: PublishValidatorProps) {
  const { isValid, errors } = validateBookForPublishing({
    cover,
    pages,
    categoryId,
    ageMin,
    ageMax,
    durationMin,
  });

  // Group errors by category
  const coverErrors = errors.filter(e => e.field.startsWith('cover'));
  const pageErrors = errors.filter(e => e.field.startsWith('pages'));
  const metadataErrors = errors.filter(e =>
    ['categoryId', 'age', 'durationMin'].includes(e.field)
  );

  const ValidationSection = ({
    title,
    items,
    success = false,
  }: {
    title: string;
    items: { field: string; message: string }[];
    success?: boolean;
  }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        {success ? (
          <CheckCircle size={18} className="text-success-500" />
        ) : items.length === 0 ? (
          <CheckCircle size={18} className="text-success-500" />
        ) : (
          <XCircle size={18} className="text-error-500" />
        )}
        <span className="font-medium text-gray-900">{title}</span>
        {items.length === 0 && (
          <span className="text-xs text-success-600 bg-success-100 px-2 py-0.5 rounded">
            Complete
          </span>
        )}
      </div>
      {items.length > 0 && (
        <ul className="ml-7 space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-sm text-error-600">
              {item.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      {isValid ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-success-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ready to Publish!
          </h3>
          <p className="text-gray-500 mb-6">
            Your book meets all requirements and can be published.
            Once published, it will be available in the "New Arrivals" section for 7 days.
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <AlertTriangle size={20} className="text-warning-500" />
            <span className="text-warning-700">
              Please fix the following issues before publishing:
            </span>
          </div>

          <ValidationSection title="Cover" items={coverErrors} />
          <ValidationSection title="Pages" items={pageErrors} />
          <ValidationSection title="Metadata" items={metadataErrors} />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onPublish}
          disabled={!isValid}
          isLoading={isPublishing}
          leftIcon={<Send size={18} />}
        >
          Publish Book
        </Button>
      </div>
    </div>
  );
}
