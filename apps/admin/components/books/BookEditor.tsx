'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useAuthStore } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { Header } from '../layout/Header';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardTitle } from '../ui/Card';
import { Modal, ConfirmDialog } from '../ui/Modal';
import { Badge, StatusBadge } from '../ui/Badge';
import { CoverEditor } from './CoverEditor';
import { PageEditor } from './PageEditor';
import { PublishValidator } from './PublishValidator';
import { generateSlug, getBookCompletionPercentage, getMissingItems } from '../../lib/utils';
import { CATEGORY_ICONS, AGE_RANGES, DURATION_OPTIONS } from '../../lib/constants';
import { Book, BookCover, BookPage } from '../../types';
import { Id } from '@convex/_generated/dataModel';
import {
  Save,
  Send,
  ArrowLeft,
  Plus,
  AlertCircle,
  Clock,
  History,
  Eye,
} from 'lucide-react';

interface BookEditorProps {
  bookId?: Id<"books">;
  initialBook?: Book;
}

const emptyPage: BookPage = {
  pageNumber: 1,
  text_en: '',
  text_ro: '',
  text_it: '',
};

const emptyCover: BookCover = {
  title_en: '',
  title_ro: '',
  title_it: '',
};

export function BookEditor({ bookId, initialBook }: BookEditorProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { adminUserId } = useAuthStore();

  // Form state
  const [bookKey, setBookKey] = useState(initialBook?.bookKey || '');
  const [categoryId, setCategoryId] = useState(initialBook?.categoryId || '');
  const [ageMin, setAgeMin] = useState(initialBook?.ageMin || 3);
  const [ageMax, setAgeMax] = useState(initialBook?.ageMax || 8);
  const [durationMin, setDurationMin] = useState(initialBook?.durationMin || 5);
  const [cover, setCover] = useState<BookCover>(initialBook?.cover || emptyCover);
  const [pages, setPages] = useState<BookPage[]>(initialBook?.pages || [{ ...emptyPage }]);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishValidator, setShowPublishValidator] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Queries
  const categories = useQuery(api.categories.getAllCategories);
  const coverImageUrl = useQuery(api.books.getFileUrl, cover.imageId ? { storageId: cover.imageId } : "skip");

  // Mutations
  const createBook = useMutation(api.books.createBook);
  const updateBook = useMutation(api.books.updateBook);
  const publishBook = useMutation(api.books.publishBook);



  // Track changes
  useEffect(() => {
    if (initialBook) {
      const isChanged =
        bookKey !== initialBook.bookKey ||
        categoryId !== initialBook.categoryId ||
        ageMin !== initialBook.ageMin ||
        ageMax !== initialBook.ageMax ||
        durationMin !== initialBook.durationMin ||
        JSON.stringify(cover) !== JSON.stringify(initialBook.cover) ||
        JSON.stringify(pages) !== JSON.stringify(initialBook.pages);
      setHasChanges(isChanged);
    } else {
      setHasChanges(true);
    }
  }, [bookKey, categoryId, ageMin, ageMax, durationMin, cover, pages, initialBook]);

  // Auto-generate slug from English title
  useEffect(() => {
    if (!bookId && cover.title_en && !bookKey) {
      setBookKey(generateSlug(cover.title_en));
    }
  }, [cover.title_en, bookKey, bookId]);

  const categoryOptions = [
    { value: '', label: 'Select a category' },
    ...(categories?.map(cat => ({
      value: cat._id,
      label: `${CATEGORY_ICONS[cat.slug] || '📚'} ${cat.name_en}`,
    })) || []),
  ];

  const handleSave = async () => {
    if (!adminUserId) {
      showError('Not authenticated');
      return;
    }

    if (!bookKey || !categoryId) {
      showError('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    try {
      if (bookId) {
        // Update existing book
        await updateBook({
          bookId,
          adminUserId,
          categoryId: categoryId as Id<"categories">,
          ageMin,
          ageMax,
          durationMin,
          cover,
          pages,
        });
        success('Book saved successfully');
      } else {
        // Create new book
        const newBookId = await createBook({
          adminUserId,
          bookKey,
          categoryId: categoryId as Id<"categories">,
          ageMin,
          ageMax,
          durationMin,
          cover,
          pages,
        });
        success('Book created successfully');
        router.push(`/dashboard/books/${newBookId}`);
      }
      setHasChanges(false);
    } catch (err: any) {
      showError(err.message || 'Failed to save book');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!adminUserId || !bookId) return;

    // Save first if there are changes
    if (hasChanges) {
      await handleSave();
    }

    setIsPublishing(true);

    try {
      await publishBook({ bookId, adminUserId });
      success('Book published successfully!');
      setShowPublishValidator(false);
      setHasChanges(false); // Reset unsaved changes flag after successful publish
    } catch (err: any) {
      showError(err.message || 'Failed to publish book');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddPage = () => {
    setPages([
      ...pages,
      {
        ...emptyPage,
        pageNumber: pages.length + 1,
      },
    ]);
  };

  const handlePageChange = (index: number, updatedPage: BookPage) => {
    const newPages = [...pages];
    newPages[index] = updatedPage;
    setPages(newPages);
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      showError('Book must have at least one page');
      return;
    }
    const newPages = pages.filter((_, i) => i !== index);
    // Renumber pages
    newPages.forEach((page, i) => {
      page.pageNumber = i + 1;
    });
    setPages(newPages);
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const newPages = [...pages];
    [newPages[index], newPages[newIndex]] = [newPages[newIndex], newPages[index]];
    // Renumber pages
    newPages.forEach((page, i) => {
      page.pageNumber = i + 1;
    });
    setPages(newPages);
  };

  const completionPercentage = getBookCompletionPercentage({
    cover,
    pages,
    categoryId,
    ageMin,
    ageMax,
    durationMin,
  });

  const missingItems = getMissingItems({
    cover,
    pages,
    categoryId,
    ageMin,
    ageMax,
    durationMin,
  });

  const canPublish = missingItems.length === 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              if (hasChanges) {
                setShowUnsavedDialog(true);
              } else {
                router.push('/dashboard/books');
              }
            }}
            leftIcon={<ArrowLeft size={18} />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {bookId ? 'Edit Book' : 'Create New Book'}
            </h1>
            {initialBook && (
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={initialBook.status} />
                {initialBook.version > 1 && (
                  <Badge variant="info">v{initialBook.version}</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {bookId && (
            <Button
              variant="ghost"
              onClick={() => router.push(`/dashboard/books/${bookId}/versions`)}
              leftIcon={<History size={18} />}
            >
              History
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!hasChanges}
            leftIcon={<Save size={18} />}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => setShowPublishValidator(true)}
            disabled={!bookId || !canPublish}
            leftIcon={<Send size={18} />}
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Completion: {completionPercentage}%
          </span>
          {missingItems.length > 0 && (
            <span className="text-xs text-warning-600">
              {missingItems.length} items missing
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${completionPercentage === 100 ? 'bg-success-500' : 'bg-primary-500'
              }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </Card>

      {/* Metadata */}
      <Card className="p-6 mb-6">
        <CardTitle className="mb-4">Book Details</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Book Key (URL slug)"
            value={bookKey}
            onChange={(e) => setBookKey(e.target.value)}
            placeholder="my-book-title"
            disabled={!!bookId}
            helper={bookId ? "Cannot change after creation" : "Auto-generated from title"}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
          <div>
            <label className="input-label">Age Range</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={ageMin}
                onChange={(e) => setAgeMin(parseInt(e.target.value) || 0)}
                min={1}
                max={12}
                className="w-20"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="number"
                value={ageMax}
                onChange={(e) => setAgeMax(parseInt(e.target.value) || 0)}
                min={1}
                max={12}
                className="w-20"
              />
              <span className="text-gray-500">years</span>
            </div>
          </div>
          <Select
            label="Duration"
            options={DURATION_OPTIONS.map(d => ({
              value: String(d.value),
              label: d.label,
            }))}
            value={String(durationMin)}
            onChange={(e) => setDurationMin(parseInt(e.target.value))}
          />
        </div>
      </Card>

      {/* Cover Editor */}
      <div className="mb-6">
        <CoverEditor
          cover={cover}
          onChange={setCover}
          imageUrl={coverImageUrl || undefined}
        />
      </div>

      {/* Pages */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Pages ({pages.length})
          </h2>
          <Button
            variant="secondary"
            onClick={handleAddPage}
            leftIcon={<Plus size={18} />}
          >
            Add Page
          </Button>
        </div>

        <div className="space-y-4">
          {pages.map((page, index) => (
            <PageEditor
              key={index}
              page={page}
              pageIndex={index}
              totalPages={pages.length}
              onChange={(updated) => handlePageChange(index, updated)}
              onDelete={() => handleDeletePage(index)}
              onMoveUp={() => handleMovePage(index, 'up')}
              onMoveDown={() => handleMovePage(index, 'down')}
            />
          ))}
        </div>
      </div>

      {/* Publish Validator Modal */}
      <Modal
        isOpen={showPublishValidator}
        onClose={() => setShowPublishValidator(false)}
        title="Publish Book"
        size="lg"
      >
        <PublishValidator
          cover={cover}
          pages={pages}
          categoryId={categoryId}
          ageMin={ageMin}
          ageMax={ageMax}
          durationMin={durationMin}
          onPublish={handlePublish}
          onCancel={() => setShowPublishValidator(false)}
          isPublishing={isPublishing}
        />
      </Modal>

      {/* Unsaved Changes Dialog */}
      <ConfirmDialog
        isOpen={showUnsavedDialog}
        onClose={() => setShowUnsavedDialog(false)}
        onConfirm={() => router.push('/dashboard/books')}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmLabel="Leave"
        variant="danger"
      />
    </div>
  );
}
