# Phase 2: TTS Integration - Research

**Researched:** 2026-03-27
**Domain:** ElevenLabs TTS API + Convex internalAction + Convex File Storage
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `generatePageAudio` must be an `internalAction` — only callable from Convex scheduler, mutations, or other internal actions. Mobile clients never invoke it directly.
- **D-02:** The action reads page text from the DB itself. Caller passes `{ bookId, pageIndex, locale }`. Action uses these to look up `books.pages[pageIndex].text_{locale}`.
- **D-03:** ElevenLabs `eleven_multilingual_v2` model for all TTS generation (GEN-03).
- **D-04:** Voice IDs configurable via Convex environment variables: `ELEVENLABS_EN_VOICE_ID` and `ELEVENLABS_RO_VOICE_ID`. API key via `ELEVENLABS_API_KEY`.
- **D-05:** Generated MP3 stored in Convex File Storage (`ctx.storage.store()`). Public URL retrieved via `ctx.storage.getUrl(storageId)`.
- **D-06:** Both `audioStorageId_{locale}` and `audioUrl_{locale}` written to the page record after successful upload.
- **D-07:** This action does NOT implement rate limiting. Phase 3 batch scheduler controls invocation cadence.
- **D-08:** This action does NOT retry internally. On failure it marks the `audioJobs` record as `"failed"` and throws. Phase 3 scheduler handles re-queuing.

### Claude's Discretion
- Exact ElevenLabs API request shape (stability, similarity_boost, style parameters) — use ElevenLabs defaults for `eleven_multilingual_v2` unless there is a documented reason to override.
- Error message format stored in `audioJobs.errorMessage` — free-form string is fine.
- Whether to update `audioStatus_{locale}` on the page record during generation (set to `"generating"` when action starts, `"done"` or `"failed"` on completion) — implement this for observability.

