# Phase 3: Generation Pipeline - Research

**Researched:** 2026-03-27
**Domain:** Convex cron scheduling, internalAction queue processing, batch job management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Always-on cron — `crons.interval("process audio queue", { seconds: 30 }, internal.audio.processAudioQueue)` added to `convex/crons.ts`. Runs every 30s regardless of whether jobs exist. Idle ticks are cheap.
- **D-02:** 5 jobs sequentially per 30s run. Pick up to 5 `pending` jobs from `audioJobs`, call `generatePageAudio` one at a time in a for-loop.
- **D-03:** Failed jobs reset to `"pending"` immediately. If `retryCount < 3`: patch to `status: "pending"`, increment `retryCount`. If `retryCount >= 3`: leave as `"failed"`.
- **D-04:** `startAudioBatch(bookId)` — per-book, generates jobs for all pages × {EN, RO} where `audioStatus_{locale}` is not `"done"`.
- **D-05:** `audioGenBatches` tracks `totalJobs`, `completedJobs`, `failedJobs`. Batch `status` → `"completed"` or `"failed"` when `completedJobs + failedJobs === totalJobs`.
- **D-06:** New functions go in `convex/audio.ts`. Cron entry goes in `convex/crons.ts`.

### Claude's Discretion

- Exact batch status logic for partial failures — recommend: `"completed"` if any job succeeded, `"failed"` only if ALL jobs permanently failed.
- Whether to use `by_status` or `by_batch` index to fetch pending jobs — use `by_status` for queue picker, `by_batch` for progress queries.
- `startAudioBatch` idempotency — check `audioStatus_{locale} !== "done"` to skip already-completed pages.

### Deferred Ideas (OUT OF SCOPE)

- Per-locale batch triggering (EN only or RO only)
- Exponential backoff for retries
- Admin UI for triggering and monitoring (Phase 4)
- Pause/resume batch
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GEN-05 | Generation respects ElevenLabs API rate limits (≤100 req/min) | D-02: 5 sequential jobs per 30s = 10/min, well within limit; sequential for-loop in internalAction verified safe |
| GEN-06 | Failed generation jobs are retried automatically up to 3 times | D-03 retry logic: retryCount < 3 → reset to "pending"; ≥ 3 → permanent "failed"; implemented in processAudioQueue catch block |
| ADMIN-01 | Admin can trigger audio generation for a specific book | `startAudioBatch(bookId)` public mutation; admin dashboard calls it per book |
| ADMIN-02 | Admin can trigger bulk generation for all books with missing audio | Bulk = call `startAudioBatch` once per published book; no new function needed |
| ADMIN-06 | Admin dashboard shows overall progress (X/Y pages done with progress bar) | `getGenerationProgress(batchId)` query returns `completedJobs`, `totalJobs`, `failedJobs` from `audioGenBatches` |
</phase_requirements>

---

## Summary

Phase 3 builds on the `generatePageAudio` internalAction from Phase 2 by adding a Convex cron-driven queue processor, a public mutation for batch creation, and a progress query. All new code extends `convex/audio.ts`.

The critical architectural question — whether `processAudioQueue` should be an `internalAction` or `internalMutation` — is definitively answered: **it must be `internalAction`**. The reason is that it needs to call `generatePageAudio` (which is itself an `internalAction`), and mutations cannot call actions. The existing project pattern in `convex/crons.ts` uses `internalMutation` for maintenance tasks, but those tasks only perform DB operations. `processAudioQueue` must orchestrate action calls, so it cannot be a mutation.

The `crons.interval()` API confirmed via official Convex source code supports `{ seconds: 30 }` and accepts `internalAction` as its function reference — this is exactly the locked decision D-01. Convex actions have a 10-minute timeout ceiling, so 5 sequential ElevenLabs calls (~5s each = ~25s) is safe.

