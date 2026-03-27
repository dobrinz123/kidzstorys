---
phase: 2
name: TTS Integration
gathered: 2026-03-27
status: Ready for planning
---

# Phase 2: TTS Integration - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a Convex `internalAction` (`generatePageAudio`) that:
1. Accepts `bookId`, `pageIndex`, and `locale` (`"en"` | `"ro"`) as arguments
2. Reads the page text from the `books` table in Convex DB
3. Calls ElevenLabs `eleven_multilingual_v2` with the appropriate voice ID
4. Uploads the returned MP3 to Convex File Storage
5. Saves the storage ID and public URL back to `books.pages[pageIndex].audioUrl_{locale}` and `audioStorageId_{locale}`
6. Updates the corresponding `audioJobs` record status to `"done"` (or `"failed"` on error)

This action generates audio for **one page at a time**. Rate limiting, batch orchestration, and retry scheduling are Phase 3's responsibility — not this action's.

</domain>

<decisions>
## Implementation Decisions

### Action Design
- **D-01:** `generatePageAudio` must be an `internalAction` — only callable from Convex scheduler, mutations, or other internal actions. Mobile clients never invoke it directly. This protects the ElevenLabs API key from client-side abuse.
- **D-02:** The action reads page text from the DB itself. Caller passes `{ bookId, pageIndex, locale }`. The action uses these to look up `books.pages[pageIndex].text` (or equivalent text field) — single source of truth, always fresh.

### TTS Provider (locked from Phase 1)
- **D-03:** ElevenLabs `eleven_multilingual_v2` model for all TTS generation (GEN-03).
- **D-04:** Voice IDs configurable via Convex environment variables: `ELEVENLABS_EN_VOICE_ID` and `ELEVENLABS_RO_VOICE_ID`. API key via `ELEVENLABS_API_KEY`.

### Storage (locked from Phase 1)
- **D-05:** Generated MP3 stored in Convex File Storage (`ctx.storage.store()`). Public URL retrieved via `ctx.storage.getUrl(storageId)` — same pattern already used in `convex/books.ts:718`.
- **D-06:** Both `audioStorageId_{locale}` and `audioUrl_{locale}` written to the page record after successful upload.

### Rate Limiting & Retries (delegated to Phase 3)
- **D-07:** This action does NOT implement rate limiting. The Phase 3 batch scheduler controls invocation cadence to stay within ElevenLabs' ≤100 req/min limit.
- **D-08:** This action does NOT retry internally. On failure it marks the `audioJobs` record as `"failed"` and throws. The Phase 3 scheduler handles re-queuing based on `retryCount` (GEN-06).

### Architecture rationale
- Pre-generate + store (not on-demand) — decided in Phase 1. Audio files exist before the user opens a book.
- Each page has its own audio file per locale — enables per-page `didJustFinish` trigger for auto page-turn.

### Claude's Discretion
- Exact ElevenLabs API request shape (stability, similarity_boost, style parameters) — use ElevenLabs defaults for `eleven_multilingual_v2` unless there's a documented reason to override.
- Error message format stored in `audioJobs.errorMessage` — free-form string is fine.
- Whether to update `audioStatus_{locale}` on the page record during generation (set to `"generating"` when action starts, `"done"` or `"failed"` on completion) — implement this for observability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema (Phase 1 output)
- `convex/schema.ts` — audioJobs table definition, audio fields on books.pages and bookVersions.snapshot.pages

### Existing patterns to follow
- `convex/email.ts` — existing `action({...})` pattern with `process.env.VARIABLE_NAME` for secrets
- `convex/lib/rateLimit.ts` — existing rate limit DB pattern (for reference; Phase 2 does NOT add rate limiting)
- `convex/books.ts` lines 718-720 — `ctx.storage.getUrl(storageId)` pattern

### Research files
- `.planning/research/tts-apis.md` — ElevenLabs API details, EN/RO voice selection, integration snippet
- `.planning/research/audio-storage.md` — Convex File Storage approach and schema design
- `.planning/research/generation-pipeline.md` — Job queue architecture overview

### Requirements
- `.planning/REQUIREMENTS.md` — GEN-03, GEN-04, GEN-05, GEN-06, VOICE-01, VOICE-02, VOICE-03

</canonical_refs>

<specifics>
## Specific Constraints

- ElevenLabs model: `eleven_multilingual_v2` (locked — not `eleven_monolingual_v1` or others)
- Locales: `"en"` and `"ro"` only — no Italian in v1
- Environment variables (set in Convex dashboard, NOT in .env): `ELEVENLABS_API_KEY`, `ELEVENLABS_EN_VOICE_ID`, `ELEVENLABS_RO_VOICE_ID`
- Audio format: MP3 (ElevenLabs default output)
- Action location: `convex/audio.ts` (new file) — keep audio generation separate from books.ts

</specifics>

<deferred>
## Deferred Ideas

- Rate limiting within the action — delegated to Phase 3 scheduler
- Retry logic within the action — delegated to Phase 3 scheduler
- Batch orchestration — Phase 3
- Admin UI to trigger generation — Phase 3/4
- Re-generation when book text changes — v2 (GEN-V2-01)

</deferred>

---
*Phase: 02-tts-integration*
*Context gathered: 2026-03-27 via discuss-phase*
