---
phase: 01-data-model
plan: "02"
subsystem: database
tags: [convex, schema, audioJobs, tts, audio-generation]

requires:
  - phase: 01-data-model plan 01
    provides: audio fields (audioUrl_en/ro, audioStorageId_en/ro, audioStatus_en/ro, audioGeneratedAt_en/ro) on books.pages and bookVersions.snapshot.pages

provides:
  - audioJobs table in convex/schema.ts tracking per-page TTS generation jobs
  - Indexes by_status, by_book_locale, by_batch for efficient job queue queries
  - Full lifecycle status tracking (pending -> generating -> done | failed)

affects:
  - phase 03 (generation pipeline) — audioJobs is the core job queue table
  - phase 02 (admin UI) — may display job status

tech-stack:
  added: []
  patterns:
    - "Job queue pattern: references embedded page by bookId + pageIndex (zero-based), not a standalone document ID"
    - "Convex optional field indexing: batchId is optional but used as index field — Convex allows this"

key-files:
  created: []
  modified:
    - convex/schema.ts

key-decisions:
  - "audioJobs references pages via bookId + pageIndex (not a standalone page ID) because pages are embedded in books documents"
  - "locale field limited to en|ro only — Italian audio excluded from v1 scope"
  - "batchId is optional string (not a Convex ID) to allow external batch identifiers from scheduler"
  - "textHash stores SHA-256 of page text at generation time — enables cache invalidation when text changes"

patterns-established:
  - "AUDIO GENERATION section: inserted between CONTENT and LEGACY STORIES sections in schema.ts"

requirements-completed: [GEN-02]

duration: 8min
completed: 2026-03-27
---

# Phase 1 Plan 02: audioJobs Table Summary

**Convex audioJobs table with per-page TTS job tracking, locale-scoped (en|ro), status lifecycle, and three indexes enabling efficient pipeline queries**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-27T20:00:00Z
- **Completed:** 2026-03-27T20:08:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Added `audioJobs` table to `convex/schema.ts` with all required and optional fields
- Three indexes created and confirmed by Convex: `by_status`, `by_book_locale`, `by_batch`
- `npx convex dev --once` exited 0 — schema is live in Convex deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Identify insertion point** — read-only orientation, no commit needed
2. **Task 2: Insert audioJobs table** — `c62ed03` (feat)
3. **Task 3: Run convex dev --once** — validated in Task 2 commit (no separate code change)

**Plan metadata:** pending final docs commit (docs)

## Files Created/Modified

- `convex/schema.ts` — added audioJobs table definition (25 lines inserted between auditLog and LEGACY STORIES sections)

## Decisions Made

- Pages are embedded in `books` — `audioJobs` references by `bookId` + `pageIndex` (zero-based), not by a standalone page ID
- `locale` is `en | ro` only, matching v1 language scope from STATE.md key decisions
- `batchId` is `v.optional(v.string())` — allows external scheduler batch IDs without requiring Convex document IDs
- `textHash` field included so Phase 3 pipeline can detect stale audio when text is edited

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `audioJobs` table is live in Convex with all required fields and indexes
- Phase 3 (generation pipeline) can now insert jobs with `status: "pending"` and query by `by_status` index
- Phase 2 (admin UI) can query `by_book_locale` to display per-book audio generation progress

---
*Phase: 01-data-model*
*Completed: 2026-03-27*
