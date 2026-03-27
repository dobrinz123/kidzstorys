# Generation Pipeline Research

## Recommended Architecture

A **job-queue pattern** built on Convex tables + scheduled internal actions:

```
Admin UI → startBatch mutation → audioJobs table (pending)
                                        ↓
                    processAudioQueue (scheduled every 30s)
                    ├── Check rate limit bucket
                    ├── Pull N pending jobs
                    ├── Call ElevenLabs API per job
                    ├── Store audio → Convex File Storage
                    ├── Mark job done + store URL
                    └── Update batch progress
```

**Why this approach:** Convex scheduled functions have ~10 min max execution. Processing 5-10 pages per run at ~1-2s/page keeps well within limits while respecting ElevenLabs rate limits.

---

## Admin UI Controls

### Required v1 Controls

1. **Per-book "Generate Audio" button** — on book detail/edit page
   - Shows status: `none` / `pending` / `partial` / `complete` / `failed`
   - "Re-generate" option to force refresh

2. **Bulk generation trigger** — on audio management dashboard page
   - "Generate All Missing Audio" (only processes pages with no audio yet)
   - Language filter: EN only / RO only / Both
   - Estimated cost display before confirming

3. **Progress panel**
   - Overall: X / Y pages done with progress bar
   - Per-language breakdown
   - Est. completion time

4. **Failed jobs list**
   - Book + page + language + error message
   - "Retry" per job or "Retry All Failed"

---

## Convex Schema for Generation Status

```typescript
// Per-page audio job tracking
audioJobs: defineTable({
  bookId: v.id("books"),
  pageIndex: v.number(),
  locale: v.union(v.literal("en"), v.literal("ro")),
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("done"),
    v.literal("failed")
  ),
  audioStorageId: v.optional(v.id("_storage")),
  audioUrl: v.optional(v.string()),
  textHash: v.optional(v.string()),  // hash of text content — detect changes
  errorMessage: v.optional(v.string()),
  retryCount: v.number(),
  batchId: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_status", ["status"])
  .index("by_book_locale", ["bookId", "locale"])
  .index("by_batch", ["batchId", "status"]),

// Batch run tracking
audioGenBatches: defineTable({
  batchId: v.string(),
  locales: v.array(v.union(v.literal("en"), v.literal("ro"))),
  status: v.union(
    v.literal("queued"), v.literal("processing"),
    v.literal("paused"), v.literal("completed"), v.literal("failed")
  ),
  totalJobs: v.number(),
  completedJobs: v.number(),
  failedJobs: v.number(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_status", ["status", "createdAt"]),
```

---

## Generation Queue Pattern

### Trigger (Admin mutation)
```typescript
export const startAudioBatch = mutation({
  args: { bookIds: v.optional(v.array(v.id("books"))), locales: v.array(...) },
  handler: async (ctx, { bookIds, locales }) => {
    const batchId = `batch_${Date.now()}`;
    // 1. Find all pages without audio for given books/locales
    // 2. Insert audioJobs with status: "pending"
    // 3. Insert audioGenBatches record
    // 4. Schedule processAudioQueue to run in 5s
    return batchId;
  }
});
```

### Processor (Scheduled internal action — every 30s)
```typescript
export const processAudioQueue = internalAction({
  handler: async (ctx) => {
    // 1. Pull 5 pending jobs
    const jobs = await ctx.runQuery(internal.audioJobs.getPendingJobs, { limit: 5 });
    if (jobs.length === 0) return;

    for (const job of jobs) {
      // 2. Mark generating
      await ctx.runMutation(internal.audioJobs.markGenerating, { jobId: job._id });

      try {
        // 3. Get page text
        const pageText = await ctx.runQuery(internal.books.getPageText, {
          bookId: job.bookId, pageIndex: job.pageIndex, locale: job.locale
        });

        // 4. Call ElevenLabs
        const audioBuffer = await callElevenLabs(pageText, job.locale);

        // 5. Store in Convex
        const storageId = await ctx.storage.store(
          new Blob([audioBuffer], { type: "audio/mpeg" })
        );
        const url = await ctx.storage.getUrl(storageId);

        // 6. Mark done
        await ctx.runMutation(internal.audioJobs.markDone, {
          jobId: job._id, storageId, url
        });

      } catch (error) {
        await ctx.runMutation(internal.audioJobs.markFailed, {
          jobId: job._id,
          error: error.message,
          retryCount: job.retryCount + 1
        });
      }

      // 7. Rate limit: wait 700ms between calls (≈ 85 calls/min, under 100 limit)
      await new Promise(r => setTimeout(r, 700));
    }

    // 8. Reschedule if more pending
    const remaining = await ctx.runQuery(internal.audioJobs.countPending, {});
    if (remaining > 0) {
      await ctx.scheduler.runAfter(30_000, internal.audio.processAudioQueue, {});
    }
  }
});
```

---

## Error Recovery

| Failure | Auto Recovery | Manual Recovery |
|---------|--------------|-----------------|
| TTS API rate limit | Retry after 60s backoff | Admin can pause/resume |
| TTS API 5xx error | Retry up to 3 times | Admin "Retry Failed" button |
| Network timeout | Retry up to 3 times | Admin "Retry Failed" button |
| Invalid text (too long) | Mark failed with error | Admin edits page text, re-queues |
| Storage full | Mark failed | Admin clears old audio, re-queues |

After 3 retries: job status = `failed`, visible in admin failed queue.

---

## Initial Seeding Estimate

- 500 books × 20 pages × 2 languages = **20,000 jobs**
- ElevenLabs Scale plan: 100 concurrent requests, ~50-100 chars/sec throughput
- At 700ms/page + 30s batch interval: ~**85 pages/min = ~4 hours for 20,000 pages**
- Cost: ~10M chars × $0.30/1K chars = **~$3,000 one-time** (or use Creator plan at lower cost)
- **Recommendation:** Run initial generation during off-peak hours; monitor first batch manually
