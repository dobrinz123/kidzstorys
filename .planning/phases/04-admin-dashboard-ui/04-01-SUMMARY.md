---
phase: 04-admin-dashboard-ui
plan: 01
subsystem: convex-backend, admin-ui
tags: [audio, convex-queries, admin-sidebar, ui-components]
dependency_graph:
  requires: [convex/schema.ts (audioJobs table), convex/audio.ts (existing 13 exports)]
  provides: [getFailedJobs query, retryFailedJob mutation, getAudioOverview query, ProgressBar component, AudioStatusBadge component, Audio sidebar nav]
  affects: [apps/admin/app/dashboard/audio (plan 04-02 depends on these)]
tech_stack:
  added: []
  patterns: [public query with index lookup, public mutation with validation guards, Tailwind progress bar, Badge variant component]
key_files:
  created:
    - apps/admin/components/ui/ProgressBar.tsx
  modified:
    - convex/audio.ts
    - convex/audio.test.ts
    - apps/admin/components/layout/Sidebar.tsx
    - apps/admin/components/ui/Badge.tsx
decisions:
  - AudioStatusBadge uses dot variant of existing Badge for visual consistency with StatusBadge
  - ProgressBar clamps value 0-100 to prevent overflow rendering
  - getAudioOverview only counts published books (draft/ready excluded from progress)
metrics:
  duration: 203s
  completed: 2026-03-27
  tasks: 2
  files: 5
---

# Phase 04 Plan 01: Audio Backend Queries + UI Primitives Summary

Three new Convex public exports (getFailedJobs query, retryFailedJob mutation, getAudioOverview query) plus Audio sidebar nav entry, ProgressBar component, and AudioStatusBadge component -- all contracts needed by plan 04-02.

## Tasks Completed

### Task 1: Add getFailedJobs, retryFailedJob, getAudioOverview to convex/audio.ts
**Commit:** 3605e38
**TDD:** 5 new tests written first (RED), then 3 functions implemented (GREEN). All 9/9 tests pass.

- **Export 14 -- getFailedJobs** (public query): Queries audioJobs by_status index for "failed", enriches each job with bookTitle from the book's cover.title_en field.
- **Export 15 -- retryFailedJob** (public mutation): Validates job exists, is failed, and retryCount < 3 before resetting to pending with retryCount+1.
- **Export 16 -- getAudioOverview** (public query): Iterates all published books' pages, counting totalPages, doneEn, doneRo, failedCount. Returns totalSlots (pages * 2 locales) and totalDone.

### Task 2: Add Audio nav entry to Sidebar and create ProgressBar + AudioStatusBadge
**Commit:** 4059dc7

- **Sidebar.tsx**: Added Volume2 icon import, inserted Audio nav item ({href: '/dashboard/audio', admin-only}) between Content Audit and Statistics.
- **ProgressBar.tsx**: New component with value (0-100), size (sm/md), color (primary/success/warning/error), showLabel props. Clamps value and uses Tailwind width percentage.
- **Badge.tsx**: Added AudioStatusBadge export with none/partial/complete/failed variants using existing Badge with dot indicator.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx vitest run` in convex/: 9/9 tests pass (4 existing + 5 new)
- `grep "dashboard/audio" Sidebar.tsx`: match found
- `grep "AudioStatusBadge" Badge.tsx`: match found
- `ProgressBar.tsx` file exists with ProgressBar export
- Convex `npx convex dev --once` not runnable in non-interactive terminal (requires auth); TypeScript correctness verified via tests and manual inspection

## Known Stubs

None -- all components are fully implemented with real logic, no placeholder data.

## Self-Check: PASSED

All files exist, both commits verified.
