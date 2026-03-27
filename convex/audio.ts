import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Export 1 — getPageText (internalQuery)
// ---------------------------------------------------------------------------
export const getPageText = internalQuery({
  args: {
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: v.union(v.literal("en"), v.literal("ro")),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error(`Book not found: ${args.bookId}`);
    }
    const page = book.pages[args.pageIndex];
    if (!page) {
      throw new Error(`Page ${args.pageIndex} not found in book ${args.bookId}`);
    }
    const textKey = `text_${args.locale}` as "text_en" | "text_ro";
    const text = page[textKey];
    if (!text) {
      throw new Error(`Page ${args.pageIndex} has empty text for locale ${args.locale}`);
    }
    return { text };
  },
});

// ---------------------------------------------------------------------------
// Export 2 — markGenerating (internalMutation)
// ---------------------------------------------------------------------------
export const markGenerating = internalMutation({
  args: {
    jobId: v.id("audioJobs"),
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: v.union(v.literal("en"), v.literal("ro")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "generating" });
    const book = await ctx.db.get(args.bookId);
    if (!book) return;
    const pages = [...book.pages];
    const statusKey = `audioStatus_${args.locale}` as "audioStatus_en" | "audioStatus_ro";
    pages[args.pageIndex] = {
      ...pages[args.pageIndex],
      [statusKey]: "generating" as const,
    };
    await ctx.db.patch(args.bookId, { pages });
  },
});

// ---------------------------------------------------------------------------
// Export 3 — markDone (internalMutation)
// ---------------------------------------------------------------------------
export const markDone = internalMutation({
  args: {
    jobId: v.id("audioJobs"),
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: v.union(v.literal("en"), v.literal("ro")),
    storageId: v.id("_storage"),
    audioUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "done",
      audioStorageId: args.storageId,
      audioUrl: args.audioUrl,
      completedAt: now,
    });
    const book = await ctx.db.get(args.bookId);
    if (!book) return;
    const pages = [...book.pages];
    const urlKey = `audioUrl_${args.locale}` as "audioUrl_en" | "audioUrl_ro";
    const storageIdKey = `audioStorageId_${args.locale}` as "audioStorageId_en" | "audioStorageId_ro";
    const statusKey = `audioStatus_${args.locale}` as "audioStatus_en" | "audioStatus_ro";
    const generatedAtKey = `audioGeneratedAt_${args.locale}` as "audioGeneratedAt_en" | "audioGeneratedAt_ro";
    pages[args.pageIndex] = {
      ...pages[args.pageIndex],
      [urlKey]: args.audioUrl,
      [storageIdKey]: args.storageId,
      [statusKey]: "done" as const,
      [generatedAtKey]: now,
    };
    await ctx.db.patch(args.bookId, { pages });
  },
});

// ---------------------------------------------------------------------------
// Export 4 — markFailed (internalMutation)
// ---------------------------------------------------------------------------
export const markFailed = internalMutation({
  args: {
    jobId: v.id("audioJobs"),
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: v.union(v.literal("en"), v.literal("ro")),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
    const book = await ctx.db.get(args.bookId);
    if (!book) return;
    const pages = [...book.pages];
    const statusKey = `audioStatus_${args.locale}` as "audioStatus_en" | "audioStatus_ro";
    pages[args.pageIndex] = {
      ...pages[args.pageIndex],
      [statusKey]: "failed" as const,
    };
    await ctx.db.patch(args.bookId, { pages });
  },
});

