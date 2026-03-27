---
phase: 02-tts-integration
plan: "01"
subsystem: api
tags: [convex, elevenlabs, tts, audio, internalAction, file-storage]

# Dependency graph
requires:
  - phase: 01-data-model
    provides: [books.pages audio fields (audioUrl_en/ro, audioStorageId_en/ro, audioStatus_en/ro, audioGeneratedAt_en/ro), audioJobs table]
provides:
  - convex/audio.ts with getPageText, markGenerating, markDone, markFailed, generatePageAudio
  - Complete TTS generation logic for one page per locale
  - ElevenLabs eleven_multilingual_v2 integration with Convex File Storage
affects: [02-02-tests, phase-03-batch-scheduler]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - internalAction-with-runQuery-runMutation: actions cannot call ctx.db, delegate to internalQuery/internalMutation helpers
    - fast-path-env-check: env vars checked before try block, markFailed called + throw if missing (mirrors email.ts pattern)
    - embedded-array-patch: read book, spread pages, replace element, patch whole array back to DB
    - response-blob-store: ElevenLabs returns binary; use response.blob() not response.json(), store via ctx.storage.store()

key-files:
  created:
    - convex/audio.ts
  modified: []

key-decisions:
  - "getPageText, markGenerating, markDone, markFailed are internalQuery/internalMutation co-located in audio.ts because generatePageAudio (internalAction) cannot access ctx.db directly"
  - "Empty text guard placed inside try block so empty-text errors flow through catch and reach markFailed"
  - "Computed property keys (audioStatus_en/ro etc.) cast with 'as' suffix types instead of any to satisfy TypeScript union"
  - "audioStatus set to generating before ElevenLabs call for real-time observability; set to done/failed on completion"
  - "No rate limiting or retry logic in this file — delegated to Phase 3 batch scheduler per D-07, D-08"

patterns-established:
  - "internalAction delegates all DB access to ctx.runQuery/ctx.runMutation — never ctx.db in action handler"
  - "Env var fast-path: check before try, call markFailed + throw immediately (preserves job state even on config errors)"
  - "ElevenLabs binary response: response.blob() → new Blob([blob], { type: 'audio/mpeg' }) → ctx.storage.store()"

requirements-completed: [GEN-03, GEN-04, VOICE-01, VOICE-02, VOICE-03]

# Metrics
duration: 15min
completed: 2026-03-27
---

# Phase 2 Plan 01: Create convex/audio.ts — TTS Integration Module Summary

**ElevenLabs `eleven_multilingual_v2` internalAction (`generatePageAudio`) with four DB helper functions, storing generated MP3s in Convex File Storage and writing storageId + public URL back to `books.pages[pageIndex]` and `audioJobs`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-27T18:50:00Z
- **Completed:** 2026-03-27T18:53:39Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- Created `convex/audio.ts` with all five required exports, validated by `npx convex dev --once` (exit 0)
- `generatePageAudio` is an `internalAction` — ElevenLabs API key never exposed to mobile clients
- Full `audioStatus_{locale}` lifecycle: `undefined` → `generating` → `done` | `failed` with DB sync on both `audioJobs` and `books.pages`
- MP3 stored via `ctx.storage.store()`, public URL retrieved via `ctx.storage.getUrl()`, both written to page record

## Task Commits

1. **Task 1: Write convex/audio.ts with all helpers and the internalAction** - `8426559` (feat)

## Files Created/Modified

- `/c/Users/david/Desktop/RANDOM/STORY_KIDS/.claude/worktrees/agent-a5baa932/convex/audio.ts` - All five exports: getPageText, markGenerating, markDone, markFailed, generatePageAudio

## Function Signatures (for 02-02 test plan mocking)

