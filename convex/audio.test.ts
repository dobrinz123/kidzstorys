import { convexTest } from "convex-test";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertCategory(ctx: any) {
  return await ctx.db.insert("categories", {
    slug: "test-cat-" + Date.now(),
    order: 1,
    name_en: "Test",
    name_ro: "Test",
    name_it: "Test",
    description_en: "",
    description_ro: "",
    description_it: "",
    iconKey: "test",
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

async function insertBook(
  ctx: any,
  categoryId: any,
  pageTextEn = "Hello world."
) {
  return await ctx.db.insert("books", {
    bookKey: "test-book-" + Date.now() + "-" + Math.random(),
    categoryId,
    ageMin: 3,
    ageMax: 6,
    durationMin: 5,
    cover: {
      title_en: "Test Book",
      title_ro: "Carte Test",
      title_it: "Libro Test",
    },
    pages: [
      {
        pageNumber: 1,
        text_en: pageTextEn,
        text_ro: "Salut lume.",
        text_it: "Ciao mondo.",
      },
    ],
    tags_en: [],
    tags_ro: [],
    tags_it: [],
    parentQuestions_en: [],
    parentQuestions_ro: [],
    parentQuestions_it: [],
    status: "draft" as const,
    version: 1,
    readCount: 0,
    favoriteCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

async function insertJob(ctx: any, bookId: any, locale: "en" | "ro") {
  return await ctx.db.insert("audioJobs", {
    bookId,
    pageIndex: 0,
    locale,
    status: "pending" as const,
    retryCount: 0,
    createdAt: Date.now(),
  });
}

// Mock fetch that returns a minimal valid MP3 blob (0xff 0xfb = MP3 frame sync)
function mockFetchSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("api.elevenlabs.io")) {
        return new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]), {
          status: 200,
          headers: { "Content-Type": "application/octet-stream" },
        });
      }
      throw new Error(`Unexpected fetch to: ${url}`);
    })
  );
}