### Deferred Ideas (OUT OF SCOPE)
- Rate limiting within the action — delegated to Phase 3 scheduler
- Retry logic within the action — delegated to Phase 3 scheduler
- Batch orchestration — Phase 3
- Admin UI to trigger generation — Phase 3/4
- Re-generation when book text changes — v2 (GEN-V2-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GEN-03 | ElevenLabs `eleven_multilingual_v2` model used for all TTS generation | ElevenLabs REST API documented; model ID confirmed; voice_settings defaults established |
| GEN-04 | Audio files stored in Convex File Storage and served via stable public URLs | `ctx.storage.store(Blob)` → `Id<"_storage">`; `ctx.storage.getUrl(storageId)` → stable URL; schema fields already defined in Phase 1 |
| GEN-05 | Generation respects ElevenLabs API rate limits (≤100 req/min) | Delegated to Phase 3; this action has no rate-limit code |
| GEN-06 | Failed generation jobs are retried automatically up to 3 times | Delegated to Phase 3; this action sets `status: "failed"` and throws; `retryCount` field already in schema |
| VOICE-01 | English audio uses a warm, natural, child-appropriate neural voice | Voice ID stored in `ELEVENLABS_EN_VOICE_ID` env var; Rachel/Bella recommended from prior research |
| VOICE-02 | Romanian audio uses a natural, child-appropriate neural voice | Voice ID stored in `ELEVENLABS_RO_VOICE_ID` env var; ElevenLabs has native RO neural voices |
| VOICE-03 | Audio quality is perceptibly human (no robotic artifacts, natural prosody) | `eleven_multilingual_v2` confirmed as best quality multilingual model; default voice_settings adequate |
</phase_requirements>

---

## Summary

Phase 2 builds a single Convex `internalAction` (`generatePageAudio` in `convex/audio.ts`) that calls ElevenLabs, stores the MP3 in Convex File Storage, and writes the URL + storage ID back into `books.pages[pageIndex]` and the `audioJobs` record. Every design choice from Phase 1 locks cleanly into known Convex patterns — the codebase already uses `internalMutation`, `ctx.runMutation`, `ctx.storage.getUrl`, and `process.env` in exactly the pattern this phase requires.

The single most important architectural constraint to internalize: **actions cannot call `ctx.db` directly**. All DB reads must go through `ctx.runQuery(internal.audio.getPageText, ...)` and all DB writes must go through `ctx.runMutation(internal.audio.markGenerating, ...)`. This means `convex/audio.ts` will export both the `internalAction` and two or three supporting `internalMutation`/`internalQuery` helpers. The action orchestrates them.

ElevenLabs returns a binary `application/octet-stream` body. The pattern is: `await response.blob()` → `ctx.storage.store(blob)` → `ctx.storage.getUrl(storageId)`. No intermediate ArrayBuffer conversion is needed because `ctx.storage.store()` accepts a `Blob` directly.

**Primary recommendation:** Implement `generatePageAudio` as a lean orchestrator: read text (runQuery) → set "generating" (runMutation) → call ElevenLabs → store blob → write result (runMutation). Keep each DB side-effect in its own `internalMutation` for transaction safety.

---

## Research Q&A

### Q1: ElevenLabs API Shape

**Endpoint:**
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

**Request headers:**
```
xi-api-key: <ELEVENLABS_API_KEY>
Content-Type: application/json
```

**Request body:**
```json
{
  "text": "Page text here",
  "model_id": "eleven_multilingual_v2",
  "language_code": "en",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

Notes on fields:
- `model_id` defaults to `eleven_multilingual_v2` — send it explicitly for safety.
- `language_code` (ISO 639-1): `"en"` or `"ro"` — tells the model which language to expect; improves Romanian accuracy. Optional but recommended.
- `voice_settings` are optional. `stability: 0.5, similarity_boost: 0.75` are the prior-research defaults. For children's content, these are reasonable. Do not add `style` unless there is a specific reason — it affects performance.
- `output_format` defaults to `mp3_44100_128`. No need to override — 128kbps MP3 is what the research specified.

**Response on success (HTTP 200):**
- `Content-Type: application/octet-stream`
- Body: raw binary audio data (MP3)
- Consume with `await response.blob()`

**Response on error:**
- HTTP 422: JSON body with `{ loc, msg, type }` validation error
- HTTP 401: Invalid or missing API key
- HTTP 429: Rate limit exceeded (Phase 3 handles this)

**Confidence:** HIGH — verified against official ElevenLabs API docs at https://elevenlabs.io/docs/api-reference/text-to-speech/convert

---

### Q2: Convex internalAction Definition

`internalAction` is exported from `./_generated/server` alongside `action`, `internalMutation`, and `internalQuery`. The project already declares it in `convex/_generated/server.d.ts:83` and uses `internalMutation` throughout `maintenance.ts` and `subscriptions.ts`.

**Imports needed:**
```typescript
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
```

**Definition pattern:**
```typescript
export const generatePageAudio = internalAction({
  args: {
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: v.union(v.literal("en"), v.literal("ro")),
  },
  handler: async (ctx, args) => {
    // ...
  },
});
```

**Difference from `action`:** `action` is callable by clients (public). `internalAction` is restricted to Convex scheduler, HTTP actions, and other server-side functions. Mobile clients cannot invoke it — protecting the ElevenLabs API key. This matches D-01.

**Convex version in use:** `convex: "^1.16.0"` in `convex/package.json`. `internalAction` has been available since early Convex versions. No version risk.

**Confidence:** HIGH — confirmed in `convex/_generated/server.d.ts:83` and official docs at https://docs.convex.dev/functions/internal-functions

---

### Q3: Convex File Storage Upload from an Action

**Critical rule:** `ctx.storage.store()` accepts a `Blob`. The ElevenLabs response body should be consumed with `response.blob()`, not `response.arrayBuffer()`.

```typescript
// Correct pattern
const response = await fetch(url, { method: "POST", ... });
if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`);

const audioBlob = await response.blob();
// audioBlob is already audio/mpeg type from the octet-stream response
// Wrap with explicit MIME type for clarity:
const mp3Blob = new Blob([audioBlob], { type: "audio/mpeg" });

const storageId = await ctx.storage.store(mp3Blob);
const audioUrl = await ctx.storage.getUrl(storageId);
```

`ctx.storage.store()` returns `Id<"_storage">` — a Convex storage ID typed exactly as required by the schema fields `audioStorageId_en` / `audioStorageId_ro`.

`ctx.storage.getUrl(storageId)` returns a `string | null`. In practice it returns a stable public URL for files stored via `store()`. The URL is CDN-backed and does not expire (no signed-URL TTL). This matches D-05 and D-06.

**Note:** ArrayBuffer also works (`new Blob([arrayBuffer], { type: "audio/mpeg" })`), but direct `.blob()` is cleaner. The existing `audio-storage.md` research pattern using `new Blob([audioBuffer])` is valid if you use `response.arrayBuffer()` instead.

**Existing project usage:** `ctx.storage.getUrl(storageId)` is used in `convex/books.ts` line 720 inside a `query`. It also works in actions (confirmed in Convex docs: available on `QueryCtx`, `MutationCtx`, and `ActionCtx`).

**Confidence:** HIGH — confirmed at https://docs.convex.dev/file-storage/store-files and https://docs.convex.dev/file-storage/serve-files

---

### Q4: DB Writes from an internalAction — CRITICAL CONSTRAINT

**Actions cannot call `ctx.db` directly.** This is a hard Convex constraint, not a style recommendation. All database reads and writes from an action must go through `ctx.runQuery` and `ctx.runMutation`.

**This means `convex/audio.ts` must export supporting internal functions in addition to the action:**

```typescript
// Supporting internalQuery — reads page text
export const getPageText = internalQuery({
  args: { bookId: v.id("books"), pageIndex: v.number(), locale: v.union(v.literal("en"), v.literal("ro")) },
  handler: async (ctx, { bookId, pageIndex, locale }) => {
    const book = await ctx.db.get(bookId);
    if (!book) throw new Error(`Book not found: ${bookId}`);
    const page = book.pages[pageIndex];
    if (!page) throw new Error(`Page ${pageIndex} not found`);
    return { text: page[`text_${locale}` as "text_en" | "text_ro"], book, page };
  },
});

// Supporting internalMutation — marks job as "generating" and page status
export const markGenerating = internalMutation({
  args: { jobId: v.id("audioJobs"), bookId: v.id("books"), pageIndex: v.number(), locale: v.union(v.literal("en"), v.literal("ro")) },
  handler: async (ctx, { jobId, bookId, pageIndex, locale }) => {
    await ctx.db.patch(jobId, { status: "generating" });
    const book = await ctx.db.get(bookId);
    if (!book) return;
    const pages = [...book.pages];
    pages[pageIndex] = { ...pages[pageIndex], [`audioStatus_${locale}`]: "generating" };
    await ctx.db.patch(bookId, { pages });
  },
});

// Supporting internalMutation — writes success result
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
    pages[args.pageIndex] = {
      ...pages[args.pageIndex],
      [`audioUrl_${args.locale}`]: args.audioUrl,
      [`audioStorageId_${args.locale}`]: args.storageId,
      [`audioStatus_${args.locale}`]: "done",
      [`audioGeneratedAt_${args.locale}`]: now,
    };
    await ctx.db.patch(args.bookId, { pages });
  },
});

// Supporting internalMutation — writes failure result
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
    pages[args.pageIndex] = {
      ...pages[args.pageIndex],
      [`audioStatus_${args.locale}`]: "failed",
    };
    await ctx.db.patch(args.bookId, { pages });
  },
});
```

The action then calls these via `ctx.runQuery(internal.audio.getPageText, ...)` and `ctx.runMutation(internal.audio.markGenerating, ...)`.

**Existing project pattern for ctx.runMutation:** `convex/http.ts:88` calls `await ctx.runMutation(internal.subscriptions.updateEntitlement, {...})` — identical pattern to what this phase needs.

**Confidence:** HIGH — constraint verified at https://docs.convex.dev/functions/actions; pattern verified in existing `convex/http.ts`

---

### Q5: Error Handling Pattern

**Convex-idiomatic pattern:** Use `try/catch` in the action. In the `catch` block, call `ctx.runMutation(internal.audio.markFailed, ...)` to persist the failure, then `throw` the original error (or a `new ConvexError(...)` wrapping it).

```typescript
// In the action handler:
try {
  // ... ElevenLabs call and storage ...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await ctx.runMutation(internal.audio.markFailed, {
    jobId: args.jobId,
    bookId: args.bookId,
    pageIndex: args.pageIndex,
    locale: args.locale,
    errorMessage,
  });
  throw error; // Re-throw so caller knows the action failed
}
```

`ConvexError` (imported from `"convex/values"`) is used in the existing codebase (`convex/users.ts` uses it). It is appropriate for user-facing error messages. For this internal action, a plain `throw error` re-throw is sufficient since there is no user-facing caller — the Phase 3 scheduler will catch it.

**Note on `audioStatus`:** Per Claude's discretion, set `audioStatus_{locale}` to `"generating"` when the action starts (via `markGenerating`), `"done"` on success, and `"failed"` on failure. This provides observability for the Phase 4 admin dashboard.

**Confidence:** HIGH — pattern mirrors `convex/users.ts` and `convex/http.ts` error handling

---

### Q6: Integration Test Approach

**convex-test library** is the standard Convex testing harness. It provides a mock Convex backend and integrates with Vitest.

**Setup:**
```bash
npm install --save-dev convex-test vitest @vitest/runner
```

`vitest.config.ts` must set `environment: "edge-runtime"`.

**Testing an internalAction:**
```typescript
import { convexTest } from "convex-test";
import { test, expect, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

test("generatePageAudio - EN", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.ts"));

  // Mock the global fetch so no real ElevenLabs call is made
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("api.elevenlabs.io")) {
      return new Response(new Uint8Array([0xff, 0xfb]), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }));

  // Seed a book record with page text
  const bookId = await t.run(async (ctx) => {
    return await ctx.db.insert("books", { /* minimal valid book */ });
  });

  // Seed an audioJobs record
  const jobId = await t.run(async (ctx) => {
    return await ctx.db.insert("audioJobs", {
      bookId, pageIndex: 0, locale: "en",
      status: "pending", retryCount: 0, createdAt: Date.now(),
    });
  });

  await t.action(internal.audio.generatePageAudio, {
    bookId, pageIndex: 0, locale: "en", jobId,
  });

  // Verify job marked done
  const job = await t.run(async (ctx) => ctx.db.get(jobId));
  expect(job?.status).toBe("done");
  expect(job?.audioUrl).toBeTruthy();
});
```

**Limitations of convex-test for this phase:**
- The mock environment does not perform real ElevenLabs HTTP calls — you must `vi.stubGlobal("fetch", ...)` to simulate the response.
- `ctx.storage.store()` is mocked but returns a real-looking `Id<"_storage">` — it will not produce a real URL, but the test can verify the ID was stored.
- The test will NOT verify that the URL is a "playable MP3" in the real sense. For that, a manual smoke test against the live Convex dev deployment is required (see Integration Test Plan below).

**Integration Test Plan (non-automated):**
1. Deploy to Convex dev (`npx convex dev`).
2. Create a test book document via the Convex dashboard.
3. Call `generatePageAudio` via the dashboard or a one-off script with `locale: "en"` and `locale: "ro"`.
4. Read the resulting `audioUrl_en` / `audioUrl_ro` from the book document.
5. Open both URLs in a browser or use `curl -I` to confirm `Content-Type: audio/mpeg` and HTTP 200.

This manual smoke test satisfies the "generates audio for 1 EN page and 1 RO page and verifies both URLs are playable MP3s" requirement without requiring an integration test harness that makes real API calls.

**Confidence:** HIGH for convex-test approach — verified at https://docs.convex.dev/testing/convex-test

---

### Q7: Environment Variables in internalAction

`process.env.VARIABLE_NAME` works identically in `internalAction` and `action`. The existing `convex/email.ts` pattern confirms this:

```typescript
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error("Email service not configured");
}
```

The same pattern applies in `convex/audio.ts`:
```typescript
const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = locale === "en"
  ? process.env.ELEVENLABS_EN_VOICE_ID
  : process.env.ELEVENLABS_RO_VOICE_ID;

if (!apiKey || !voiceId) {
  throw new Error(`ElevenLabs env vars not configured for locale: ${locale}`);
}
```

**Where to set them:** Convex dashboard > Settings > Environment Variables. Not in `.env` files — those do not apply to Convex server functions.

Three variables needed:
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_EN_VOICE_ID`
- `ELEVENLABS_RO_VOICE_ID`

**Confidence:** HIGH — pattern confirmed in existing `convex/email.ts`

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.16.0 (project) | Runtime, DB, storage, scheduler | Already installed; all APIs confirmed |
| ElevenLabs REST API | v1 | TTS generation | Locked decision D-03 |

### No additional npm packages needed
The ElevenLabs integration uses native `fetch` (available in Convex action runtime). No ElevenLabs SDK is needed — the REST API call is straightforward enough that the SDK adds no value and would require a dependency.

**Installation:**
```bash
# No new packages required for the action itself
# For testing:
pnpm add -D convex-test vitest @vitest/runner --filter convex
```

---

## Architecture Patterns

### Recommended File Structure
```
convex/
├── audio.ts              # NEW — generatePageAudio internalAction + supporting helpers
├── _generated/
│   ├── api.d.ts          # Will auto-include audio.ts after npx convex dev
│   └── server.d.ts       # internalAction already exported here
```

### Pattern: Action as Orchestrator
The `internalAction` does not touch `ctx.db` itself. It calls internal helpers for all DB work.

```typescript
// convex/audio.ts
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const generatePageAudio = internalAction({
  args: {
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: v.union(v.literal("en"), v.literal("ro")),
    jobId: v.id("audioJobs"),
  },
  handler: async (ctx, args) => {
    const { bookId, pageIndex, locale, jobId } = args;

    // Validate env vars early
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = locale === "en"
      ? process.env.ELEVENLABS_EN_VOICE_ID
      : process.env.ELEVENLABS_RO_VOICE_ID;
    if (!apiKey || !voiceId) {
      throw new Error(`ElevenLabs not configured for locale: ${locale}`);
    }

    // 1. Read page text
    const { text } = await ctx.runQuery(internal.audio.getPageText, { bookId, pageIndex, locale });

    // 2. Mark as "generating"
    await ctx.runMutation(internal.audio.markGenerating, { jobId, bookId, pageIndex, locale });

    try {
      // 3. Call ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            language_code: locale,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`ElevenLabs HTTP ${response.status}: ${body}`);
      }

      // 4. Store audio in Convex File Storage
      const audioBlob = await response.blob();
      const mp3Blob = new Blob([audioBlob], { type: "audio/mpeg" });
      const storageId = await ctx.storage.store(mp3Blob);
      const audioUrl = await ctx.storage.getUrl(storageId);
      if (!audioUrl) throw new Error("ctx.storage.getUrl returned null");

      // 5. Write result to DB
      await ctx.runMutation(internal.audio.markDone, {
        jobId, bookId, pageIndex, locale, storageId, audioUrl,
      });

      return { storageId, audioUrl };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.audio.markFailed, {
        jobId, bookId, pageIndex, locale, errorMessage,
      });
      throw error;
    }
  },
});
```

### Pattern: Pages Array Mutation
`books.pages` is an embedded array (not a separate table). To update a single page's audio fields, you must:
1. `ctx.db.get(bookId)` — read the full book
2. Spread the pages array: `const pages = [...book.pages]`
3. Replace the target element: `pages[pageIndex] = { ...pages[pageIndex], audioUrl_en: "..." }`
4. `ctx.db.patch(bookId, { pages })` — write back the full array

This is the only pattern that works for embedded arrays in Convex. There is no "array element patch" API.

### Anti-Patterns to Avoid
- **Calling `ctx.db` directly in an action:** Will fail at runtime with a Convex constraint violation. All DB access must go through `ctx.runQuery` / `ctx.runMutation`.
- **Using `response.json()` for ElevenLabs audio:** The response body is binary. `.json()` will throw. Use `.blob()`.
- **Storing the raw fetch response as-is:** Wrap the blob with `new Blob([blob], { type: "audio/mpeg" })` to set the correct MIME type.
- **Mutating `book.pages` in place:** The array is immutable from the Convex type system perspective. Always spread it.
- **Calling `ctx.storage.getUrl` and assuming non-null:** It returns `string | null`. Check for null before storing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client for ElevenLabs | Custom fetch wrapper | Native `fetch` | Available natively in Convex action runtime; no SDK needed |
| File upload to external storage | Custom S3/R2 upload | `ctx.storage.store(blob)` | Native Convex API; zero config; already decided in D-05 |
| Storage ID persistence | Manual document updates | `internalMutation` helper + `ctx.db.patch` | Transaction safety; required by Convex architecture |
| Job status tracking | Custom state machine | Patch `audioJobs` status field | Schema already has all status values from Phase 1 |

---

## Common Pitfalls

### Pitfall 1: ctx.db in Actions
**What goes wrong:** Runtime error — "Cannot call ctx.db directly in an action."
**Why it happens:** Actions run in a non-transactional context. Only mutations and queries have direct DB access.
**How to avoid:** Export `internalQuery` and `internalMutation` helpers in the same file. Call them via `ctx.runQuery` / `ctx.runMutation`.
**Warning signs:** TypeScript will not catch this at compile time. Only surfaces at runtime.

### Pitfall 2: ElevenLabs Response Handling
**What goes wrong:** `SyntaxError: Unexpected token` when calling `response.json()` on audio binary data.
**Why it happens:** The ElevenLabs `/v1/text-to-speech/{voice_id}` endpoint returns `application/octet-stream`, not JSON.
**How to avoid:** Always use `await response.blob()` for the TTS endpoint. Reserve `.json()` for error inspection only.
**Warning signs:** Response `Content-Type` header is `application/octet-stream`.

### Pitfall 3: Pages Array Immutability
**What goes wrong:** Attempt to update `book.pages[i].audioUrl_en` fails silently or throws a Convex validation error.
**Why it happens:** Convex embedded arrays cannot be patched by index. The whole array must be replaced.
**How to avoid:** `const pages = [...book.pages]; pages[i] = { ...pages[i], audioUrl_en: url }; await ctx.db.patch(bookId, { pages })`.
**Warning signs:** No TypeScript error — only caught at runtime or via incorrect data in DB.

### Pitfall 4: `ctx.storage.getUrl` Returning Null
**What goes wrong:** `audioUrl` is stored as `null` in the page record.
**Why it happens:** `getUrl` returns `string | null`. If the storage ID does not exist, it returns null.
**How to avoid:** Throw if null: `if (!audioUrl) throw new Error("ctx.storage.getUrl returned null")`.
**Warning signs:** `audioUrl_en` field is null in the books document after generation.

### Pitfall 5: Generated API Types Not Updated
**What goes wrong:** `internal.audio.generatePageAudio` does not exist at type level — TypeScript error.
**Why it happens:** `convex/_generated/api.d.ts` and `api.js` are auto-generated and must be regenerated after adding `convex/audio.ts`.
**How to avoid:** Run `npx convex dev` (or `pnpm convex:dev`) before testing. The generated files update automatically during dev mode.
**Warning signs:** TypeScript cannot find `internal.audio` namespace.

### Pitfall 6: Voice IDs Not Set in Convex Dashboard
**What goes wrong:** Action throws "ElevenLabs not configured for locale: en" immediately.
**Why it happens:** `process.env.ELEVENLABS_EN_VOICE_ID` is undefined when env vars are not set in the Convex dashboard.
**How to avoid:** Set all three env vars in Convex dashboard > Settings > Environment Variables before first invocation. Document them in a `.env.example` file.
**Warning signs:** Error logged immediately before any ElevenLabs HTTP call is made.

---

## Code Examples

### Complete internalAction skeleton (verified pattern)
```typescript
// convex/audio.ts
// Source: Convex internal-functions docs + existing convex/http.ts pattern

