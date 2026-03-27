import { internalAction, internalMutation, internalQuery } from "./_generated/server";
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
