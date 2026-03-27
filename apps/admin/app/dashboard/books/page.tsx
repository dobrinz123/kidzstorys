'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useRole } from '../../../hooks/useAuth';
import { Header, HeaderSearch } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { StatusBadge, Badge, AudioStatusBadge } from '../../../components/ui/Badge';
import { NoBooksEmptyState, NoSearchResultsEmptyState } from '../../../components/ui/EmptyState';
import { PageLoading, SkeletonTable } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui/Toast';
import { formatRelativeTime } from '../../../lib/utils';
import { CATEGORY_ICONS } from '../../../lib/constants';
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Edit,
  Eye,
  MoreVertical,
  Clock,
  Users,
  Volume2,
} from 'lucide-react';

type BookAudioStatus = 'none' | 'partial' | 'complete' | 'failed';

function getBookAudioStatus(pages: Array<{
  audioStatus_en?: string;
  audioStatus_ro?: string;
}>): BookAudioStatus {
  if (pages.length === 0) return 'none';
  let doneCount = 0;
  let failedCount = 0;
  const totalSlots = pages.length * 2;
  for (const page of pages) {
    if (page.audioStatus_en === 'done') doneCount++;
    if (page.audioStatus_ro === 'done') doneCount++;
    if (page.audioStatus_en === 'failed') failedCount++;
    if (page.audioStatus_ro === 'failed') failedCount++;
  }
  if (failedCount > 0) return 'failed';
  if (doneCount === totalSlots) return 'complete';
  if (doneCount > 0) return 'partial';
  return 'none';
}

const PAGE_SIZE = 500; // Show all books at once for easy search

export default function BooksPage() {
  const { canCreateBooks, canDeleteBooks } = useRole();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Simple handlers for filters
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
  };

  const booksResult = useQuery(api.books.listBooks, {
    status: statusFilter ? statusFilter as any : undefined,
    categoryId: categoryFilter ? categoryFilter as any : undefined,
    search: search || undefined,
    limit: PAGE_SIZE,
    // No offset - load all books at once for easy search across all
  });

  const categories = useQuery(api.categories.getAllCategories);

  const { success, error: showError } = useToast();
  const [generatingBookId, setGeneratingBookId] = useState<string | null>(null);
  const startBatch = useMutation(api.audio.startAudioBatch);

  const handleGenerateAudio = async (bookId: string) => {
    setGeneratingBookId(bookId);
    try {
      const result = await startBatch({ bookId: bookId as any });
      if (result.totalJobs === 0) {
        success('All audio already generated for this book!');
      } else {
        success(`Queued ${result.totalJobs} job(s) for generation`);
      }
    } catch {
      showError('Failed to start audio generation');
    } finally {
      setGeneratingBookId(null);
    }
  };

  const isLoading = booksResult === undefined;
  const books = booksResult?.books || [];
  const total = booksResult?.total || 0;

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'ready', label: 'Ready' },
    { value: 'published', label: 'Published' },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...(categories?.map(cat => ({
      value: cat._id,
      label: `${CATEGORY_ICONS[cat.slug] || '📚'} ${cat.name_en}`,
    })) || []),
  ];

  return (
    <div className="p-6">
      <Header
        title="Books"
        subtitle={`Manage your story books (${total} total)`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Books' },
        ]}
        actions={
          canCreateBooks && (
            <Link href="/dashboard/books/new">
              <Button leftIcon={<Plus size={18} />}>
                New Book
              </Button>
            </Link>
          )
        }
      />

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <HeaderSearch
              placeholder="Search by title..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-40"
          />
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-48"
          />
        </div>
      </Card>

      {/* Books List */}
      {isLoading ? (
        <SkeletonTable rows={8} />
      ) : books.length === 0 ? (
        search ? (
          <NoSearchResultsEmptyState query={search} />
        ) : (
          <NoBooksEmptyState onCreateBook={() => window.location.href = '/dashboard/books/new'} />
        )
      ) : (
        <>
          <Card padding="none">
            <table className="table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Pages</th>
                  <th>Audio</th>
                  <th>Stats</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          {book.cover.legacyAssetKey ? (
                            <BookOpen size={24} className="text-primary-600" />
                          ) : (
                            <BookOpen size={24} className="text-primary-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">
                            {book.cover.title_en}
                          </p>
                          <p className="text-sm text-gray-500">{book.bookKey}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {book.category && (
                        <Badge variant="primary">
                          {CATEGORY_ICONS[book.category.slug] || '📚'} {book.category.name_en}
                        </Badge>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={book.status} />
                    </td>
                    <td>
                      <span className="text-gray-600">{book.pages.length} pages</span>
                    </td>
                    <td>
                      <AudioStatusBadge status={getBookAudioStatus(book.pages)} />
                    </td>
                    <td>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye size={14} />
                          {book.readCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {book.favoriteCount}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {formatRelativeTime(book.updatedAt)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Volume2 size={16} />}
                          isLoading={generatingBookId === book._id}
                          disabled={getBookAudioStatus(book.pages) === 'complete'}
                          onClick={() => handleGenerateAudio(book._id)}
                          title="Generate audio for this book"
                        >
                          Audio
                        </Button>
                        <Link href={`/dashboard/books/${book._id}`}>
                          <Button variant="ghost" size="sm" leftIcon={<Edit size={16} />}>
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Show total count at bottom */}
          <div className="flex items-center justify-center mt-4 px-2">
            <p className="text-sm text-gray-600">
              Showing {books.length} of {total} books
            </p>
          </div>
        </>
      )}
    </div>
  );
}