import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const localeValidator = v.union(v.literal("en"), v.literal("ro"));

export const getPageText = internalQuery({
  args: { bookId: v.id("books"), pageIndex: v.number(), locale: localeValidator },
  handler: async (ctx, { bookId, pageIndex, locale }) => {
    const book = await ctx.db.get(bookId);
    if (!book) throw new Error(`Book not found: ${bookId}`);
    const page = book.pages[pageIndex];
    if (!page) throw new Error(`Page index ${pageIndex} out of bounds`);
    const textKey = `text_${locale}` as "text_en" | "text_ro";
    return { text: page[textKey] };
  },
});

export const markGenerating = internalMutation({
  args: { jobId: v.id("audioJobs"), bookId: v.id("books"), pageIndex: v.number(), locale: localeValidator },
  handler: async (ctx, { jobId, bookId, pageIndex, locale }) => {
    await ctx.db.patch(jobId, { status: "generating" });
    const book = await ctx.db.get(bookId);
    if (!book) return;
    const pages = [...book.pages];
    pages[pageIndex] = { ...pages[pageIndex], [`audioStatus_${locale}`]: "generating" } as typeof pages[number];
    await ctx.db.patch(bookId, { pages });
  },
});

export const markDone = internalMutation({
  args: {
    jobId: v.id("audioJobs"),
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: localeValidator,
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
    pages[args.pageIndex] = {
      ...pages[args.pageIndex],
      [`audioUrl_${args.locale}`]: args.audioUrl,
      [`audioStorageId_${args.locale}`]: args.storageId,
      [`audioStatus_${args.locale}`]: "done",
      [`audioGeneratedAt_${args.locale}`]: now,
    } as typeof pages[number];
    await ctx.db.patch(args.bookId, { pages });
  },
});

