'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import { BookEditor } from '../../../../components/books/BookEditor';
import { PageLoading } from '../../../../components/ui/Loading';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';
import { Id } from '../../../../../../convex/_generated/dataModel';

export default function EditBookPage() {
  const params = useParams();
  const bookId = params.bookId as Id<"books">;

  const book = useQuery(api.books.getBook, { bookId });

  if (book === undefined) {
    return <PageLoading message="Loading book..." />;
  }

  if (book === null) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<AlertCircle size={48} className="text-error-300" />}
          title="Book not found"
          description="The book you're looking for doesn't exist or has been deleted."
          action={{
            label: 'Back to Books',
            onClick: () => window.location.href = '/dashboard/books',
          }}
        />
      </div>
    );
  }

  return <BookEditor bookId={bookId} initialBook={book as any} />;
}
