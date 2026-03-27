# Roadmap: StoryKids Audiobook Feature

**Milestone:** v2.0 — Audiobook
**Goal:** Every subscribed child can hear any book read aloud in EN or RO, with auto page-turning.
**Granularity:** Fine (8 phases)

---

## Phase 1 — Data Model & Schema
**Goal:** Extend Convex schema to support per-page audio storage and generation tracking.
**Requirements:** GEN-01, GEN-02
**Deliverables:**
- `pages` table extended with `audioUrl_en`, `audioUrl_ro`, `audioStorageId_en`, `audioStorageId_ro`
- `audioJobs` table created (pending/generating/done/failed per page + locale)
- `audioGenBatches` table created (batch run tracking)
- TypeScript types generated and working
- Convex migration applied to production

---

## Phase 2 — ElevenLabs TTS Integration
**Goal:** Convex action that calls ElevenLabs, generates audio for a page, and stores it in Convex File Storage.
**Requirements:** GEN-03, GEN-04, GEN-05, GEN-06, VOICE-01, VOICE-02, VOICE-03
**Deliverables:**
- `generatePageAudio` Convex action (calls ElevenLabs `eleven_multilingual_v2`)
- EN voice configured (`ELEVENLABS_EN_VOICE_ID` env var)
- RO voice configured (`ELEVENLABS_RO_VOICE_ID` env var)
- Audio stored in Convex File Storage, URL saved to page record
- Rate limiting logic (≤100 req/min)
- Retry logic (up to 3 attempts, exponential backoff)
- Error states written to `audioJobs` table
- Integration test: generate audio for 1 page in each language and verify URL is playable

---

## Phase 3 — Generation Pipeline (Scheduler + Batch Trigger)
**Goal:** Admin can trigger bulk audio generation; a Convex scheduler processes jobs automatically.
**Requirements:** ADMIN-01, ADMIN-02, ADMIN-06
**Deliverables:**
- `startAudioBatch` mutation (creates `audioJobs` for missing pages, creates `audioGenBatches` record)
- `processAudioQueue` internal scheduled action (polls every 30s, processes 5 jobs/run)
- Batch auto-schedules until all jobs complete
- `getGenerationProgress` query (returns overall X/Y progress for admin UI)
- `startAudioBatch` accessible from admin API route

---

## Phase 4 — Admin Dashboard UI (Generation Management)
**Goal:** Admin can view audio generation status, trigger generation, and retry failures.
**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
**Deliverables:**
- New "Audio" section in admin dashboard (sidebar link)
- Progress panel: overall X/Y progress bar, per-language breakdown
- Books table column: audio status badge (none / partial / complete / failed)
- Per-book "Generate Audio" button (in book detail/edit page)
- Failed jobs list with error messages and "Retry" button
- "Retry All Failed" bulk action
- "Generate All Missing" bulk trigger button with confirmation modal

---

## Phase 5 — Audiobook Toggle UI (Mobile Reader)
**Goal:** User can toggle audiobook mode on/off from inside the book reader.
**Requirements:** AUDIO-01, AUDIO-04, AUDIO-05, ACCESS-01, ACCESS-02
**Deliverables:**
- Audiobook toggle button in book reader header (headphone icon)
- Toggle state persists for the duration of the reading session (Zustand or local state)
- When OFF: reader behaves exactly as before — zero regression
- When ON and audio not available for current language: toggle hidden or shows "Coming Soon"
- PREMIUM subscription check: non-subscribed users see locked icon pointing to paywall
- UI matches existing reader design system (no new design language)

---

## Phase 6 — Audio Playback Engine (Mobile)
**Goal:** When audiobook mode is ON, each page plays its audio and auto-turns when done.
**Requirements:** AUDIO-02, AUDIO-03, AUDIO-06, AUDIO-07, AUDIO-08
**Deliverables:**
- `useAudiobook` hook (load, play, pause, stop, completion callback)
- `Audio.setAudioModeAsync({ playsInSilentModeIOS: true })` set at app startup
- `expo-av` plugin added to `app.json`
- On page load with audiobook ON: fetch page's audio URL, play immediately
- On `didJustFinish`: trigger existing page-turn animation + sound (no new animation code)
- Preload next page's audio while current plays (seamless transition)
- Missing audio URL: silent no-op (no crash, no error toast)
- Old Sound object unloaded on every page change (no memory leak)
- Manual page turn by user while audio plays: stops audio, turns page normally

---

## Phase 7 — Language Switching
**Goal:** Audio language follows the user's app language selection, with graceful handling of missing translations.
**Requirements:** LANG-01, LANG-02, LANG-03
**Deliverables:**
- Audio URL resolved from `i18n.language` (maps `en` → `audioUrl_en`, `ro` → `audioUrl_ro`)
- When app language changes while book is open: current audio stops, new page audio loads in new language
- If `audioUrl_{lang}` is null for a page: audiobook continues (skips that page's narration silently)
- If no audio exists for the selected language for the entire book: toggle hidden

---

## Phase 8 — Initial Audio Seeding & QA
**Goal:** All published books have EN and RO audio generated and verified. Feature shipped.
**Requirements:** GEN-01 through GEN-06 (production run), all AUDIO/VOICE/LANG requirements
**Deliverables:**
- Initial generation batch triggered for all published books (EN + RO)
- Generation monitoring during run (admin dashboard showing progress)
- QA pass: 10 random books tested end-to-end (audio plays, page-turns correctly, language switch works)
- Voice quality spot-check: EN + RO samples reviewed and approved
- Performance test: no memory leak after reading 20 pages with audiobook ON
- Regression test: reading without audiobook ON unchanged
- Feature flag removed (audiobook is live for all PREMIUM users)

---

## Summary

| Phase | Name | Key Output |
|-------|------|-----------|
| 1 | Data Model | Convex schema with audio fields |
| 2 | TTS Integration | ElevenLabs action + storage |
| 3 | Generation Pipeline | Scheduler + batch trigger |
| 4 | Admin Dashboard UI | Generation management UI |
| 5 | Toggle UI | Audiobook on/off in reader |
| 6 | Playback Engine | Auto page-turn on finish |
| 7 | Language Switching | Follows app language |
| 8 | Seeding & QA | All books have audio, shipped |

**Estimated scope:** 8 phases × fine granularity = ~32-40 individual plans
