---
phase: 02-tts-integration
verified: 2026-03-27T21:08:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 2: TTS Integration Verification Report

**Phase Goal:** Convex `internalAction` (`generatePageAudio`) that calls ElevenLabs `eleven_multilingual_v2`, generates audio for one page, stores the MP3 in Convex File Storage, and saves the URL + storageId back to the page record.
**Verified:** 2026-03-27T21:08:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `generatePageAudio` is `internalAction` (not public `action`) | VERIFIED | `audio.ts` line 126: `export const generatePageAudio = internalAction({` |
| 2 | ElevenLabs `eleven_multilingual_v2` model hardcoded | VERIFIED | `audio.ts` line 174: `model_id: "eleven_multilingual_v2"` |
| 3 | EN and RO voice IDs from `process.env.ELEVENLABS_EN_VOICE_ID` / `ELEVENLABS_RO_VOICE_ID` | VERIFIED | `audio.ts` lines 138–139 |
| 4 | MP3 stored via `ctx.storage.store()` and URL saved to page record | VERIFIED | `audio.ts` lines 191–206; `markDone` writes `audioUrl_{locale}` and `audioStorageId_{locale}` to `books.pages[pageIndex]` |
| 5 | `audioStatus_{locale}` transitions pending → generating → done/failed | VERIFIED | `markGenerating` sets "generating"; `markDone` sets "done"; `markFailed` sets "failed"; all patch `books.pages` |
| 6 | 4 unit tests pass (EN happy, RO happy, 4xx error, empty text) | VERIFIED | `cd convex && npm test` → "4 passed (4)", exit 0 |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/audio.ts` | All TTS generation logic — 5 exports | VERIFIED | 221 lines, all 5 exports present, substantive implementation |
| `convex/audio.test.ts` | 4 unit tests for `generatePageAudio` | VERIFIED | 251 lines, 4 tests, uses `convex-test` + `vitest` |
| `convex/vitest.config.ts` | Vitest config with `edge-runtime` | VERIFIED | Contains `environment: "edge-runtime"` and `inline: ["convex-test"]` |
| `convex/package.json` | `"test": "vitest run"` script + devDeps | VERIFIED | Scripts and devDependencies confirmed present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `generatePageAudio` handler | `internal.audio.getPageText` | `ctx.runQuery` | WIRED | Line 150 — inside try/catch as required |
| `generatePageAudio` handler | `ctx.storage.store` | `response.blob()` | WIRED | Lines 189–191: `response.blob()` → `new Blob(...)` → `ctx.storage.store(mp3Blob)` |
| `markDone` handler | `books.pages` array | full array replacement patch | WIRED | Lines 78–90: spread + replace + `ctx.db.patch(bookId, { pages })` |
| `generatePageAudio` → `markFailed` | catch block | error propagation | WIRED | Lines 207–217: catch calls `markFailed` then re-throws |
| `generatePageAudio` → `markFailed` | env var fast-path (before try) | missing config guard | WIRED | Lines 141–145: env check before try block, calls `markFailed` + throws immediately |

---

### Critical Verification Checklist

| Check | Result | Evidence |
|-------|--------|----------|
| `generatePageAudio` is `internalAction` (not public `action`) | PASS | `internalAction({` at line 126 |
| No `ctx.db` calls inside `generatePageAudio` handler body | PASS | All `ctx.db` references (lines 15, 43–52, 70–90, 106–119) are inside `internalQuery`/`internalMutation` handlers only. Line 148 in `generatePageAudio` is a comment. |
| `eleven_multilingual_v2` hardcoded as `model_id` | PASS | Line 174 |
| `process.env.ELEVENLABS_EN_VOICE_ID` and `ELEVENLABS_RO_VOICE_ID` used | PASS | Lines 138–139 |
| `ctx.storage.store()` used to upload MP3 | PASS | Line 191 |
| `response.blob()` used (not `response.json()`) | PASS | Line 189 |
| `getPageText` call is inside the try/catch (so empty-text errors reach `markFailed`) | PASS | Line 150 is inside the `try` block that opens at line 147 |
| 4 unit tests pass | PASS | `npm test` output: "4 passed (4)", Duration 396ms |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `generatePageAudio` | `text` | `ctx.runQuery(internal.audio.getPageText)` which reads `ctx.db.get(bookId)` | Yes — reads from DB, throws on empty | FLOWING |
| `markDone` | `audioUrl`, `storageId` | `ctx.storage.store(mp3Blob)` + `ctx.storage.getUrl(storageId)` | Yes — stores binary blob, retrieves URL | FLOWING |
| `markDone` | `books.pages[pageIndex]` | `ctx.db.patch(bookId, { pages })` | Yes — full array replacement written to DB | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 4 tests pass | `cd convex && npm test` | "4 passed (4)", exit 0, Duration 396ms | PASS |
| 5 exports present in audio.ts | grep for export names | All 5 found: getPageText, markGenerating, markDone, markFailed, generatePageAudio | PASS |
| No ctx.db in generatePageAudio handler | grep ctx.db in lines 126–220 | Only comment reference at line 148 (comment text, not code) | PASS |
| eleven_multilingual_v2 hardcoded | grep audio.ts | 1 match at line 174 | PASS |
| response.blob() used | grep audio.ts | 1 match at line 189 | PASS |
| ctx.storage.store used | grep audio.ts | 1 match at line 191 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GEN-03 | 02-01 | ElevenLabs `eleven_multilingual_v2` model for all TTS | SATISFIED | `model_id: "eleven_multilingual_v2"` hardcoded in `generatePageAudio` |
| GEN-04 | 02-01 | Audio files stored in Convex File Storage, stable public URLs | SATISFIED | `ctx.storage.store()` + `ctx.storage.getUrl()` → written to `audioUrl_{locale}` and `audioStorageId_{locale}` |
| GEN-05 | 02-02 (partial) | Rate limiting ≤100 req/min | DELEGATED | Per CONTEXT.md D-07 and ROADMAP note: rate limiting delegated to Phase 3. Not implemented here by design. |
| GEN-06 | 02-02 (partial) | Failed jobs retried up to 3 times | PARTIALLY SATISFIED | `markFailed` writes `status: "failed"` + `errorMessage` to `audioJobs` (observable failure state). Automatic retry logic delegated to Phase 3 per D-08. |
| VOICE-01 | 02-01 | English: warm, natural, child-appropriate neural voice | SATISFIED | EN voice ID from `process.env.ELEVENLABS_EN_VOICE_ID` (configurable per VOICE requirement) |
| VOICE-02 | 02-01 | Romanian: natural, child-appropriate neural voice | SATISFIED | RO voice ID from `process.env.ELEVENLABS_RO_VOICE_ID` (configurable per VOICE requirement) |
| VOICE-03 | 02-01 | Perceptibly human audio quality | NEEDS HUMAN | Quality is determined by voice ID selection and ElevenLabs model. Code is correct; voice quality requires human spot-check of actual audio. |

**Note on GEN-05 and GEN-06:** The ROADMAP success criteria for Phase 2 explicitly notes that rate limiting (criterion 4) and retry logic (criterion 5) are delegated to Phase 3. The Phase 2 implementation correctly provides the foundation (`markFailed` with `errorMessage` persisted) for Phase 3 to build retry on. These delegations are by design.

---

### Anti-Patterns Found

None detected.

- No TODO/FIXME/PLACEHOLDER comments in `convex/audio.ts`
- No stub implementations (`return null`, `return []`, `return {}`)
- No hardcoded empty data passed to rendering
- No handlers that only call `console.log` or `preventDefault`
- All five exports contain real implementation logic

---

### Human Verification Required

#### 1. Voice Quality Spot-Check (VOICE-03)

**Test:** Configure real `ELEVENLABS_EN_VOICE_ID` and `ELEVENLABS_RO_VOICE_ID` environment variables in the Convex dashboard, trigger `generatePageAudio` for one EN page and one RO page on a published book.
**Expected:** Generated MP3 files sound natural, human-like, and appropriate for children. No robotic artifacts. Prosody matches story text.
**Why human:** Audio quality is perceptual and cannot be verified programmatically. The code calls the correct model (`eleven_multilingual_v2`) and voice IDs — but whether the chosen voice IDs produce child-appropriate, high-quality audio requires human listening.

#### 2. Convex TypeScript Build (npx convex dev --once)

**Test:** Run `npx convex dev --once` from the project root on a machine with the full Convex toolchain configured.
**Expected:** Exit code 0, no TypeScript errors. SUMMARY reports "Convex functions ready!" confirmed at build time.
**Why human:** The verifier cannot run `npx convex dev --once` in this environment (requires Convex project credentials and network access). The SUMMARY.md documents exit 0 confirmed by the implementer. The code reads correctly and no TypeScript issues are visible by inspection.

---

### Gaps Summary

No gaps. All automated checks passed. Phase 2 goal is achieved:

- `convex/audio.ts` exists with all 5 required exports, is a real implementation (no stubs), correctly calls `eleven_multilingual_v2`, uses `response.blob()` for binary handling, stores MP3 via `ctx.storage.store()`, and writes both `storageId` and `audioUrl` back to `books.pages[pageIndex]` and `audioJobs`.
- `generatePageAudio` is an `internalAction` — mobile clients cannot call it directly.
- No `ctx.db` calls exist inside the `generatePageAudio` handler body; all DB access is delegated to `internalQuery`/`internalMutation` helpers via `ctx.runQuery`/`ctx.runMutation`.
- `getPageText` call is inside the try/catch block, so empty-text errors propagate to `markFailed`.
- 4 unit tests cover EN happy path, RO happy path, ElevenLabs 4xx error, and empty page text — all pass with fetch fully stubbed via `vi.stubGlobal`.
- GEN-05 (rate limiting) and retry scheduling in GEN-06 are deliberately delegated to Phase 3 per the ROADMAP and CONTEXT.md decisions D-07/D-08. The failure state infrastructure (`markFailed` with `errorMessage`) is in place for Phase 3 to build on.

---

_Verified: 2026-03-27T21:08:00Z_
_Verifier: Claude (gsd-verifier)_