**Primary recommendation:** `processAudioQueue` is `internalAction`. It calls `ctx.runAction(internal.audio.generatePageAudio, ...)` sequentially in a for-loop. Counter updates after each job use `ctx.runMutation` on dedicated `internalMutation` helpers — same delegation pattern already established in Phase 2.

---

## Standard Stack

### Core (already installed — no new dependencies required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.16.0 | Convex runtime, crons, DB, actions | Already in use |
| vitest | ^4.1.2 | Unit testing | Already configured in convex/ |
| convex-test | ^0.0.44 | In-process Convex test environment | Already installed, patterns established |
| @edge-runtime/vm | ^5.0.0 | Required by vitest edge-runtime env | Already installed |

No new packages needed. Phase 3 is purely additive Convex backend code.

---

## Architecture Patterns

### Pattern 1: crons.interval() with internalAction (CONFIRMED)

**What:** `crons.interval()` accepts `{ seconds: N }` and can reference an `internalAction` directly. This is confirmed by the official Convex source and examples showing `{ seconds: 1 }` with `internalAction`.

**Exact syntax for D-01:**
```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ... existing daily/monthly crons ...

crons.interval(
  "process audio queue",
  { seconds: 30 },
  internal.audio.processAudioQueue
);

export default crons;
```

**Confidence:** HIGH — confirmed via WebSearch result citing official get-convex/convex-js source showing `{ seconds: 1 }` with `internalAction`.

### Pattern 2: processAudioQueue as internalAction (CRITICAL DECISION)

**What:** `processAudioQueue` MUST be `internalAction`, not `internalMutation`.

**Why internalAction (not internalMutation):**
- `generatePageAudio` is an `internalAction`
- Mutations cannot call actions — this is a hard Convex constraint
- The cron-triggered function needs to call `ctx.runAction(internal.audio.generatePageAudio, ...)` 5 times sequentially
- Only actions have `ctx.runAction` in their context

**Why not public action:**
- Cron jobs can only reference internal functions
- No reason to expose this to clients

**Confirmed pattern — processAudioQueue structure:**
```typescript
// convex/audio.ts
export const processAudioQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    // 1. Fetch up to 5 pending jobs via internalMutation/internalQuery helper
    const jobs = await ctx.runQuery(internal.audio.getPendingJobs, { limit: 5 });

    for (const job of jobs) {
      try {
        // 2. Call generatePageAudio (internalAction) sequentially
        await ctx.runAction(internal.audio.generatePageAudio, {
          jobId: job._id,
          bookId: job.bookId,
          pageIndex: job.pageIndex,
          locale: job.locale,
        });
        // 3. On success: increment completedJobs counter
        if (job.batchId) {
          await ctx.runMutation(internal.audio.incrementBatchCompleted, {
            batchId: job.batchId,
          });
        }
      } catch (error) {
        // 4. generatePageAudio already called markFailed internally
        //    Now handle retry logic
        const retryCount = job.retryCount;
        if (retryCount < 3) {
          await ctx.runMutation(internal.audio.requeueJob, {
            jobId: job._id,
            newRetryCount: retryCount + 1,
          });
        }
        // else: job stays "failed" — markFailed was called by generatePageAudio
        if (job.batchId) {
          await ctx.runMutation(internal.audio.incrementBatchFailed, {
            batchId: job.batchId,
          });
        }
      }
    }
  },
});
```

**Note on ctx.runAction from internalAction:** Convex documentation notes that `ctx.runAction` should ideally be used for crossing JS runtimes, and that calling it incurs overhead (parent freezes while child executes, uses extra function slots). However, in this case it is the correct approach because `generatePageAudio` is necessarily an `internalAction` (it makes HTTP calls to ElevenLabs), and the queue processor must invoke it. The overhead is acceptable here given the sequential design and low throughput (5 jobs/tick).

### Pattern 3: DB Helpers for Action Context (Established in Phase 2)

Since `processAudioQueue` is an `internalAction`, it cannot call `ctx.db` directly. All DB operations must go through `ctx.runQuery` / `ctx.runMutation`.

