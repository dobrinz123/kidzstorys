---
phase: 03-generation-pipeline
plan: 01
subsystem: audio-generation
tags: [convex, mutation, query, batch, audio, pipeline]
dependency_graph:
  requires: [01-02, 01-03, 02-01]
  provides: [startAudioBatch, getGenerationProgress, startBulkAudioGeneration]
  affects: [convex/audio.ts]
tech_stack:
  added: []
  patterns: [batch-creation-mutation, idempotent-job-creation, index-based-lookup]
key_files:
  created: []
  modified: [convex/audio.ts]
decisions:
  - "startAudioBatch returns { batchId: null, totalJobs: 0 } when all pages already done (skip empty batch)"
  - "startBulkAudioGeneration uses batchId format batch_{timestamp}_{bookId} for uniqueness across books in same transaction"
metrics:
  duration: "97s"
  completed: "2026-03-27T19:35:00Z"
  tasks: 2
  files_modified: 1
---

# Phase 03 Plan 01: Batch Creation Layer Summary

Three public Convex functions added to convex/audio.ts for admin-triggered audio generation batching.

## What Was Built

### Export 6: startAudioBatch (mutation)
- **Signature:** `startAudioBatch({ bookId: Id<"books"> }) => { batchId: string | null, totalJobs: number }`
- Creates one `audioJob` per page per locale (en, ro) where `audioStatus_{locale} !== "done"`
- Creates one `audioGenBatches` record with `status: "queued"`, `totalJobs`, counters at 0
- Returns `{ batchId: null, totalJobs: 0 }` if all pages already done (no empty batches)
- batchId format: `batch_{Date.now()}`

### Export 7: getGenerationProgress (query)
- **Signature:** `getGenerationProgress({ batchId: string }) => audioGenBatches document | null`
- Uses `by_batchId` index for efficient lookup
- Returns full batch record for admin UI progress display

### Export 8: startBulkAudioGeneration (mutation)
- **Signature:** `startBulkAudioGeneration({}) => { batchesCreated: number, results: Array<{ bookId, batchId, totalJobs }> }`
- Queries all published books via `by_status` index
- Creates per-book batches, skipping books with no missing audio
- batchId format: `batch_{Date.now()}_{bookId}` for uniqueness in same transaction

## Idempotency

`startAudioBatch` checks `page[audioStatus_{locale}]` before creating each job. Pages with `audioStatus === "done"` are skipped. This means calling `startAudioBatch` twice for the same book will only create jobs for pages that still need audio, not duplicates.

## Files Modified

| File | Changes |
|------|---------|
| convex/audio.ts | Added `mutation` and `query` imports; appended 3 new exports (127 lines) |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 5796afb | startAudioBatch mutation + getGenerationProgress query |
| 2 | 64dc3f3 | startBulkAudioGeneration mutation |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functions are fully implemented with real database operations.

## Verification Results

1. TypeScript check: No new errors in audio.ts (pre-existing `internal.audio` type generation issue from Phase 2 is unrelated)
2. All 8 exports confirmed: getPageText, markGenerating, markDone, markFailed, generatePageAudio, startAudioBatch, getGenerationProgress, startBulkAudioGeneration
3. `mutation` and `query` imports present alongside existing internal imports
4. `by_batchId` index used in getGenerationProgress
5. `audioStatus_` idempotency check present in both startAudioBatch and startBulkAudioGeneration

## Self-Check: PASSED

- convex/audio.ts: FOUND
- 03-01-SUMMARY.md: FOUND
- Commit 5796afb: FOUND
- Commit 64dc3f3: FOUND