export const markFailed = internalMutation({
  args: {
    jobId: v.id("audioJobs"),
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: localeValidator,
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
    pages[args.pageIndex] = {
      ...pages[args.pageIndex],
      [`audioStatus_${args.locale}`]: "failed",
    } as typeof pages[number];
    await ctx.db.patch(args.bookId, { pages });
  },
});

export const generatePageAudio = internalAction({
  args: {
    bookId: v.id("books"),
    pageIndex: v.number(),
    locale: localeValidator,
    jobId: v.id("audioJobs"),
  },
  handler: async (ctx, args) => {
    const { bookId, pageIndex, locale, jobId } = args;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = locale === "en"
      ? process.env.ELEVENLABS_EN_VOICE_ID
      : process.env.ELEVENLABS_RO_VOICE_ID;
    if (!apiKey || !voiceId) {
      throw new Error(`ElevenLabs env vars not configured for locale: ${locale}`);
    }

    const { text } = await ctx.runQuery(internal.audio.getPageText, { bookId, pageIndex, locale });

    await ctx.runMutation(internal.audio.markGenerating, { jobId, bookId, pageIndex, locale });

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            language_code: locale,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`ElevenLabs HTTP ${response.status}: ${errorBody}`);
      }

      const audioBlob = await response.blob();
      const mp3Blob = new Blob([audioBlob], { type: "audio/mpeg" });
      const storageId = await ctx.storage.store(mp3Blob);
      const audioUrl = await ctx.storage.getUrl(storageId);
      if (!audioUrl) throw new Error("ctx.storage.getUrl returned null after store");

      await ctx.runMutation(internal.audio.markDone, {
        jobId, bookId, pageIndex, locale, storageId, audioUrl,
      });

      return { storageId, audioUrl };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.audio.markFailed, {
        jobId, bookId, pageIndex, locale, errorMessage,
      });
      throw error;
    }
  },
});
```

### ctx.runMutation pattern (from existing convex/http.ts:88)
```typescript
// Source: convex/http.ts line 88 — confirmed working pattern in this codebase
await ctx.runMutation(internal.subscriptions.updateEntitlement, {
  revenueCatAppUserId: app_user_id,
  entitlementActive: hasActiveEntitlement,
  expiresAt,
  eventType: type,
  productId: product_id,
  isTrial: is_trial_period || false,
});
```

### ctx.storage.getUrl pattern (from existing convex/books.ts:720)
```typescript
// Source: convex/books.ts line 720 — confirmed working pattern in this codebase
return await ctx.storage.getUrl(args.storageId);
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | convex-test + vitest |
| Config file | `convex/vitest.config.ts` — does not exist yet (Wave 0 gap) |
| Quick run command | `npx vitest run convex/audio.test.ts` |
| Full suite command | `npx vitest run --project convex` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-03 | `eleven_multilingual_v2` sent in request body | unit (mock fetch) | `npx vitest run convex/audio.test.ts` | Wave 0 |
| GEN-04 | storageId + audioUrl written to books.pages and audioJobs | unit (convex-test) | `npx vitest run convex/audio.test.ts` | Wave 0 |
| GEN-05 | No rate limiting in this action (smoke check) | manual-only | — | — |
| GEN-06 | markFailed called on error; throw propagates | unit (mock fetch error) | `npx vitest run convex/audio.test.ts` | Wave 0 |
| VOICE-01/02 | Correct voice ID env var sent per locale | unit (mock fetch) | `npx vitest run convex/audio.test.ts` | Wave 0 |
| VOICE-03 | Perceptibly human audio | manual-only (listen test) | — | — |