**New helpers needed in audio.ts:**

```typescript
// internalQuery — fetch pending jobs
export const getPendingJobs = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("audioJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(args.limit);
  },
});

// internalMutation — requeue a failed job for retry
export const requeueJob = internalMutation({
  args: {
    jobId: v.id("audioJobs"),
    newRetryCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "pending",
      retryCount: args.newRetryCount,
      errorMessage: undefined,  // clear previous error
    });
  },
});

// internalMutation — increment batch completedJobs counter
export const incrementBatchCompleted = internalMutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("audioGenBatches")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .first();
    if (!batch) return;
    const completedJobs = batch.completedJobs + 1;
    const patch: Record<string, unknown> = { completedJobs };
    if (completedJobs + batch.failedJobs >= batch.totalJobs) {
      // Partial completion: "completed" unless ALL failed
      const allFailed = batch.failedJobs >= batch.totalJobs;
      patch.status = allFailed ? "failed" : "completed";
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(batch._id, patch);
  },
});

// internalMutation — increment batch failedJobs counter
export const incrementBatchFailed = internalMutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("audioGenBatches")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .first();
    if (!batch) return;
    const failedJobs = batch.failedJobs + 1;
    const patch: Record<string, unknown> = { failedJobs };
    if (batch.completedJobs + failedJobs >= batch.totalJobs) {
      const allFailed = failedJobs >= batch.totalJobs;
      patch.status = allFailed ? "failed" : "completed";
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(batch._id, patch);
  },
});
```

### Pattern 4: startAudioBatch Public Mutation

**What:** Creates `audioJobs` records for all pages × locales where audio is not already `"done"`, then creates an `audioGenBatches` record.

**Convex bulk insert capacity:** Mutations can write up to **16,000 documents per transaction** and 16 MiB of data per transaction. A 100-page book × 2 locales = 200 inserts — well within limits. No batching needed.

**Idempotency approach:** Before inserting a job, check `audioStatus_{locale}` on the page in `books.pages`. If it is `"done"`, skip. This avoids re-generating already completed audio and works without querying `audioJobs` at all (page status is the ground truth).

**Alternative approach using `by_book_locale` index:** Could query existing `audioJobs` records, but the page status check is simpler and more reliable (job records may be stale if manually cleaned up).

```typescript
// convex/audio.ts
export const startAudioBatch = mutation({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) throw new Error(`Book not found: ${args.bookId}`);

    const batchId = `batch_${Date.now()}`;
    const locales: Array<"en" | "ro"> = ["en", "ro"];
    const now = Date.now();
    let totalJobs = 0;

    for (const page of book.pages) {
      const pageIndex = book.pages.indexOf(page);
      for (const locale of locales) {
        const statusKey = `audioStatus_${locale}` as "audioStatus_en" | "audioStatus_ro";
        if (page[statusKey] === "done") continue; // skip already generated

        await ctx.db.insert("audioJobs", {
          bookId: args.bookId,
          pageIndex,
          locale,
          status: "pending",
          retryCount: 0,
          batchId,
          createdAt: now,
        });
        totalJobs++;
      }
    }

    if (totalJobs === 0) {
      // All audio already generated — return a sentinel
      return { batchId: null, totalJobs: 0 };
    }

    await ctx.db.insert("audioGenBatches", {
      batchId,
      locales: ["en", "ro"],
      status: "queued",
      totalJobs,
      completedJobs: 0,
      failedJobs: 0,
      createdAt: now,
    });

    return { batchId, totalJobs };
  },
});
```

**Note:** `book.pages.indexOf(page)` is O(n²) for large page arrays. Prefer `book.pages.forEach((page, pageIndex) => {...})` for correct zero-based index. The planner should use `forEach` or a `for (let i = 0; i < book.pages.length; i++)` loop.

### Pattern 5: getGenerationProgress Public Query

**Simple query — returns all fields the admin UI needs:**

