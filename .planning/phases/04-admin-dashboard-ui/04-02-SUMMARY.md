---
phase: 04-admin-dashboard-ui
plan: 02
subsystem: admin-ui
tags: [audio-dashboard, books-table, admin-ui, convex-hooks]
dependency_graph:
  requires: [convex/audio.ts (getAudioOverview, getFailedJobs, retryFailedJob, startBulkAudioGeneration, startAudioBatch), apps/admin/components/ui/Badge.tsx (AudioStatusBadge), apps/admin/components/ui/ProgressBar.tsx]
  provides: [/dashboard/audio page, Audio column in books table, per-book Generate Audio button]
  affects: [admin dashboard navigation flow]
tech_stack:
  added: []
  patterns: [useQuery loading guard, useMutation with toast feedback, ConfirmDialog for bulk operations, getBookAudioStatus inline helper]
key_files:
  created:
    - apps/admin/app/dashboard/audio/page.tsx
  modified:
    - apps/admin/app/dashboard/books/page.tsx
decisions:
  - Books audio status computed client-side from page audioStatus fields via getBookAudioStatus helper
  - Retry All Failed iterates sequentially and skips jobs at max retries (3/3)
  - Generate All Missing guarded by ConfirmDialog showing cost warning and slot count
metrics:
  duration: 143s
  completed: 2026-03-27
  tasks: 2
  files: 2
---

# Phase 04 Plan 02: Audio Dashboard Page + Books Audio Column Summary

Full audio management UI -- /dashboard/audio page with progress overview, failed jobs table, and books audio status; plus Audio column and Generate Audio button in the existing books table.

## Tasks Completed

### Task 1: Create Audio dashboard page at /dashboard/audio
**Commit:** 379f396

- **Section 1 -- Progress Overview**: Card with 4 stat boxes (totalBooks, pagesDone/totalSlots, EN count, RO count), overall ProgressBar, and EN/RO sub-bars. Color switches to success at 100%.
- **Section 2 -- Failed Jobs table**: Shows bookTitle, page number, locale badge, error message, retry count, per-job Retry button (disabled at 3/3). Retry All Failed button in header. EmptyState when no failures.
- **Section 3 -- Books Audio Status table**: Lists all books with AudioStatusBadge and per-book Generate Audio button (disabled when complete).
- **Generate All Missing** button in page header opens ConfirmDialog with cost warning before calling startBulkAudioGeneration.

### Task 2: Add Audio column and Generate Audio button to books table
**Commit:** 062dd0e

- Added AudioStatusBadge import and Audio column header after Pages column.
- Added AudioStatusBadge cell per row using getBookAudioStatus helper.
- Added Generate Audio button (Volume2 icon) per row before Edit button, calls startAudioBatch.
- Added useMutation, useToast, loading state for per-book generation.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- grep "getAudioOverview" audio/page.tsx: match found
- grep "getFailedJobs" audio/page.tsx: match found
- grep "retryFailedJob" audio/page.tsx: match found
- grep "startBulkAudioGeneration" audio/page.tsx: match found
- grep "AudioStatusBadge" books/page.tsx: match found
- grep "startAudioBatch" books/page.tsx: match found
- apps/admin/app/dashboard/audio/page.tsx exists (278 lines)

## Known Stubs

None -- all components wired to real Convex queries/mutations, no placeholder data.

## Self-Check: PASSED

All files exist, both commits verified.