### Wave 0 Gaps
- [ ] `convex/audio.test.ts` — covers GEN-03, GEN-04, GEN-06, VOICE-01, VOICE-02
- [ ] `convex/vitest.config.ts` — Vitest config with `environment: "edge-runtime"`
- [ ] Framework install: `pnpm add -D convex-test vitest @vitest/runner --filter convex`

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / Convex runtime | generatePageAudio execution | ✓ | Managed by Convex | — |
| ElevenLabs API key | TTS generation | ✗ (not verified) | — | Cannot proceed without |
| `ELEVENLABS_EN_VOICE_ID` | EN audio generation | ✗ (not verified) | — | Cannot proceed without |
| `ELEVENLABS_RO_VOICE_ID` | RO audio generation | ✗ (not verified) | — | Cannot proceed without |

**Missing dependencies with no fallback:**
- All three ElevenLabs env vars must be set in Convex dashboard before any live testing. Implementation can proceed without them (tests mock fetch), but live smoke test is blocked.

**Recommended planner action:** Include a Wave 0 task: "Verify ElevenLabs env vars are set in Convex dashboard and that the voice IDs are valid by generating one test audio file manually."

---

## Planning Recommendations

1. **File: `convex/audio.ts` is the only new file.** It exports: `getPageText` (internalQuery), `markGenerating` (internalMutation), `markDone` (internalMutation), `markFailed` (internalMutation), `generatePageAudio` (internalAction). All in one file per the CONTEXT.md spec.