```typescript
// convex/audio.ts
export const getGenerationProgress = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("audioGenBatches")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .first();
    return batch ?? null;
  },
});
```

Returns: `{ batchId, status, totalJobs, completedJobs, failedJobs, createdAt, completedAt }` — all fields from `audioGenBatches`. The admin UI derives `percentage = completedJobs / totalJobs * 100` and the progress bar.

### Pattern 6: Retry Counter Gotcha — retryCount Semantics

The `markFailed` mutation in Phase 2 writes `status: "failed"` but does **not** increment `retryCount`. The `retryCount` field starts at 0 on job creation and is incremented by `processAudioQueue`'s catch block via `requeueJob`.

Retry lifecycle:
```
Job created: status="pending", retryCount=0
Attempt 1: generatePageAudio throws → processAudioQueue catches → retryCount < 3 → requeueJob({ retryCount: 1 })
Next tick:  status="pending", retryCount=1
Attempt 2: generatePageAudio throws → processAudioQueue catches → retryCount < 3 → requeueJob({ retryCount: 2 })
Next tick:  status="pending", retryCount=2
Attempt 3: generatePageAudio throws → processAudioQueue catches → retryCount >= 3 → no requeue → job stays "failed"
```

Total: 3 attempts (retryCount 0, 1, 2 — the throw when retryCount=2 causes the check `retryCount < 3` to be false, so it does NOT requeue). This matches GEN-06: "retried automatically up to 3 times."

**Clarification on the check:** `retryCount` in `processAudioQueue`'s catch refers to the job's `retryCount` at the time it was fetched (i.e., before the failed attempt). So:
- Fetched `retryCount=0`, fails → requeue with `retryCount=1` (this was attempt 1)
- Fetched `retryCount=1`, fails → requeue with `retryCount=2` (this was attempt 2)
- Fetched `retryCount=2`, fails → `retryCount >= 3`? NO — 2 < 3 — requeue with `retryCount=3` (this was attempt 3)
- Fetched `retryCount=3`, fails → `retryCount >= 3`? YES — stays failed (this was attempt 4, which is over the limit)

**Correction:** To get exactly 3 attempts total, the condition should be `retryCount >= 2` (not `retryCount >= 3`), OR the CONTEXT.md means "3 retries after initial = 4 total." The CONTEXT.md says "retryCount 0→1→2→3, permanently failed at 3" — meaning the job is permanently failed after 3 retry increments, which implies 4 total attempts (1 initial + 3 retries). This matches the "retried up to 3 times" language in GEN-06.

**Recommendation for planner:** Use `if (retryCount < 3)` to requeue, which means jobs get requeued when retryCount is 0, 1, or 2 — then permanently fail at retryCount 3. Total attempts = 4 (initial + 3 retries). This is consistent with CONTEXT.md's "retryCount 0→1→2→3, permanently failed at 3."

### Anti-Patterns to Avoid

- **Promise.all for ElevenLabs calls:** D-02 requires sequential. Concurrent calls could burst the rate limit. Do not use `Promise.all` over the jobs array.
- **Incrementing batch counters inside generatePageAudio:** The `generatePageAudio` action does not know which batch it belongs to. Counter updates belong in `processAudioQueue` which has the batch context.
- **ctx.db inside processAudioQueue:** processAudioQueue is an `internalAction` — it has no `ctx.db`. All DB access must go through `ctx.runQuery` / `ctx.runMutation`.
- **Querying audioJobs by `by_book_locale` index for idempotency:** The page's own `audioStatus_{locale}` field is the canonical source of truth. Use it in `startAudioBatch`.
- **`book.pages.indexOf(page)` for pageIndex:** Use `forEach` with index or `for` loop instead. `indexOf` on an object array does reference equality, which works for array elements accessed by direct reference, but a named index variable is clearer and avoids subtle bugs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled job execution | Custom polling loop / setTimeout | `crons.interval()` in convex/crons.ts | Convex manages execution guarantees, retries, observability |
| Batch counter atomicity | Application-level locking | Convex mutation (single transaction per call) | Mutations are serialized per document — no race condition between `incrementBatchCompleted` calls |
| Queue deduplication | Complex lock/claim pattern | Simple index query with status filter | `by_status` index is sufficient; Convex serializes mutations so double-pick is prevented at the mutation level |