// Mock fetch that returns a 422 Unprocessable Entity response
function mockFetch422() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("api.elevenlabs.io")) {
        return new Response(JSON.stringify({ detail: "invalid voice" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch to: ${url}`);
    })
  );
}

// ---------------------------------------------------------------------------
// Environment setup — convex-test does not inject Convex dashboard env vars
// ---------------------------------------------------------------------------

beforeEach(() => {
  process.env.ELEVENLABS_API_KEY = "test-api-key";
  process.env.ELEVENLABS_EN_VOICE_ID = "voice-en-test";
  process.env.ELEVENLABS_RO_VOICE_ID = "voice-ro-test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_EN_VOICE_ID;
  delete process.env.ELEVENLABS_RO_VOICE_ID;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generatePageAudio", () => {
  test("happy path EN: job and page marked done with audioUrl and storageId", async () => {
    mockFetchSuccess();
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    const { bookId, jobId } = await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      const bookId = await insertBook(ctx, categoryId, "Hello world.");
      const jobId = await insertJob(ctx, bookId, "en");
      return { bookId, jobId };
    });

    await t.action(internal.audio.generatePageAudio, {
      jobId,
      bookId,
      pageIndex: 0,
      locale: "en",
    });

    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.status).toBe("done");
    expect(job?.audioUrl).toBeTruthy();
    expect(job?.audioStorageId).toBeTruthy();
    expect(job?.completedAt).toBeGreaterThan(0);

    const book = await t.run(async (ctx) => ctx.db.get(bookId));
    expect(book?.pages[0].audioStatus_en).toBe("done");
    expect(book?.pages[0].audioUrl_en).toBeTruthy();
    expect(book?.pages[0].audioStorageId_en).toBeTruthy();
  });

  test("happy path RO: job and page marked done, RO voice ID used in request URL", async () => {
    mockFetchSuccess();
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    const { bookId, jobId } = await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      const bookId = await insertBook(ctx, categoryId);
      const jobId = await insertJob(ctx, bookId, "ro");
      return { bookId, jobId };
    });

    await t.action(internal.audio.generatePageAudio, {
      jobId,
      bookId,
      pageIndex: 0,
      locale: "ro",
    });

    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.status).toBe("done");
    expect(job?.audioUrl).toBeTruthy();

    const book = await t.run(async (ctx) => ctx.db.get(bookId));
    expect(book?.pages[0].audioStatus_ro).toBe("done");
    expect(book?.pages[0].audioUrl_ro).toBeTruthy();

    // Confirm the RO voice ID was used in the ElevenLabs request URL
    const fetchMock = vi.mocked(fetch);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("voice-ro-test");
  });

  test("ElevenLabs 4xx: action throws, job marked failed with errorMessage containing status code", async () => {
    mockFetch422();
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    const { bookId, jobId } = await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      const bookId = await insertBook(ctx, categoryId);
      const jobId = await insertJob(ctx, bookId, "en");
      return { bookId, jobId };
    });

    await expect(
      t.action(internal.audio.generatePageAudio, {
        jobId,
        bookId,
        pageIndex: 0,
        locale: "en",
      })
    ).rejects.toThrow();

    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.status).toBe("failed");
    expect(job?.errorMessage).toMatch(/422/);

    const book = await t.run(async (ctx) => ctx.db.get(bookId));
    expect(book?.pages[0].audioStatus_en).toBe("failed");
  });

  test("empty page text: action throws before fetch, job marked failed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    const { bookId, jobId } = await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      // Empty string for text_en triggers the empty-text guard in getPageText
      const bookId = await insertBook(ctx, categoryId, "");
      const jobId = await insertJob(ctx, bookId, "en");
      return { bookId, jobId };
    });

    await expect(
      t.action(internal.audio.generatePageAudio, {
        jobId,
        bookId,
        pageIndex: 0,
        locale: "en",
      })
    ).rejects.toThrow();

    // fetch must NOT have been called — action fails before reaching ElevenLabs
    expect(fetchMock).not.toHaveBeenCalled();

    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.status).toBe("failed");
    expect(job?.errorMessage).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getFailedJobs
// ---------------------------------------------------------------------------
describe("getFailedJobs", () => {
  test("returns failed jobs enriched with bookTitle", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      const bookId = await insertBook(ctx, categoryId);
      await ctx.db.insert("audioJobs", {
        bookId,
        pageIndex: 0,
        locale: "en",
        status: "failed" as const,
        errorMessage: "test error",
        retryCount: 0,
        createdAt: Date.now(),
      });
      // Also insert a pending job that should NOT appear
      await ctx.db.insert("audioJobs", {
        bookId,
        pageIndex: 0,
        locale: "ro",
        status: "pending" as const,
        retryCount: 0,
        createdAt: Date.now(),
      });
    });

    const result = await t.query(api.audio.getFailedJobs, {});
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("failed");
    expect(result[0].bookTitle).toBe("Test Book");
    expect(result[0].errorMessage).toBe("test error");
  });
});

// ---------------------------------------------------------------------------
// retryFailedJob
// ---------------------------------------------------------------------------
describe("retryFailedJob", () => {
  test("resets a failed job to pending with retryCount+1", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    const jobId = await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      const bookId = await insertBook(ctx, categoryId);
      return await ctx.db.insert("audioJobs", {
        bookId,
        pageIndex: 0,
        locale: "en",
        status: "failed" as const,
        errorMessage: "test",
        retryCount: 1,
        createdAt: Date.now(),
      });
    });

    const result = await t.mutation(api.audio.retryFailedJob, { jobId });
    expect(result).toEqual({ success: true });

    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    expect(job?.status).toBe("pending");
    expect(job?.retryCount).toBe(2);
  });

  test("throws if job is not in failed state", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    const jobId = await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      const bookId = await insertBook(ctx, categoryId);
      return await ctx.db.insert("audioJobs", {
        bookId,
        pageIndex: 0,
        locale: "en",
        status: "pending" as const,
        retryCount: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.audio.retryFailedJob, { jobId })
    ).rejects.toThrow("Job is not in failed state");
  });

  test("throws if retryCount >= 3", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    const jobId = await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      const bookId = await insertBook(ctx, categoryId);
      return await ctx.db.insert("audioJobs", {
        bookId,
        pageIndex: 0,
        locale: "en",
        status: "failed" as const,
        errorMessage: "test",
        retryCount: 3,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.audio.retryFailedJob, { jobId })
    ).rejects.toThrow("Max retries exceeded");
  });
});

// ---------------------------------------------------------------------------
// getAudioOverview
// ---------------------------------------------------------------------------
describe("getAudioOverview", () => {
  test("returns correct counts for published books with audio statuses", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.ts"));

    await t.run(async (ctx) => {
      const categoryId = await insertCategory(ctx);
      // Published book with 2 pages, mixed audio status
      await ctx.db.insert("books", {
        bookKey: "overview-test-1",
        categoryId,
        ageMin: 3,
        ageMax: 6,
        durationMin: 5,
        cover: { title_en: "Book 1", title_ro: "Carte 1", title_it: "Libro 1" },
        pages: [
          {
            pageNumber: 1,
            text_en: "Page 1",
            text_ro: "Pagina 1",
            text_it: "Pagina 1",
            audioStatus_en: "done" as const,
            audioStatus_ro: "done" as const,
          },
          {
            pageNumber: 2,
            text_en: "Page 2",
            text_ro: "Pagina 2",
            text_it: "Pagina 2",
            audioStatus_en: "done" as const,
            audioStatus_ro: "failed" as const,
          },
        ],
        tags_en: [],
        tags_ro: [],
        tags_it: [],
        parentQuestions_en: [],
        parentQuestions_ro: [],
        parentQuestions_it: [],
        status: "published" as const,
        publishedAt: Date.now(),
        version: 1,
        readCount: 0,
        favoriteCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      // Draft book should NOT be counted
      await ctx.db.insert("books", {
        bookKey: "overview-test-2",
        categoryId,
        ageMin: 3,
        ageMax: 6,
        durationMin: 5,
        cover: { title_en: "Draft", title_ro: "Draft", title_it: "Draft" },
        pages: [
          { pageNumber: 1, text_en: "X", text_ro: "X", text_it: "X" },
        ],
        tags_en: [],
        tags_ro: [],
        tags_it: [],
        parentQuestions_en: [],
        parentQuestions_ro: [],
        parentQuestions_it: [],
        status: "draft" as const,
        version: 1,
        readCount: 0,
        favoriteCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(api.audio.getAudioOverview, {});
    expect(result.totalBooks).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.doneEn).toBe(2);
    expect(result.doneRo).toBe(1);
    expect(result.totalSlots).toBe(4); // 2 pages * 2 locales
    expect(result.totalDone).toBe(3); // 2 EN + 1 RO
    expect(result.failedCount).toBe(1); // page 2 has failed RO
  });
});
