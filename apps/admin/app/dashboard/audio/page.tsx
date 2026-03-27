'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Header } from '../../../components/layout/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge, AudioStatusBadge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { PageLoading } from '../../../components/ui/Loading';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/Toast';
import { Play, Pause, Square, RefreshCw, AlertTriangle, Volume2, BookOpen, Trash2, X } from 'lucide-react';

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

export default function AudioPage() {
  const { success, error: showError } = useToast();
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [generatingBookId, setGeneratingBookId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null); // "bookId_locale_pageIndex"
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPreview = useCallback((audioUrl: string, id: string) => {
    // If same audio is playing, pause it
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(id);
  }, [playingId]);

  const [removingJobId, setRemovingJobId] = useState<string | null>(null);
  const [isClearingQueue, setIsClearingQueue] = useState(false);

  const overview = useQuery(api.audio.getAudioOverview);
  const failedJobs = useQuery(api.audio.getFailedJobs);
  const queuedJobs = useQuery(api.audio.getQueuedJobs);
  const booksResult = useQuery(api.books.listBooks, { limit: 500 });
  const isPaused = useQuery(api.audio.getGenerationPaused);

  const startBulk = useMutation(api.audio.startBulkAudioGeneration);
  const retryJob = useMutation(api.audio.retryFailedJob);
  const startBatch = useMutation(api.audio.startAudioBatch);
  const togglePause = useMutation(api.audio.toggleGenerationPause);
  const removeFromQueue = useMutation(api.audio.removeFromQueue);
  const clearQueue = useMutation(api.audio.clearQueue);

  // Wait for all queries before rendering
  if (overview === undefined || failedJobs === undefined || booksResult === undefined) {
    return <PageLoading message="Loading audio status..." />;
  }

  const books = booksResult.books ?? [];
  const progressPct = overview.totalSlots > 0
    ? Math.round((overview.totalDone / overview.totalSlots) * 100)
    : 0;
  const enPct = overview.totalPages > 0
    ? Math.round((overview.doneEn / overview.totalPages) * 100)
    : 0;
  const roPct = overview.totalPages > 0
    ? Math.round((overview.doneRo / overview.totalPages) * 100)
    : 0;

  const handleBulkGenerate = async () => {
    setIsBulkGenerating(true);
    try {
      const result = await startBulk({});
      if (result.batchesCreated === 0) {
        success('All audio already generated!');
      } else {
        success(`Started generation for ${result.batchesCreated} book(s)`);
      }
    } catch {
      showError('Failed to start bulk generation');
    } finally {
      setIsBulkGenerating(false);
      setConfirmBulkOpen(false);
    }
  };

  const handleRetryJob = async (jobId: Id<'audioJobs'>) => {
    setRetryingJobId(jobId);
    try {
      await retryJob({ jobId });
      success('Job requeued for retry');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to retry job');
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    let retried = 0;
    let skipped = 0;
    for (const job of failedJobs) {
      if (job.retryCount >= 3) { skipped++; continue; }
      try {
        await retryJob({ jobId: job._id });
        retried++;
      } catch {
        skipped++;
      }
    }
    setIsRetryingAll(false);
    if (retried > 0) success(`Requeued ${retried} job(s)${skipped > 0 ? `, skipped ${skipped} (max retries)` : ''}`);
    else showError('No jobs could be retried (all at max retries)');
  };

  const handleGenerateBook = async (bookId: Id<'books'>) => {
    setGeneratingBookId(bookId);
    try {
      const result = await startBatch({ bookId });
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

  return (
    <div className="p-6 space-y-6">
      <Header
        title="Audio Generation"
        subtitle="Manage audiobook generation for all books"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audio Generation' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant={isPaused ? 'primary' : 'outline'}
              leftIcon={isPaused ? <Play size={18} /> : <Square size={18} />}
              onClick={async () => {
                try {
                  await togglePause({ paused: !isPaused });
                  success(isPaused ? 'Generation resumed' : 'Generation paused');
                } catch {
                  showError('Failed to toggle generation');
                }
              }}
            >
              {isPaused ? 'Resume Generation' : 'Stop Generation'}
            </Button>
            <Button
              leftIcon={<Play size={18} />}
              onClick={() => setConfirmBulkOpen(true)}
              disabled={!isPaused}
            >
              Generate All Missing
            </Button>
          </div>
        }
      />

      {/* Section 1: Progress Overview */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generation Progress</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Total Books</p>
            <p className="text-2xl font-bold text-gray-900">{overview.totalBooks}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pages Done</p>
            <p className="text-2xl font-bold text-gray-900">
              {overview.totalDone}
              <span className="text-sm font-normal text-gray-500"> / {overview.totalSlots}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">EN Complete</p>
            <p className="text-2xl font-bold text-gray-900">
              {overview.doneEn}
              <span className="text-sm font-normal text-gray-500"> / {overview.totalPages}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">RO Complete</p>
            <p className="text-2xl font-bold text-gray-900">
              {overview.doneRo}
              <span className="text-sm font-normal text-gray-500"> / {overview.totalPages}</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall progress</span>
              <span>{overview.totalDone} / {overview.totalSlots} slots</span>
            </div>
            <ProgressBar value={progressPct} color={progressPct === 100 ? 'success' : 'primary'} />
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>English (EN)</span>
              <span>{overview.doneEn} / {overview.totalPages} pages</span>
            </div>
            <ProgressBar value={enPct} size="sm" color="primary" showLabel={false} />
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Romanian (RO)</span>
              <span>{overview.doneRo} / {overview.totalPages} pages</span>
            </div>
            <ProgressBar value={roPct} size="sm" color="primary" showLabel={false} />
          </div>
        </div>

        {overview.failedCount > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-error-600">
            <AlertTriangle size={16} />
            <span>{overview.failedCount} page slot(s) have failed jobs -- see Failed Jobs below</span>
          </div>
        )}
      </Card>

      {/* Section 2: Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Queue
            {queuedJobs && queuedJobs.length > 0 && (
              <Badge variant="info" className="ml-2">{queuedJobs.length}</Badge>
            )}
          </h2>
          {queuedJobs && queuedJobs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Trash2 size={16} />}
              isLoading={isClearingQueue}
              onClick={async () => {
                if (!confirm(`Remove all ${queuedJobs.length} pending jobs from the queue?`)) return;
                setIsClearingQueue(true);
                try {
                  const result = await clearQueue({});
                  success(`Cleared ${result.removed} jobs from queue`);
                } catch {
                  showError('Failed to clear queue');
                } finally {
                  setIsClearingQueue(false);
                }
              }}
            >
              Clear Queue
            </Button>
          )}
        </div>

        {!queuedJobs || queuedJobs.length === 0 ? (
          <EmptyState
            icon={<Volume2 size={32} className="text-gray-400" />}
            title="Queue is empty"
            description="No pending audio generation jobs. Use 'Generate All Missing' or per-book buttons to queue jobs."
          />
        ) : (
          <Card padding="none">
            <div className="max-h-96 overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Page</th>
                    <th>Locale</th>
                    <th>Retries</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {queuedJobs.map((job) => (
                    <tr key={job._id}>
                      <td>
                        <span className="font-medium text-gray-900 line-clamp-1">{job.bookTitle}</span>
                      </td>
                      <td>Page {job.pageIndex + 1}</td>
                      <td><Badge variant="gray">{job.locale.toUpperCase()}</Badge></td>
                      <td><span className="text-gray-500">{job.retryCount}</span></td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error-500 hover:text-error-700"
                          isLoading={removingJobId === job._id}
                          onClick={async () => {
                            setRemovingJobId(job._id);
                            try {
                              await removeFromQueue({ jobId: job._id });
                              success('Removed from queue');
                            } catch {
                              showError('Failed to remove job');
                            } finally {
                              setRemovingJobId(null);
                            }
                          }}
                          title="Remove from queue"
                        >
                          <X size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Section 3: Failed Jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Failed Jobs
            {failedJobs.length > 0 && (
              <Badge variant="error" className="ml-2">{failedJobs.length}</Badge>
            )}
          </h2>
          {failedJobs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={16} />}
              isLoading={isRetryingAll}
              onClick={handleRetryAll}
            >
              Retry All Failed
            </Button>
          )}
        </div>

        {failedJobs.length === 0 ? (
          <EmptyState
            icon={<Volume2 size={32} className="text-success-500" />}
            title="No failed jobs"
            description="All audio generation jobs are healthy."
          />
        ) : (
          <Card padding="none">
            <table className="table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Page</th>
                  <th>Locale</th>
                  <th>Error</th>
                  <th>Retries</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {failedJobs.map((job) => (
                  <tr key={job._id}>
                    <td>
                      <span className="font-medium text-gray-900">{job.bookTitle}</span>
                    </td>
                    <td>
                      <span className="text-gray-600">Page {job.pageIndex + 1}</span>
                    </td>
                    <td>
                      <Badge variant="info">{job.locale.toUpperCase()}</Badge>
                    </td>
                    <td>
                      <span
                        className="text-sm text-error-600 max-w-xs truncate block"
                        title={job.errorMessage ?? 'Unknown error'}
                      >
                        {job.errorMessage ?? 'Unknown error'}
                      </span>
                    </td>
                    <td>
                      <span className={job.retryCount >= 3 ? 'text-error-600 font-medium' : 'text-gray-600'}>
                        {job.retryCount} / 3
                      </span>
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RefreshCw size={14} />}
                        isLoading={retryingJobId === job._id}
                        disabled={job.retryCount >= 3}
                        onClick={() => handleRetryJob(job._id)}
                        title={job.retryCount >= 3 ? 'Max retries reached' : 'Retry this job'}
                      >
                        Retry
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Section 3: Books Audio Status */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Books Audio Status</h2>
        {books.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={32} className="text-gray-400" />}
            title="No books found"
            description="Publish books first to generate audio."
          />
        ) : (
          <Card padding="none">
            <table className="table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Pages</th>
                  <th>Audio Status</th>
                  <th>Preview</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => {
                  const audioStatus = getBookAudioStatus(book.pages);
                  const firstPageEnUrl = book.pages[0]?.audioUrl_en;
                  const firstPageRoUrl = book.pages[0]?.audioUrl_ro;
                  return (
                    <tr key={book._id}>
                      <td>
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">
                            {book.cover.title_en}
                          </p>
                          <p className="text-sm text-gray-500">{book.bookKey}</p>
                        </div>
                      </td>
                      <td>
                        <span className="text-gray-600">{book.pages.length}</span>
                      </td>
                      <td>
                        <AudioStatusBadge status={audioStatus} />
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {firstPageEnUrl ? (
                            <Button
                              variant={playingId === `${book._id}_en` ? 'primary' : 'ghost'}
                              size="sm"
                              onClick={() => handlePlayPreview(firstPageEnUrl, `${book._id}_en`)}
                              title="Preview English audio (page 1)"
                            >
                              {playingId === `${book._id}_en` ? <Pause size={14} /> : <Play size={14} />}
                              <span className="ml-1 text-xs">EN</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                          {firstPageRoUrl ? (
                            <Button
                              variant={playingId === `${book._id}_ro` ? 'primary' : 'ghost'}
                              size="sm"
                              onClick={() => handlePlayPreview(firstPageRoUrl, `${book._id}_ro`)}
                              title="Preview Romanian audio (page 1)"
                            >
                              {playingId === `${book._id}_ro` ? <Pause size={14} /> : <Play size={14} />}
                              <span className="ml-1 text-xs">RO</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Volume2 size={14} />}
                          isLoading={generatingBookId === book._id}
                          disabled={audioStatus === 'complete'}
                          onClick={() => handleGenerateBook(book._id)}
                        >
                          Generate Audio
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Confirm Bulk Generation Dialog */}
      <ConfirmDialog
        isOpen={confirmBulkOpen}
        onClose={() => setConfirmBulkOpen(false)}
        onConfirm={handleBulkGenerate}
        title="Generate All Missing Audio"
        message={`This will queue audio generation for all ${overview.totalBooks} published books with missing audio (${overview.totalSlots - overview.totalDone} remaining slots). This triggers ElevenLabs API calls and incurs cost. Continue?`}
        confirmLabel="Generate All"
        cancelLabel="Cancel"
        variant="primary"
        isLoading={isBulkGenerating}
      />
    </div>
  );
}