**Key insight:** Convex mutations run in serialized transactions per document. Two cron ticks cannot run simultaneously (Convex cron guarantee: at most one run executing at a time per job), so there is no double-processing risk from the cron itself.

---

## Common Pitfalls

### Pitfall 1: processAudioQueue as internalMutation (Fatal)

**What goes wrong:** If implemented as `internalMutation`, it cannot call `ctx.runAction(internal.audio.generatePageAudio, ...)` — mutations do not have `runAction` in their context. This would cause a TypeScript compile error or runtime error.

**Why it happens:** The existing `convex/crons.ts` uses `internalMutation` for all cron targets (maintenance functions). A developer might follow that pattern.

**How to avoid:** `processAudioQueue` MUST be `internalAction`. The `generatePageAudio` call makes this non-negotiable.

**Warning signs:** TypeScript error `Property 'runAction' does not exist on type 'GenericMutationCtx<...>'`.

### Pitfall 2: Batch Counter Race Condition (Non-issue, but worth documenting)

**What goes wrong:** Two separate `processAudioQueue` ticks running simultaneously could increment counters concurrently, potentially double-counting.

**Why it does NOT happen in Convex:** Convex guarantees "at most one run of each cron job can be executing at any moment." If a tick takes longer than 30s, the next tick is skipped. So there is never concurrent execution of `processAudioQueue`.

**Additionally:** Even if multiple queue processors ran (e.g., different batch jobs), each `incrementBatchCompleted` call is a separate mutation that reads-then-writes atomically (Convex OCC). Two concurrent increments from 5→6 would both read 5, one would win, the other would retry — end result is 6, not 5. Counter increments are safe.

### Pitfall 3: startAudioBatch Called Twice for Same Book (Idempotency)

**What goes wrong:** Calling `startAudioBatch` twice for the same book creates duplicate `audioJobs` for in-progress pages (those in `"pending"` or `"generating"` status). They would generate audio twice, wasting API calls.

**Why it happens:** The idempotency check only skips `"done"` pages. Pages currently being generated have `audioStatus_{locale}` = `"generating"`, not `"done"`, so a second call creates duplicate jobs.

**How to avoid:** Per D-04, skip `audioStatus_{locale} === "done"` only. Pages with status `"pending"` or `"generating"` will be skipped by the queue processor anyway (they already have jobs). The second call creates extra jobs for them, but the next `processAudioQueue` tick will pick up whatever is at the top of the `by_status` index — no fundamental correctness issue, just wasted ElevenLabs calls.

**Recommendation:** Optionally also skip `audioStatus_{locale} === "pending"` or `"generating"` in `startAudioBatch` to be fully idempotent. This is under Claude's Discretion.

### Pitfall 4: batchId Missing from Existing Pending Jobs

**What goes wrong:** If there are `audioJobs` with `status: "pending"` but `batchId: undefined` (e.g., jobs created manually or by a prior system), `processAudioQueue` picks them up but cannot update batch counters (no `batchId` to look up).

**How to avoid:** The counter update code must guard with `if (job.batchId)` before calling `incrementBatchCompleted`/`incrementBatchFailed`. This is already reflected in the code examples above.

### Pitfall 5: generatePageAudio Throws But retryCount Not Incremented Correctly

**What goes wrong:** `generatePageAudio` calls `markFailed` internally when it catches an error. `markFailed` does NOT increment `retryCount`. If `processAudioQueue` does not re-read the job's current `retryCount` before deciding to requeue, it might always see the initial value.

