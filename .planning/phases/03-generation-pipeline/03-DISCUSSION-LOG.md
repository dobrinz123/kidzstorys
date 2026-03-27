# Phase 3: Generation Pipeline — Discussion Log

**Session:** 2026-03-27
**Conducted via:** /gsd:discuss-phase 3

---

## Area 1: Scheduler Trigger Type

**Question:** How should the audio generation scheduler be triggered?

**Options presented:**
- Always-on cron every 30s — `crons.interval()` entry in `convex/crons.ts`
- Self-rescheduling chain — started by `startAudioBatch`, stops when batch completes

**User selected:** Always-on cron every 30s (recommended)

---

## Area 2: Jobs per Scheduler Run

**Question:** How many jobs should the scheduler process per 30s run, and how?

**Options presented:**
- 5 jobs sequentially per run — for-loop, one at a time
- Parallel batch (Promise.all) — all at once

**User selected:** 5 jobs sequentially per run (recommended)

---

## Area 3: Retry Behavior

**Question:** When a job fails (retryCount < 3), how should it be retried?

**Options presented:**
- Reset to pending immediately — next tick picks it up automatically
- Exponential backoff — `ctx.scheduler.runAfter()` with delay

**User selected:** Reset to pending immediately (recommended)

---

## Area 4: Batch Scope

**Question:** When admin triggers audio generation, what is the scope?

**Options presented:**
- Per-book, both locales — `startAudioBatch(bookId)` creates EN+RO jobs
- All books at once, locale choice — global batch with locale selection

**User selected:** Per-book, both locales (recommended)

---
*Log generated: 2026-03-27*
