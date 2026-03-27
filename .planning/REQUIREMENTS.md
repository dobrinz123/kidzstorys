# Requirements: StoryKids Audiobook Feature

**Defined:** 2026-03-27
**Core Value:** Every child can hear their book read aloud in their native language, hands-free, with the same page-turn feel they love.

---

## v1 Requirements

### Audiobook Playback (Mobile)

- [ ] **AUDIO-01**: User can toggle audiobook mode on/off from a button inside any book
- [ ] **AUDIO-02**: Audio plays the current page text in the user's selected app language (EN or RO)
- [ ] **AUDIO-03**: When a page finishes playing, the page auto-turns (triggering existing page-turn animation and sound)
- [ ] **AUDIO-04**: Audiobook toggle state persists within the reading session (doesn't reset on page turn)
- [ ] **AUDIO-05**: When audiobook is off, book behaves exactly as before (no regression)
- [ ] **AUDIO-06**: Audio playback gracefully handles missing audio (no crash, silent fallback)
- [ ] **AUDIO-07**: App plays audio even when iOS silent/vibrate switch is on
- [ ] **AUDIO-08**: Next page's audio is preloaded while current page plays (no gap between pages)

### Voice Quality

- [ ] **VOICE-01**: English audio uses a warm, natural, child-appropriate neural voice
- [ ] **VOICE-02**: Romanian audio uses a natural, child-appropriate neural voice
- [ ] **VOICE-03**: Audio quality is perceptibly human (no robotic artifacts, natural prosody)

### Language Switching

- [ ] **LANG-01**: Audio language follows the user's selected app language (`i18n.language`)
- [ ] **LANG-02**: If user switches app language while a book is open, audiobook reloads in new language
- [ ] **LANG-03**: If audio for the selected language is unavailable, audiobook toggle is hidden for that book

### Access Control

- [ ] **ACCESS-01**: Audiobook feature is available to all users with active PREMIUM entitlement (RevenueCat)
- [ ] **ACCESS-02**: Non-subscribed users do not see the audiobook toggle (or see a locked state pointing to paywall)

### Audio Generation (Backend)

- [ ] **GEN-01**: Convex schema stores per-page audio URLs for EN and RO
- [ ] **GEN-02**: Convex schema tracks per-page generation status (pending / generating / done / failed)
- [ ] **GEN-03**: ElevenLabs `eleven_multilingual_v2` model used for all TTS generation
- [ ] **GEN-04**: Audio files stored in Convex File Storage and served via stable public URLs
- [ ] **GEN-05**: Generation respects ElevenLabs API rate limits (≤100 req/min)
- [ ] **GEN-06**: Failed generation jobs are retried automatically up to 3 times

### Admin Dashboard

- [ ] **ADMIN-01**: Admin can trigger audio generation for a specific book (EN, RO, or both)
- [ ] **ADMIN-02**: Admin can trigger bulk generation for all books with missing audio
- [ ] **ADMIN-03**: Admin can see generation status per book (none / partial / complete / failed)
- [ ] **ADMIN-04**: Admin can see a list of failed jobs with error messages
- [ ] **ADMIN-05**: Admin can manually retry failed jobs
- [ ] **ADMIN-06**: Admin dashboard shows overall progress (X/Y pages done with progress bar)

---

## v2 Requirements

### Enhanced Playback
- **AUDIO-V2-01**: Background audio playback (lock screen controls, notification media controls)
- **AUDIO-V2-02**: Playback speed controls (0.75x, 1x, 1.25x, 1.5x)
- **AUDIO-V2-03**: Offline audio caching (download book audio for offline playback)

### Voice Options
- **VOICE-V2-01**: User can choose from multiple voice options per language
- **VOICE-V2-02**: Italian language audio support

### Advanced Generation
- **GEN-V2-01**: Automatic re-generation when book page text is updated
- **GEN-V2-02**: Admin cost tracking (API calls used vs. budget)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Italian audio (v1) | EN + RO only per user requirement; IT deferred to v2 |
| Custom voice selection | Complexity; v2 if demand proven |
| Background playback | Additional permissions/complexity; v2 |
| Offline caching | Storage management complexity; v2 |
| Speed controls | UX scope; v2 |
| Separate audiobook paywall | All content gated by existing PREMIUM subscription |
| Real-time TTS (on-demand) | Pre-generation chosen for instant playback |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GEN-01, GEN-02 | Phase 1 | Pending |
| GEN-03, GEN-04, GEN-05, GEN-06 | Phase 2 | Pending |
| ADMIN-01, ADMIN-02, ADMIN-06 | Phase 3 | Pending |
| ADMIN-03, ADMIN-04, ADMIN-05 | Phase 4 | Pending |
| AUDIO-01, AUDIO-04, AUDIO-05 | Phase 5 | Pending |
| AUDIO-02, AUDIO-03, AUDIO-07, AUDIO-08 | Phase 6 | Pending |
| VOICE-01, VOICE-02, VOICE-03 | Phase 2 | Pending |
| LANG-01, LANG-02, LANG-03 | Phase 7 | Pending |
| ACCESS-01, ACCESS-02 | Phase 5 | Pending |
| GEN-01 through GEN-06 (seed run) | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 — initial audiobook milestone*