**How it works correctly:** `processAudioQueue` fetches jobs via `getPendingJobs` BEFORE calling `generatePageAudio`. The `retryCount` at that point is the current count (e.g., 1 if this is the second attempt). After `generatePageAudio` throws, the catch block uses `job.retryCount` (the value from before the attempt) to decide whether to requeue with `retryCount + 1`.

**Timing:** `markFailed` is called inside `generatePageAudio` BEFORE the throw propagates to `processAudioQueue`. So by the time `requeueJob` runs, the job is already in `"failed"` state with `retryCount` unchanged. `requeueJob` then patches it back to `"pending"` with `retryCount + 1`. This is correct.

---

## Code Examples

### crons.interval() with internalAction (verified from official Convex source)

```typescript
// Source: WebSearch result citing get-convex/convex-js source code
// Confirmed: { seconds: N } accepted by crons.interval(), internalAction is valid target

crons.interval(
  "process audio queue",
  { seconds: 30 },
  internal.audio.processAudioQueue   // internalAction — confirmed valid
);
```

### Queue Processor Skeleton

```typescript
// convex/audio.ts — processAudioQueue (internalAction)
export const processAudioQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.runQuery(internal.audio.getPendingJobs, { limit: 5 });

    for (const job of jobs) {
      try {
        await ctx.runAction(internal.audio.generatePageAudio, {
          jobId: job._id,
          bookId: job.bookId,
          pageIndex: job.pageIndex,
          locale: job.locale,
        });
        if (job.batchId) {
          await ctx.runMutation(internal.audio.incrementBatchCompleted, { batchId: job.batchId });
        }
      } catch {
        // generatePageAudio already called markFailed internally
        if (job.retryCount < 3) {
          await ctx.runMutation(internal.audio.requeueJob, {
            jobId: job._id,
            newRetryCount: job.retryCount + 1,
          });
        }
        // If retryCount >= 3: job stays "failed" as markFailed already wrote it
        if (job.batchId) {
          await ctx.runMutation(internal.audio.incrementBatchFailed, { batchId: job.batchId });
        }
      }
    }
  },
});
```

### startAudioBatch Skeleton

```typescript
// convex/audio.ts — startAudioBatch (public mutation)
export const startAudioBatch = mutation({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) throw new Error(`Book not found: ${args.bookId}`);

    const batchId = `batch_${Date.now()}`;
    const locales: Array<"en" | "ro"> = ["en", "ro"];
    const now = Date.now();
    let totalJobs = 0;

    book.pages.forEach((page, pageIndex) => {
      // forEach used (not indexOf) to get correct zero-based pageIndex
    });

    // ... insert audioJobs, insert audioGenBatches, return { batchId, totalJobs }
  },
});
```

### Test Pattern for internalAction (from Phase 2 — reuse directly)

