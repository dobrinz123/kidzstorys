---
phase: 03-generation-pipeline
plan: 02
subsystem: audio-generation
tags: [convex, internalAction, cron, queue, retry, batch-processing]
dependency_graph:
  requires:
    - 03-01
  provides: [getPendingJobs, requeueJob, incrementBatchCompleted, incrementBatchFailed, processAudioQueue]
  affects: [convex/audio.ts, convex/crons.ts]
tech_stack:
  added: []
  patterns: [cron-driven-queue-processor, retry-with-ceiling, batch-finalization-with-partial-failure]
key_files:
  created: []
  modified: [convex/audio.ts, convex/crons.ts]
key_decisions:
  - "Batch status 'completed' if any job succeeded, 'failed' only if ALL jobs permanently failed"
  - "retryCount >= 3 check in both requeueJob (no-op guard) and processAudioQueue (batch counter trigger)"
patterns-established:
  - "internalAction queue processor: fetch jobs via ctx.runQuery, process via ctx.runAction, update via ctx.runMutation"
  - "Cron interval pattern: crons.interval for periodic background processing"
requirements-completed: [GEN-05, GEN-06]
metrics:
  duration: 129s
  completed: "2026-03-27T19:40:21Z"
  tasks: 2
  files_modified: 2
---

# Phase 03 Plan 02: Queue Processor and Cron Summary

**Cron-driven audio queue processor with 3-retry ceiling and partial-failure-aware batch finalization**

## Performance

- **Duration:** 129s
- **Started:** 2026-03-27T19:38:12Z
- **Completed:** 2026-03-27T19:40:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 5 new exports added to convex/audio.ts (exports 9-13), completing the generation pipeline
- processAudioQueue internalAction picks up to 5 pending jobs every 30s via cron
- Retry logic: failed jobs reset to "pending" up to 3 times, then permanently failed
- Batch finalization: "completed" for partial success, "failed" only when ALL jobs fail

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 4 DB helpers + processAudioQueue internalAction** - `2e2ffb1` (feat)
2. **Task 2: Add crons.interval entry for processAudioQueue** - `2ae3456` (feat)

## Files Modified

| File | Changes |
|------|---------|
| convex/audio.ts | Added 5 new exports: getPendingJobs, requeueJob, incrementBatchCompleted, incrementBatchFailed, processAudioQueue (129 lines) |
| convex/crons.ts | Added crons.interval("process audio queue", { seconds: 30 }) entry (9 lines) |

## What Was Built

### Export 9: getPendingJobs (internalQuery)
- **Signature:** `getPendingJobs({}) => audioJobs[]`
- Uses `by_status` index with `status="pending"`, `.take(5)`
- Bridge for processAudioQueue (actions cannot call ctx.db)

### Export 10: requeueJob (internalMutation)
- **Signature:** `requeueJob({ jobId: Id<"audioJobs"> }) => void`
- If `retryCount < 3`: sets `status="pending"`, increments `retryCount`
- If `retryCount >= 3`: no-op (job stays "failed" from markFailed)

### Export 11: incrementBatchCompleted (internalMutation)
- **Signature:** `incrementBatchCompleted({ batchId: string }) => void`
- Patches `completedJobs + 1` on the batch
- When `completedJobs + failedJobs >= totalJobs`: sets status to "completed", records `completedAt`

### Export 12: incrementBatchFailed (internalMutation)
- **Signature:** `incrementBatchFailed({ batchId: string }) => void`
- Patches `failedJobs + 1` on the batch
- When all settled: "failed" if ALL jobs failed, "completed" if any succeeded

### Export 13: processAudioQueue (internalAction)
- **Signature:** `processAudioQueue({}) => void`
- Fetches pending jobs via `ctx.runQuery(internal.audio.getPendingJobs)`
- Processes sequentially in for-loop (not parallel)
- On success: calls `incrementBatchCompleted` if job has batchId
- On failure: calls `requeueJob` (resets or no-ops based on retryCount); if `retryCount >= 3` and has batchId, calls `incrementBatchFailed`

### Cron Entry
- `crons.interval("process audio queue", { seconds: 30 }, internal.audio.processAudioQueue)`
- Idle ticks (0 pending jobs) return immediately after single DB query

## Retry State Machine

```
attempt 1: retryCount=0 -> fail -> requeueJob sets retryCount=1, status="pending"
attempt 2: retryCount=1 -> fail -> requeueJob sets retryCount=2, status="pending"
attempt 3: retryCount=2 -> fail -> requeueJob sets retryCount=3, status="pending"
attempt 4: retryCount=3 -> fail -> requeueJob is no-op -> permanently "failed"
                                -> incrementBatchFailed called
```

## Decisions Made

- Batch finalization uses "completed" for partial failures (at least one job succeeded), "failed" only when ALL jobs permanently failed -- follows CONTEXT.md "Claude's Discretion" guidance
- retryCount >= 3 guard exists in both requeueJob (defensive) and processAudioQueue catch block (batch counter trigger)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functions are fully implemented with real database operations.

## Verification Results

1. TypeScript: No new errors (pre-existing `internal.audio` type generation issue unrelated)
2. All 13 exports confirmed in convex/audio.ts
3. processAudioQueue confirmed as `internalAction` (not mutation)
4. Cron entry "process audio queue" present in convex/crons.ts
5. 30-second interval confirmed
6. ctx.runAction used for generatePageAudio call
7. retryCount >= 3 guard present in both requeueJob and processAudioQueue

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Generation pipeline is now fully self-driving: startAudioBatch creates jobs, processAudioQueue processes them every 30s
- Ready for Phase 4 (admin UI) to wire up startAudioBatch and getGenerationProgress to the dashboard
- ElevenLabs env vars (ELEVENLABS_API_KEY, voice IDs) must be set in Convex dashboard before pipeline produces audio

## Self-Check: PASSED

- convex/audio.ts: FOUND
- convex/crons.ts: FOUND
- 03-02-SUMMARY.md: FOUND
- Commit 2e2ffb1: FOUND
- Commit 2ae3456: FOUND

---
*Phase: 03-generation-pipeline*
*Completed: 2026-03-27*
