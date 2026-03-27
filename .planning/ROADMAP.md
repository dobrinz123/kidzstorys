# Roadmap: StoryKids Audiobook Feature

## Overview

Eight phases taking StoryKids from its current state (no audio) to a fully-shipped audiobook feature: every published book narrated in English and Romanian, with auto page-turning, accessible to all PREMIUM subscribers.

## Phases

- [x] **Phase 1: Data Model** - Extend Convex schema with audio fields and generation job queue
- [ ] **Phase 2: TTS Integration** - ElevenLabs action, Convex file storage, voice configuration
- [ ] **Phase 3: Generation Pipeline** - Scheduler + batch trigger for bulk audio generation
- [x] **Phase 4: Admin Dashboard** - Generation management UI with progress, retry, status (completed 2026-03-27)
- [ ] **Phase 5: Audiobook Toggle UI** - On/off button in mobile reader with subscription check
- [ ] **Phase 6: Playback Engine** - Audio playback with auto page-turn on finish
- [ ] **Phase 7: Language Switching** - Audio follows app language (i18n), graceful fallback
- [ ] **Phase 8: Seeding & QA** - Initial bulk generation, QA, and feature ship

## Phase Details

### Phase 1: Data Model
**Goal**: Extend Convex schema to support per-page audio storage and generation job tracking.
**Depends on**: Nothing (first phase)
**Requirements**: [GEN-01, GEN-02]
**Success Criteria** (what must be TRUE):
  1. Convex schema has `audioUrl_en`, `audioUrl_ro`, `audioStorageId_en`, `audioStorageId_ro` fields on pages
  2. `audioJobs` table exists with pending/generating/done/failed status tracking per page + locale
  3. `audioGenBatches` table exists for batch run tracking
  4. TypeScript types generated and the app builds without errors
  5. Convex migration deployed to production environment

Plans:
- [x] 01-01: Extend pages schema with audio URL and storage ID fields
- [x] 01-02: Create audioJobs table with indexes
- [x] 01-03: Create audioGenBatches table and update TypeScript types

### Phase 2: TTS Integration
**Goal**: Convex internalAction (`generatePageAudio`) that calls ElevenLabs `eleven_multilingual_v2`, generates audio for a single page, and stores the MP3 in Convex File Storage — saving both the storageId and public URL back to the page record.
**Depends on**: Phase 1
**Requirements**: [GEN-03, GEN-04, GEN-05, GEN-06, VOICE-01, VOICE-02, VOICE-03]
**Success Criteria** (what must be TRUE):
  1. `generatePageAudio` internalAction calls ElevenLabs `eleven_multilingual_v2` model
  2. EN and RO voice IDs are configurable via Convex environment variables
  3. Generated audio stored in Convex File Storage and URL saved to page record
  4. audioStatus_{locale} transitions: pending -> generating -> done/failed on each page
  5. Failed jobs mark audioJobs record with errorMessage (retry delegated to Phase 3)
  6. 4 unit tests (convex-test + vitest) pass: EN happy path, RO happy path, 4xx error, empty text

**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Create convex/audio.ts with internalAction + helper queries/mutations
- [x] 02-02-PLAN.md — Write convex-test unit tests for generatePageAudio (4 scenarios)

### Phase 3: Generation Pipeline
**Goal**: Admin can trigger bulk audio generation; a Convex scheduler processes the job queue automatically.
**Depends on**: Phase 2
**Requirements**: [GEN-05, GEN-06, ADMIN-01, ADMIN-02, ADMIN-06]
**Success Criteria** (what must be TRUE):
  1. `startAudioBatch` mutation creates audioJobs for all pages missing audio for selected languages
  2. `processAudioQueue` internal action runs every 30s and processes pending jobs
  3. Batch auto-reschedules until all jobs complete
  4. `getGenerationProgress` query returns accurate X/Y counts for admin UI
  5. Batch completes with correct final status (completed or failed)

**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Create startAudioBatch mutation, getGenerationProgress query, startBulkAudioGeneration mutation
- [x] 03-02-PLAN.md — Create processAudioQueue internalAction + 4 DB helpers + cron entry (30s interval)

### Phase 4: Admin Dashboard UI
**Goal**: Admin can view generation status, trigger generation per-book or bulk, and retry failures.
**Depends on**: Phase 3
**Requirements**: [ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06]
**Success Criteria** (what must be TRUE):
  1. "Audio" section exists in admin sidebar navigation
  2. Progress panel shows X/Y pages done with progress bar and per-language breakdown
  3. Books table has audio status column (none/partial/complete/failed badge)
  4. Per-book "Generate Audio" button triggers generation for that book
  5. Failed jobs list shows error messages with per-job "Retry" button
  6. "Retry All Failed" bulk action works
  7. "Generate All Missing" button shows confirmation modal before triggering