```typescript
// convex/audio.test.ts — Phase 3 additions follow same convex-test pattern
const t = convexTest(schema, import.meta.glob("./**/*.ts"));

// Seed data via t.run (mutation context)
const { batchId, jobId } = await t.run(async (ctx) => {
  // ... insert books, audioJobs, audioGenBatches
});

// Invoke processAudioQueue (internalAction)
await t.action(internal.audio.processAudioQueue, {});

// Verify state via t.run
const job = await t.run(async (ctx) => ctx.db.get(jobId));
expect(job?.status).toBe("done");
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `crons.daily()` / `crons.monthly()` for maintenance | `crons.interval({ seconds: 30 })` for high-frequency queue processing | Convex has always supported this; project adds it for Phase 3 | 30s granularity for queue tick |
| Manual polling from client | Server-side cron + DB queue | N/A (project started with this model) | No client polling, no long-lived connections needed |

---

## Open Questions

1. **retryCount at permanently-failed threshold**
   - What we know: CONTEXT.md states "retryCount 0→1→2→3, permanently failed at 3" — 4 total attempts
   - What's unclear: GEN-06 says "retried up to 3 times" — is that 3 retries (4 total) or 3 total?
   - Recommendation: Implement `retryCount >= 3` as the permanent-failure guard (4 total attempts). This is consistent with CONTEXT.md's explicit "permanently failed at 3" statement. GEN-06's "3 times" likely refers to retries (not total attempts).

2. **startAudioBatch when book has zero pages with missing audio**
   - What we know: All pages may already have `audioStatus_{locale} === "done"`
   - What's unclear: Should `startAudioBatch` return an error or silently succeed?
   - Recommendation: Return `{ batchId: null, totalJobs: 0 }` — caller can check `totalJobs` to show "all audio already generated" in the UI.

3. **processAudioQueue interaction with "generating" status jobs**
   - What we know: `generatePageAudio` sets job status to `"generating"` via `markGenerating` before calling ElevenLabs
   - What's unclear: If a previous `processAudioQueue` tick started a job (set to `"generating"`) and the action is still running when the next tick fires 30s later, will the next tick pick it up? No — `getPendingJobs` queries `by_status` for `status = "pending"`. A job in `"generating"` status is not picked up again.
   - Confirmation: This is correct behavior. No double-processing of in-flight jobs.

---

## Environment Availability

> Phase 3 is backend-only Convex code. No external tools beyond the Convex development server are needed.

| Dependency | Required By | Available | Notes |
|------------|-------------|-----------|-------|
| Convex dev server (`npx convex dev`) | Deployment + type generation | Assumed available (used in Phase 2) | Run after adding new exports |
| ElevenLabs API | generatePageAudio (called by queue) | Configured in Convex env vars | Env vars: ELEVENLABS_API_KEY, ELEVENLABS_EN_VOICE_ID, ELEVENLABS_RO_VOICE_ID |
| `npm test` (vitest in convex/) | Unit tests | Available — configured in Phase 2 | Run: `cd convex && npm test` |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 + convex-test 0.0.44 |
| Config file | `convex/vitest.config.ts` |
| Quick run command | `cd convex && npm test` |
| Full suite command | `cd convex && npm test` |

Tests run in ~50ms (no real ElevenLabs calls — fetch is stubbed). All existing tests must continue passing after Phase 3 additions.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-05 | processAudioQueue processes ≤5 jobs per tick | unit | `cd convex && npm test` | ❌ Wave 0 — add to audio.test.ts |
| GEN-06 | Failed job requeued with retryCount+1 when retryCount < 3 | unit | `cd convex && npm test` | ❌ Wave 0 |
| GEN-06 | Failed job stays "failed" when retryCount >= 3 | unit | `cd convex && npm test` | ❌ Wave 0 |
| ADMIN-01 | startAudioBatch creates correct number of audioJobs | unit | `cd convex && npm test` | ❌ Wave 0 |
| ADMIN-01 | startAudioBatch skips pages with audioStatus = "done" | unit | `cd convex && npm test` | ❌ Wave 0 |
| ADMIN-06 | getGenerationProgress returns correct totals | unit | `cd convex && npm test` | ❌ Wave 0 |
| ADMIN-02 | Bulk generation = startAudioBatch per book | manual-only (no test — UI-triggered in Phase 4) | N/A | N/A |

### Sampling Rate

- **Per task commit:** `cd convex && npm test` (runs all tests including Phase 2)
- **Per wave merge:** `cd convex && npm test`
- **Phase gate:** Full suite green + `npx convex dev --once` exits 0 before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `convex/audio.test.ts` — add `describe("processAudioQueue")` block with 3+ tests
- [ ] `convex/audio.test.ts` — add `describe("startAudioBatch")` block with 2+ tests
- [ ] `convex/audio.test.ts` — add `describe("getGenerationProgress")` block with 1 test

*(Existing test infrastructure covers everything — just need new test cases appended to the existing file.)*

---

## Planning Recommendations

1. **processAudioQueue is internalAction — non-negotiable.** It calls `generatePageAudio` (internalAction). Mutations cannot call actions.

2. **Two new internalMutation helpers required for counter updates.** Split `incrementBatchCompleted` and `incrementBatchFailed` into separate mutations so the counter update logic can be called from `processAudioQueue` (action context). Alternatively, a single `updateBatchCounters(batchId, outcome: "success" | "failure")` mutation handles both cases.

3. **One new internalQuery helper required.** `getPendingJobs({ limit: number })` wraps the `by_status` index query so the action can fetch pending jobs without `ctx.db`.

4. **One new internalMutation helper required for retry.** `requeueJob({ jobId, newRetryCount })` patches the job back to `"pending"` status and updates `retryCount`.

5. **startAudioBatch must use `forEach` or indexed `for` loop** — not `indexOf` — to get the correct zero-based `pageIndex` for inserted jobs.

6. **crons.ts change is one line.** Add `crons.interval(...)` before `export default crons`. The existing daily/monthly crons remain unchanged.

7. **Test pattern is already established.** All new tests follow the Phase 2 `t.action(internal.audio.X, args)` pattern. For `processAudioQueue`, mock `fetch` (same as Phase 2) and seed `audioJobs` records with `status: "pending"`.

8. **Convex deployment validation.** After adding new exports, run `npx convex dev --once` to verify TypeScript compiles clean before writing tests.

9. **Function count in audio.ts after Phase 3:**
   - Phase 2: `getPageText`, `markGenerating`, `markDone`, `markFailed`, `generatePageAudio` (5 exports)
   - Phase 3 adds: `getPendingJobs`, `requeueJob`, `incrementBatchCompleted`, `incrementBatchFailed`, `processAudioQueue`, `startAudioBatch`, `getGenerationProgress` (7 new exports)
   - Total: 12 exports in a single file — acceptable per D-06.

---

## Sources

### Primary (HIGH confidence)

- Convex official docs — `https://docs.convex.dev/scheduling/cron-jobs` — crons.interval() API, SchedulableFunctionReference accepts mutations or actions
- Convex official docs — `https://docs.convex.dev/functions/actions` — ctx.runAction caveats, GenericActionCtx API
- Convex official docs — `https://docs.convex.dev/production/state/limits` — action timeout 10 min, mutation write limit 16,000 docs/transaction
- Convex official docs — `https://docs.convex.dev/api/classes/server.Crons` — method signatures for interval(), daily(), etc.
- Project codebase — `convex/audio.ts` — Phase 2 patterns for internalAction with ctx.runQuery/runMutation delegation
- Project codebase — `convex/crons.ts` — existing cronJobs() pattern to extend
- Project codebase — `convex/maintenance.ts` — internalMutation batch loop pattern (.take(N), for-loop)
- Project codebase — `convex/audio.test.ts` — established convex-test patterns for Phase 3 tests

### Secondary (MEDIUM confidence)

- WebSearch citing get-convex/convex-js source — confirmed `{ seconds: 1 }` syntax and `internalAction` as valid cron target
- `https://stack.convex.dev/retry-actions` — Convex component for retrying actions (confirmed ecosystem pattern)

### Tertiary (LOW confidence)

- None — all critical findings confirmed via official docs or source code.

---

## Metadata

**Confidence breakdown:**

- crons.interval() API: HIGH — confirmed via official docs + source code example showing `{ seconds: N }` with `internalAction`
- processAudioQueue must be internalAction: HIGH — confirmed by Convex action/mutation capability constraints (only actions have `ctx.runAction`)
- Mutation bulk insert limits: HIGH — confirmed 16,000 docs/transaction from official limits page
- Action timeout (10 min): HIGH — confirmed from official limits page
- Retry counter semantics: MEDIUM — derived from CONTEXT.md specification; edge case around "3 retries vs 4 total attempts" is a minor ambiguity in requirements language

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (Convex API is stable; crons.interval has been available since early Convex versions)