// ---------------------------------------------------------------------------
// Export 5 — generatePageAudio (internalAction)
// ---------------------------------------------------------------------------
export const generatePageAudio = internalAction({
  args: {
    jobId: v.id("audioJobs"),
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: v.union(v.literal("en"), v.literal("ro")),
  },
  handler: async (ctx, args) => {
    // 1. Read env vars — fail fast if not configured (per email.ts pattern)
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId =
      args.locale === "en"
        ? process.env.ELEVENLABS_EN_VOICE_ID
        : process.env.ELEVENLABS_RO_VOICE_ID;

    if (!apiKey || !voiceId) {
      const msg = `ElevenLabs env vars not configured for locale: ${args.locale}`;
      await ctx.runMutation(internal.audio.markFailed, { ...args, errorMessage: msg });
      throw new Error(msg);
    }

    try {
      // 2. Read page text from DB (actions cannot call ctx.db directly)
      //    IMPORTANT: inside try/catch so empty-text errors reach markFailed
      const { text } = await ctx.runQuery(internal.audio.getPageText, {
        bookId: args.bookId,
        pageIndex: args.pageIndex,
        locale: args.locale,
      });

      // 3. Mark job + page as "generating"
      await ctx.runMutation(internal.audio.markGenerating, {
        jobId: args.jobId,
        bookId: args.bookId,
        pageIndex: args.pageIndex,
        locale: args.locale,
      });

      // 4. Call ElevenLabs (per D-03, GEN-03, VOICE-01, VOICE-02, VOICE-03)
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          language_code: args.locale,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`);
      }

      // 5. Store MP3 in Convex File Storage (per D-05, GEN-04)
      const audioBlob = await response.blob();
      const mp3Blob = new Blob([audioBlob], { type: "audio/mpeg" });
      const storageId = await ctx.storage.store(mp3Blob);

      const audioUrl = await ctx.storage.getUrl(storageId);
      if (!audioUrl) {
        throw new Error(`ctx.storage.getUrl returned null for storageId: ${storageId}`);
      }

      // 6. Write storageId + URL to page record and job (per D-06)
      await ctx.runMutation(internal.audio.markDone, {
        jobId: args.jobId,
        bookId: args.bookId,
        pageIndex: args.pageIndex,
        locale: args.locale,
        storageId,
        audioUrl,
      });
    } catch (error) {
      // 7. On failure: persist error, throw (D-08 — no retry in this action)
      const errorMessage = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.audio.markFailed, {
        jobId: args.jobId,
        bookId: args.bookId,
        pageIndex: args.pageIndex,
        locale: args.locale,
        errorMessage,
      });
      throw error;
    }
  },
});

// ---------------------------------------------------------------------------
// Export 6 — startAudioBatch (public mutation, per D-04, ADMIN-01)
// Creates audioJobs for all pages x {en, ro} where audioStatus is not "done".
// ---------------------------------------------------------------------------
export const startAudioBatch = mutation({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) throw new Error(`Book not found: ${args.bookId}`);

    const batchId = `batch_${Date.now()}`;
    const locales = ["en", "ro"] as const;
    const now = Date.now();
    let totalJobs = 0;

    for (let pageIndex = 0; pageIndex < book.pages.length; pageIndex++) {
      const page = book.pages[pageIndex];
      for (const locale of locales) {
        const statusKey = `audioStatus_${locale}` as "audioStatus_en" | "audioStatus_ro";
        // Skip pages already done (idempotency, per D-04)
        if (page[statusKey] === "done") continue;

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

    // Skip batch creation if no jobs needed (all pages already done)
    if (totalJobs === 0) {
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

// ---------------------------------------------------------------------------
// Export 7 — getGenerationProgress (public query, per D-05, ADMIN-06)
// Returns the batch record for admin UI progress display.
// ---------------------------------------------------------------------------
export const getGenerationProgress = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("audioGenBatches")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .unique();
    return batch;
  },
});

// ---------------------------------------------------------------------------
// Export 8 — startBulkAudioGeneration (public mutation, per D-04, ADMIN-02)
// Triggers audio generation for ALL published books that have missing audio.
// ---------------------------------------------------------------------------
export const startBulkAudioGeneration = mutation({
  args: {},
  handler: async (ctx) => {
    const publishedBooks = await ctx.db
      .query("books")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const results: Array<{ bookId: string; batchId: string; totalJobs: number }> = [];

    for (const book of publishedBooks) {
      const batchId = `batch_${Date.now()}_${book._id}`;
      const locales = ["en", "ro"] as const;
      const now = Date.now();
      let totalJobs = 0;

      for (let pageIndex = 0; pageIndex < book.pages.length; pageIndex++) {
        const page = book.pages[pageIndex];
        for (const locale of locales) {
          const statusKey = `audioStatus_${locale}` as "audioStatus_en" | "audioStatus_ro";
          if (page[statusKey] === "done") continue;

          await ctx.db.insert("audioJobs", {
            bookId: book._id,
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

      if (totalJobs > 0) {
        await ctx.db.insert("audioGenBatches", {
          batchId,
          locales: ["en", "ro"],
          status: "queued",
          totalJobs,
          completedJobs: 0,
          failedJobs: 0,
          createdAt: now,
        });
        results.push({ bookId: book._id, batchId, totalJobs });
      }
    }

    return { batchesCreated: results.length, results };
  },
});

// ---------------------------------------------------------------------------
// Export 9 — getPendingJobs (internalQuery, per D-02)
// Actions cannot call ctx.db, so this query is the bridge.
// Returns up to 5 pending audioJobs using the by_status index.
// ---------------------------------------------------------------------------
export const getPendingJobs = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("audioJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(5);
  },
});

// ---------------------------------------------------------------------------
// Export 10 — requeueJob (internalMutation, per D-03)
// Resets a failed job to "pending" if retryCount < 3. No-op if >= 3.
// ---------------------------------------------------------------------------
export const requeueJob = internalMutation({
  args: { jobId: v.id("audioJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    if (job.retryCount >= 3) return; // Permanent failure — do not requeue
    await ctx.db.patch(args.jobId, {
      status: "pending",
      retryCount: job.retryCount + 1,
    });
  },
});

// ---------------------------------------------------------------------------
// Export 11 — incrementBatchCompleted (internalMutation, per D-05)
// Increments completedJobs on the batch. Finalizes when all jobs settled.
// ---------------------------------------------------------------------------
export const incrementBatchCompleted = internalMutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("audioGenBatches")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .unique();
    if (!batch) return;

    const newCompleted = batch.completedJobs + 1;
    const isDone = newCompleted + batch.failedJobs >= batch.totalJobs;

    await ctx.db.patch(batch._id, {
      completedJobs: newCompleted,
      status: isDone ? "completed" : "processing",
      completedAt: isDone ? Date.now() : undefined,
    });
  },
});

// ---------------------------------------------------------------------------
// Export 12 — incrementBatchFailed (internalMutation, per D-05)
// Increments failedJobs on the batch. Finalizes when all jobs settled.
// Batch is "failed" only if ALL jobs permanently failed; otherwise "completed".
// ---------------------------------------------------------------------------
export const incrementBatchFailed = internalMutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("audioGenBatches")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .unique();
    if (!batch) return;

    const newFailed = batch.failedJobs + 1;
    const isDone = batch.completedJobs + newFailed >= batch.totalJobs;
    const allFailed = isDone && batch.completedJobs === 0 && newFailed === batch.totalJobs;

    await ctx.db.patch(batch._id, {
      failedJobs: newFailed,
      status: isDone ? (allFailed ? "failed" : "completed") : "processing",
      completedAt: isDone ? Date.now() : undefined,
    });
  },
});

// ---------------------------------------------------------------------------
// Export 13 — processAudioQueue (internalAction, per D-01, D-02, D-03)
// Cron-driven: picks up to 5 pending jobs, calls generatePageAudio sequentially.
// MUST be internalAction — mutations cannot call ctx.runAction.
// ---------------------------------------------------------------------------
export const processAudioQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    // 1. Get up to 5 pending jobs (via internalQuery — actions can't call ctx.db)
    const jobs = await ctx.runQuery(internal.audio.getPendingJobs);
    if (jobs.length === 0) return; // Nothing to process — idle tick

    // 2. Process sequentially (D-02: for-loop, not parallel)
    for (const job of jobs) {
      try {
        await ctx.runAction(internal.audio.generatePageAudio, {
          jobId: job._id,
          bookId: job.bookId,
          pageIndex: job.pageIndex,
          locale: job.locale,
        });
        // Success: increment batch completed counter
        if (job.batchId) {
          await ctx.runMutation(internal.audio.incrementBatchCompleted, {
            batchId: job.batchId,
          });
        }
      } catch {
        // generatePageAudio already called markFailed (status="failed") before throwing.
        // requeueJob will reset to "pending" if retryCount < 3, or no-op if retryCount >= 3.
        await ctx.runMutation(internal.audio.requeueJob, { jobId: job._id });

        // job.retryCount is the value BEFORE this attempt. After 3 failures:
        //   attempt 1: retryCount=0 -> requeueJob sets retryCount=1
        //   attempt 2: retryCount=1 -> requeueJob sets retryCount=2
        //   attempt 3: retryCount=2 -> requeueJob sets retryCount=3
        //   attempt 4: retryCount=3 -> requeueJob is a no-op -> permanently failed
        if (job.retryCount >= 3 && job.batchId) {
          await ctx.runMutation(internal.audio.incrementBatchFailed, {
            batchId: job.batchId,
          });
        }
      }
    }
  },
});