**Plans:** 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md — Backend additions (getFailedJobs, retryFailedJob, getAudioOverview) + Sidebar Audio entry + ProgressBar + AudioStatusBadge
- [x] 04-02-PLAN.md — Full audio dashboard page (/dashboard/audio) + Books table audio column + per-book generate button

### Phase 5: Audiobook Toggle UI
**Goal**: User can toggle audiobook mode on/off from inside the book reader; feature respects subscription status.
**Depends on**: Phase 1
**Requirements**: [AUDIO-01, AUDIO-04, AUDIO-05, ACCESS-01, ACCESS-02]
**Success Criteria** (what must be TRUE):
  1. Headphone icon toggle button exists in book reader header
  2. Toggle state persists for the full reading session (doesn't reset on page turn)
  3. With audiobook OFF, reader behaves identically to current behavior
  4. Non-PREMIUM users see locked icon that navigates to paywall
  5. When no audio exists for current language, toggle is hidden or disabled

**Plans:** 2 plans

Plans:
- [x] 05-01-PLAN.md — Zustand audiobookStore (session-only) + ConvexBook type updated with audio fields
- [ ] 05-02-PLAN.md — Toggle/lock icon in reader header, bookHasAudio check, subscription gating, unmount reset

### Phase 6: Playback Engine
**Goal**: When audiobook mode is ON, each page plays its audio and auto-turns when the narration finishes.
**Depends on**: Phase 5
**Requirements**: [AUDIO-02, AUDIO-03, AUDIO-06, AUDIO-07, AUDIO-08]
**Success Criteria** (what must be TRUE):
  1. Audio plays automatically when audiobook is ON and user arrives at a page
  2. When audio finishes (`didJustFinish`), existing page-turn animation and sound trigger
  3. iOS silent/vibrate mode does not prevent audio playback
  4. Next page's audio is preloaded before current page finishes
  5. Missing audio URL causes silent no-op (no crash, no error toast)
  6. Sound object is unloaded on every page change (no memory leak after 20 pages)
  7. Manual page turn while audio plays stops audio and turns page normally

Plans:
- [ ] 06-01: Create useAudiobook hook with load/play/pause/stop/completion callback
- [ ] 06-02: Set Audio.setAudioModeAsync at app startup and add expo-av plugin to app.json
- [ ] 06-03: Integrate useAudiobook hook into book reader (auto-play on page load, auto-turn on finish)
- [ ] 06-04: Implement next-page audio preloading
- [ ] 06-05: Add edge case handling (missing URL, manual turn, unmount cleanup)

### Phase 7: Language Switching
**Goal**: Audio language follows the user's selected app language (EN/RO) with graceful handling of missing audio.
**Depends on**: Phase 6
**Requirements**: [LANG-01, LANG-02, LANG-03]
**Success Criteria** (what must be TRUE):
  1. Audio URL resolved from `i18n.language` (en → audioUrl_en, ro → audioUrl_ro)
  2. Changing app language while book is open stops current audio and loads new language
  3. Pages with no audio for selected language are skipped silently (no crash)
  4. Books with no audio for selected language show hidden/disabled toggle

Plans:
- [ ] 07-01: Map i18n.language to audioUrl field in useAudiobook hook
- [ ] 07-02: Add language-change listener to reload audio when language switches mid-book
- [ ] 07-03: Add per-page and per-book audio availability checks with graceful fallbacks

### Phase 8: Seeding & QA
**Goal**: All published books have EN and RO audio. Feature is live for all PREMIUM users.
**Depends on**: Phase 7
**Requirements**: All AUDIO, VOICE, LANG, ACCESS, GEN, ADMIN requirements (final validation)
**Success Criteria** (what must be TRUE):
  1. Initial generation batch completes for all published books (EN + RO)
  2. 10 random books tested end-to-end: audio plays, page turns correctly, language switch works
  3. Voice quality spot-check approved (EN + RO samples)
  4. No memory leak after reading 20+ pages with audiobook ON
  5. Regression test: reading without audiobook ON is unchanged
  6. All PREMIUM users can access audiobook feature without additional action

Plans:
- [ ] 08-01: Trigger and monitor initial generation batch for all published books
- [ ] 08-02: End-to-end QA pass (10 books, both languages, auto-turn, language switch)
- [ ] 08-03: Performance and memory leak test
- [ ] 08-04: Regression test suite for non-audiobook reading flow

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Model | 3/3 | Complete | 2026-03-27 |
| 2. TTS Integration | 2/2 | Complete | 2026-03-27 |
| 3. Generation Pipeline | 1/2 | In Progress | - |
| 4. Admin Dashboard UI | 2/2 | Complete   | 2026-03-27 |
| 5. Audiobook Toggle UI | 0/2 | Not started | - |
| 6. Playback Engine | 0/5 | Not started | - |
| 7. Language Switching | 0/3 | Not started | - |
| 8. Seeding & QA | 0/4 | Not started | - |