```typescript
// internalQuery
getPageText(ctx, { bookId: Id<"books">, pageIndex: number, locale: "en" | "ro" })
  => Promise<{ text: string }>

// internalMutation
markGenerating(ctx, { jobId: Id<"audioJobs">, bookId: Id<"books">, pageIndex: number, locale: "en" | "ro" })
  => Promise<void>

// internalMutation
markDone(ctx, { jobId: Id<"audioJobs">, bookId: Id<"books">, pageIndex: number, locale: "en" | "ro", storageId: Id<"_storage">, audioUrl: string })
  => Promise<void>

// internalMutation
markFailed(ctx, { jobId: Id<"audioJobs">, bookId: Id<"books">, pageIndex: number, locale: "en" | "ro", errorMessage: string })
  => Promise<void>

// internalAction
generatePageAudio(ctx, { jobId: Id<"audioJobs">, bookId: Id<"books">, pageIndex: number, locale: "en" | "ro" })
  => Promise<void>
```

## TypeScript Workarounds

Computed property key typing was resolved by casting locale-suffixed keys to explicit union types:

```typescript
const statusKey = `audioStatus_${args.locale}` as "audioStatus_en" | "audioStatus_ro";
const urlKey = `audioUrl_${args.locale}` as "audioUrl_en" | "audioUrl_ro";
const storageIdKey = `audioStorageId_${args.locale}` as "audioStorageId_en" | "audioStorageId_ro";
const generatedAtKey = `audioGeneratedAt_${args.locale}` as "audioGeneratedAt_en" | "audioGeneratedAt_ro";
```

This avoids `any` casts while satisfying the Convex page object union types. TypeScript accepted this pattern cleanly — `npx convex dev --once` exits 0 with no errors.

## Convex Dev --once Output

```
✔ 20:53:39 Convex functions ready! (3.2s)
```

Exit code 0 — no TypeScript errors.

## Decisions Made

1. **Co-location of helpers in audio.ts:** `getPageText`, `markGenerating`, `markDone`, `markFailed` are all in `audio.ts` because `generatePageAudio` is an `internalAction` that cannot call `ctx.db` directly. Helpers must be in the same file so `internal.audio.*` references resolve correctly.

2. **getPageText inside try block:** The empty-text check runs inside the `try` block so any error (book not found, page not found, empty text) reaches the `catch` handler and calls `markFailed` to persist the error state. This was explicitly noted in the plan.

3. **Env var fast-path before try:** The `ELEVENLABS_API_KEY`/`ELEVENLABS_{EN|RO}_VOICE_ID` check happens before the try block. On missing config, `markFailed` is called and the action throws immediately — job record is updated even if the action was never really "started".

## Deviations from Plan

None — plan executed exactly as written. The worktree required merging `main` to get Phase 01 schema changes (audioJobs table, audio fields on books.pages) before audio.ts could be written. This was an environment setup step, not a plan deviation.

## Issues Encountered

The worktree branch `worktree-agent-a5baa932` was created before Phase 01 schema commits landed on `main`. A fast-forward merge of `main` was required to bring in the `audioJobs` table definition and `books.pages` audio fields. After merging, `convex/schema.ts` contained all required fields and the plan executed cleanly.

## User Setup Required

Three Convex environment variables must be set in the Convex dashboard before `generatePageAudio` can generate audio:

```
ELEVENLABS_API_KEY=<your ElevenLabs API key>
ELEVENLABS_EN_VOICE_ID=<ElevenLabs voice ID for English>
ELEVENLABS_RO_VOICE_ID=<ElevenLabs voice ID for Romanian>
```

Set via: Convex Dashboard → Settings → Environment Variables (not .env — these run server-side in Convex actions).

If not configured, `generatePageAudio` will call `markFailed` and throw `"ElevenLabs env vars not configured for locale: {locale}"`. The job record is updated to `failed` status so the error is observable.

## Known Stubs

None. `convex/audio.ts` contains real implementation logic. No hardcoded mock values, placeholder URLs, or TODO stubs.

## Next Phase Readiness

- `convex/audio.ts` is complete and TypeScript-validated
- All five exports are available as `internal.audio.*` for the Phase 03 batch scheduler
- Function signatures above are ready for 02-02 test plan mocking
- ElevenLabs env vars need to be configured in Convex dashboard before end-to-end testing

---
*Phase: 02-tts-integration*
*Completed: 2026-03-27*
