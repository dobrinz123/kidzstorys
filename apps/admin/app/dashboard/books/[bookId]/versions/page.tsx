'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useAuthStore } from '../../../../../hooks/useAuth';
import { Header } from '../../../../../components/layout/Header';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardTitle } from '../../../../../components/ui/Card';
import { Badge } from '../../../../../components/ui/Badge';
import { ConfirmDialog } from '../../../../../components/ui/Modal';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import { PageLoading } from '../../../../../components/ui/Loading';
import { useToast } from '../../../../../components/ui/Toast';
import { formatDateTime } from '../../../../../lib/utils';
import { Id } from '@convex/_generated/dataModel';
import { useState } from 'react';
import {
  ArrowLeft,
  History,
  RotateCcw,
  Eye,
  Clock,
  User,
  FileText,
} from 'lucide-react';

export default function BookVersionsPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { adminUserId } = useAuthStore();
  const bookId = params.bookId as Id<"books">;

  const [selectedVersion, setSelectedVersion] = useState<Id<"bookVersions"> | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const book = useQuery(api.books.getBook, { bookId });
  const versions = useQuery(api.books.getBookVersions, { bookId });
  const restoreVersion = useMutation(api.books.restoreBookVersion);

  if (book === undefined || versions === undefined) {
    return <PageLoading message="Loading version history..." />;
  }

  if (book === null) {
    return (
      <div className="p-6">
        <EmptyState
          title="Book not found"
          description="The book you're looking for doesn't exist."
          action={{
            label: 'Back to Books',
            onClick: () => router.push('/dashboard/books'),
          }}
        />
      </div>
    );
  }

  const handleRestore = async () => {
    if (!selectedVersion || !adminUserId) return;

    setIsRestoring(true);
    try {
      await restoreVersion({
        bookId,
        versionId: selectedVersion,
        adminUserId,
      });
      success('Version restored successfully');
      setSelectedVersion(null);
    } catch (err: any) {
      showError(err.message || 'Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Header
        title="Version History"
        subtitle={book.cover.title_en}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Books', href: '/dashboard/books' },
          { label: book.cover.title_en, href: `/dashboard/books/${bookId}` },
          { label: 'Versions' },
        ]}
        actions={
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/books/${bookId}`)}
            leftIcon={<ArrowLeft size={18} />}
          >
            Back to Editor
          </Button>
        }
      />

      {/* Current Version Info */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <FileText size={24} className="text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Current Version: {book.version}</p>
            <p className="text-sm text-gray-500">
              Last updated: {formatDateTime(book.updatedAt)}
            </p>
          </div>
        </div>
      </Card>

      {/* Version List */}
      {versions.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<History size={48} className="text-gray-300" />}
            title="No version history"
            description="Version history is created when you edit a published book. Each save creates a snapshot you can restore later."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <Card key={version._id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <History size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        Version {version.version}
                      </span>
                      {version.version === book.version - 1 && (
                        <Badge variant="info">Previous</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Clock size={14} />
                      {formatDateTime(version.createdAt)}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <User size={14} />
                      {version.changerEmail || 'Unknown user'}
                    </p>
                    {version.changeNote && (
                      <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                        Note: {version.changeNote}
                      </p>
                    )}

                    {/* Snapshot preview */}
                    <div className="mt-3 text-xs text-gray-500">
                      <span>{version.snapshot.pages.length} pages</span>
                      <span className="mx-2">•</span>
                      <span>Ages {version.snapshot.ageMin}-{version.snapshot.ageMax}</span>
                      <span className="mx-2">•</span>
                      <span>{version.snapshot.durationMin} min</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedVersion(version._id)}
                  leftIcon={<RotateCcw size={16} />}
                >
                  Restore
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={selectedVersion !== null}
        onClose={() => setSelectedVersion(null)}
        onConfirm={handleRestore}
        title="Restore Version"
        message="This will replace the current book content with this version. A backup of the current version will be created automatically. Continue?"
        confirmLabel="Restore"
        isLoading={isRestoring}
      />
    </div>
  );
}
