# STATE.md — Project Memory

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** Every child can hear their book read aloud in their native language, hands-free, with the same page-turn feel they love.
**Current focus:** Phase 1 — Data Model & Schema

---

## Current Status

**Phase:** Not started — ready for `/gsd:plan-phase 1`
**Milestone:** v2.0 Audiobook
**Phases complete:** 0 / 8

---

## Key Decisions Made

| Decision | Outcome |
|----------|---------|
| TTS Provider | ElevenLabs (`eleven_multilingual_v2`) — best EN+RO quality |
| Audio Storage | Convex File Storage (native, zero extra infrastructure) |
| Language scope v1 | English + Romanian only |
| Playback library | expo-av (already installed, v16.0.8) |
| Access control | Existing RevenueCat PREMIUM entitlement — no new paywall |
| Generation model | Pre-generate + store (not on-demand) |
| Page-turn trigger | `didJustFinish` in expo-av AVPlaybackStatus |

---

## Architecture Notes

- Audio URLs stored as `audioUrl_en` / `audioUrl_ro` on `pages` records in Convex
- Job queue (`audioJobs` table) tracks generation status per page + locale
- ElevenLabs called from Convex internal actions (server-side, API key never exposed to client)
- Mobile playback via `useAudiobook` hook wrapping expo-av
- Auto page-turn calls existing `turnPage()` function — no new animation code

---

## Research Summary

| Topic | Finding | File |
|-------|---------|------|
| TTS API | ElevenLabs recommended (EN+RO, best voice quality) | research/tts-apis.md |
| Audio playback | expo-av already installed; use `didJustFinish` for page-turn | research/audio-playback.md |
| Audio storage | Convex File Storage — native, ~$0 for 10GB at current scale | research/audio-storage.md |
| Generation pipeline | Job queue in Convex DB + 30s scheduled action | research/generation-pipeline.md |

---

## Environment Variables Needed

```
ELEVENLABS_API_KEY=...
ELEVENLABS_EN_VOICE_ID=...   # warm children's EN voice
ELEVENLABS_RO_VOICE_ID=...   # Romanian voice
```

Set in Convex dashboard environment variables (not .env — these run server-side in Convex actions).

---

## Session Continuity

Last session: 2026-03-27 — project initialized, codebase mapped, research complete, REQUIREMENTS + ROADMAP created.
Next action: `/gsd:plan-phase 1` — Data Model & Schema

---
*Last updated: 2026-03-27 — initial project setup*