2. **Wave 0 must include test infrastructure.** `vitest.config.ts` and `audio.test.ts` do not exist. These must be created before implementation tasks begin, or in parallel with Wave 1.

3. **Action signature should include `jobId`.** The action needs to update the `audioJobs` record — the caller must pass the job's `_id`. Planner should spec the args as `{ bookId, pageIndex, locale, jobId }`.

4. **No `"use node"` directive needed.** The standard Convex action runtime supports `fetch`, `Blob`, and `ArrayBuffer`. Only add `"use node"` if you need Node-specific APIs (e.g., `crypto`, `fs`). This action does not need any.

5. **Run `npx convex dev` after creating `audio.ts`** to regenerate `_generated/api.d.ts` and make `internal.audio` available at the type level.

6. **TypeScript cast needed for spread pages array.** When writing `pages[i] = { ...pages[i], audioUrl_en: url }`, Convex's strict types on the pages array may require an `as typeof pages[number]` cast due to the dynamic key (`audioUrl_${locale}`). This is expected — document it in the implementation task.

7. **Voice IDs must be registered with ElevenLabs before using.** The `ELEVENLABS_EN_VOICE_ID` and `ELEVENLABS_RO_VOICE_ID` must be valid ElevenLabs voice IDs from the voice library. Prior research recommends Rachel or Bella for EN; testing a few RO voices is recommended. This is a pre-deployment human task, not a code task.

