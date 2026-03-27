---
phase: 3
name: Generation Pipeline
gathered: 2026-03-27
status: Ready for planning
---

# Phase 3: Generation Pipeline - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the audio generation pipeline:
1. `startAudioBatch(bookId)` mutation — creates `audioJobs` records for all pages × {EN, RO} that are missing audio, creates/updates an `audioGenBatches` record to track the batch
2. `processAudioQueue` internalAction — runs every 30s via cron, picks up to 5 pending jobs sequentially, calls `generatePageAudio` (Phase 2) for each, updates batch progress counters
3. `getGenerationProgress(batchId)` query — returns X/Y counts and batch status for admin UI
4. Retry logic — failed jobs with retryCount < 3 are reset to "pending" for the next run; after 3 failures, status stays "failed"

Admin can trigger per-book generation (ADMIN-01) and bulk generation across all books (ADMIN-02) by calling `startAudioBatch` per book. This phase does NOT include the admin UI — only the backend mutations, actions, and queries.

</domain>

<decisions>
## Implementation Decisions

### Scheduler Design
- **D-01:** Always-on cron — add `crons.interval("process audio queue", { seconds: 30 }, internal.audio.processAudioQueue)` to `convex/crons.ts`. Runs every 30s regardless of whether jobs exist. Idle ticks are cheap (single DB query returning 0 rows).

### Throughput
- **D-02:** 5 jobs sequentially per 30s run. Pick up to 5 `pending` jobs from `audioJobs`, call `generatePageAudio` one at a time in a for-loop. 5 × 30s ≈ 10 jobs/min — well within ElevenLabs ≤100/min limit. Fits within Convex action timeout (~25s for 5 jobs at ~5s each).

### Retry Policy
- **D-03:** Failed jobs reset to `"pending"` immediately. When `generatePageAudio` throws, the catch in `processAudioQueue` should:
  - If `retryCount < 3`: patch the audioJob to `status: "pending"`, increment `retryCount`
  - If `retryCount >= 3`: leave status as `"failed"` (markFailed already wrote it)
  - The next 30s tick naturally picks up re-queued jobs.

### Batch Scope
- **D-04:** `startAudioBatch` takes a `bookId` — generates jobs for ALL pages of that book in BOTH EN and RO. Only creates jobs for pages where `audioStatus_{locale}` is not `"done"` (skip already-generated pages). Bulk generation (ADMIN-02) is implemented by calling `startAudioBatch` for each published book in a loop.

### Batch Status Tracking
- **D-05:** `audioGenBatches` record tracks `totalJobs`, `completedJobs`, `failedJobs`. After each job completes or permanently fails, `processAudioQueue` patches the batch counters. When `completedJobs + failedJobs === totalJobs`, set batch `status` to `"completed"` (if failedJobs === 0) or `"failed"` (if all failed) or `"completed"` (partial — some failed jobs are acceptable for a "done" batch).

### File placement
- **D-06:** New functions go in `convex/audio.ts` (extending Phase 2's file). `processAudioQueue` and `startAudioBatch` and `getGenerationProgress` are added to the same file. Cron entry goes in `convex/crons.ts`.

### Claude's Discretion
- Exact batch status logic when some jobs fail but not all — "completed" vs "failed" for partial batches. Recommend: batch is "completed" if any job succeeded, "failed" only if ALL jobs permanently failed.
- Whether to use `by_status` index or `by_batch` index to fetch pending jobs — use `by_status` for the global queue picker (status = "pending"), `by_batch` for progress queries.
- `startAudioBatch` idempotency — if called twice for the same book, don't duplicate jobs for already-done pages (check `audioStatus_{locale} !== "done"`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 output (base to extend)
- `convex/audio.ts` — `generatePageAudio` internalAction already built; Phase 3 adds to this file
- `.planning/phases/02-tts-integration/02-01-SUMMARY.md` — exact function signatures

### Schema (Phase 1 output)
- `convex/schema.ts` — `audioJobs` table (by_status, by_book_locale, by_batch indexes), `audioGenBatches` table (by_batchId, by_status indexes), `books.pages` audio fields

### Existing patterns to follow
- `convex/crons.ts` — `cronJobs()` + `crons.daily()` pattern; add `crons.interval()` similarly
- `convex/maintenance.ts` — `internalMutation` batch processing loop pattern (`.take(N)`, for-loop)

### Requirements
- `.planning/REQUIREMENTS.md` — GEN-05, GEN-06, ADMIN-01, ADMIN-02, ADMIN-06

</canonical_refs>

<specifics>
## Specific Constraints

- ElevenLabs ≤100 req/min → max 5 sequential jobs per 30s tick stays well within limit
- `processAudioQueue` must be `internalAction` (not public, not a mutation — it calls `generatePageAudio` which is an action)
- `startAudioBatch` should be a `mutation` (public — admin dashboard will call it)
- `getGenerationProgress` should be a `query` (public — admin dashboard will read it)
- `batchId` format: `"batch_${Date.now()}"` (string, not Convex ID — matches existing schema)
- Retry ceiling: 3 attempts total (retryCount 0→1→2→3, permanently failed at 3)

</specifics>

<deferred>
## Deferred Ideas

- Per-locale batch triggering (EN only or RO only) — D-04 chose always both; add locale selection in a future iteration if needed
- Exponential backoff for retries — D-03 chose immediate reset; backoff can be added later if retry storms become a problem
- Admin UI for triggering and monitoring — Phase 4 (ADMIN-03, ADMIN-04, ADMIN-05)
- Pause/resume batch — ADMIN schema has "paused" status but UI to trigger it is Phase 4

</deferred>

---
*Phase: 03-generation-pipeline*
*Context gathered: 2026-03-27 via discuss-phase*
