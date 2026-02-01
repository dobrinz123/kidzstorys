'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useRole } from '../../../hooks/useAuth';
import { Header, HeaderSearch } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { StatusBadge, Badge } from '../../../components/ui/Badge';
import { NoBooksEmptyState, NoSearchResultsEmptyState } from '../../../components/ui/EmptyState';
import { PageLoading, SkeletonTable } from '../../../components/ui/Loading';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 25;

export default function BooksPage() {
  const { canCreateBooks, canDeleteBooks } = useRole();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);

  // Reset to first page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(0);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(0);
  };

  const booksResult = useQuery(api.books.listBooks, {
    status: statusFilter ? statusFilter as any : undefined,
    categoryId: categoryFilter ? categoryFilter as any : undefined,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE,
  });

  const categories = useQuery(api.categories.getAllCategories);

  const isLoading = booksResult === undefined;
  const books = booksResult?.books || [];
  const total = booksResult?.total || 0;
  const hasMore = booksResult?.hasMore || false;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startItem = currentPage * PAGE_SIZE + 1;
  const endItem = Math.min((currentPage + 1) * PAGE_SIZE, total);

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
                      <Link href={`/dashboard/books/${book._id}`}>
                        <Button variant="ghost" size="sm" leftIcon={<Edit size={16} />}>
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-sm text-gray-600">
                Showing {startItem}-{endItem} of {total} books
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  leftIcon={<ChevronLeft size={16} />}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    // Show pages around current page
                    let pageNum = i;
                    if (totalPages > 5) {
                      if (currentPage < 3) {
                        pageNum = i;
                      } else if (currentPage > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[36px]"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasMore && currentPage >= totalPages - 1}
                  rightIcon={<ChevronRight size={16} />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