8. **`audioStatus_{locale}` observability toggle (Claude's discretion).** The plan should include updating `audioStatus_{locale}` on the page record to `"generating"` at the start (via `markGenerating`) and `"done"` or `"failed"` at the end. This costs one extra field write but enables Phase 4 admin dashboard to show real-time generation status.

---

## Sources

### Primary (HIGH confidence)
- https://elevenlabs.io/docs/api-reference/text-to-speech/convert — ElevenLabs TTS API endpoint, headers, body, response format
- https://docs.convex.dev/functions/internal-functions — internalAction definition and calling pattern
- https://docs.convex.dev/functions/actions — ctx.db restriction, ctx.runQuery/runMutation pattern
- https://docs.convex.dev/file-storage/store-files — ctx.storage.store(Blob) → Id<"_storage">
- https://docs.convex.dev/file-storage/serve-files — ctx.storage.getUrl(storageId) availability in actions
- https://docs.convex.dev/testing/convex-test — convex-test library, vitest setup, internalAction testing
- `convex/_generated/server.d.ts` (project file) — internalAction export confirmed at line 83
- `convex/http.ts` (project file) — ctx.runMutation(internal.x.y, args) pattern at line 88
- `convex/books.ts` (project file) — ctx.storage.getUrl(storageId) pattern at line 720
- `convex/email.ts` (project file) — process.env.VARIABLE_NAME pattern in action

### Secondary (MEDIUM confidence)
- `.planning/research/tts-apis.md` — ElevenLabs voice recommendations, rate limits, pricing
- `.planning/research/audio-storage.md` — Convex storage upload pattern, URL serving strategy

---

## Metadata

**Confidence breakdown:**
- ElevenLabs API shape: HIGH — verified against official docs
- Convex internalAction pattern: HIGH — verified in official docs + existing project code
- ctx.storage API: HIGH — verified in official docs + existing books.ts usage
- ctx.db restriction in actions: HIGH — verified in official docs + confirmed by search
- Error handling: HIGH — pattern matches existing codebase (users.ts, http.ts)
- Testing approach: HIGH — convex-test library confirmed; mock fetch pattern confirmed
- Environment variables: HIGH — pattern confirmed in existing email.ts

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (Convex APIs are stable; ElevenLabs API is stable)
