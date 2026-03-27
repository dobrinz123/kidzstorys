# StoryKids — Audiobook Feature

## What This Is

StoryKids is a children's storybook app (React Native / Expo) with an admin dashboard (Next.js) and Convex backend. This milestone adds **audiobook capabilities** to every book in the app — narrating each page in the user's selected language (English or Romanian) with a human-quality voice, auto page-turning when a page finishes playing, and a toggle to enable/disable audio from within any book.

## Core Value

Every child can hear their book read aloud in their native language, hands-free, with the same page-turn feel they love.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can toggle audiobook mode on/off from inside any book
- [ ] Audio plays in the user's selected app language (English or Romanian)
- [ ] Voice quality sounds 100% human (natural prosody, no robotic artifacts)
- [ ] Each page auto-turns when its audio finishes — preserving existing page-turn animation and sound
- [ ] Audio is pre-generated and stored (not synthesized at read time) for instant playback
- [ ] Admin can trigger/manage audio generation per book
- [ ] Audiobook is available to all subscribed users (no separate paywall)
- [ ] Audio gracefully handles missing/failed files without crashing the reader

### Out of Scope

- Custom voice selection per user — v2 if demand proven
- Offline audio caching — v2, complex storage management
- Background playback (lock screen controls) — v2
- Italian language audio — not in current scope (EN + RO only)
- Speed controls (0.5x, 1.5x, 2x) — v2

## Context

- **Existing i18n:** `react-i18next` + `expo-localization` already handles EN/RO/IT language switching — audio language should follow `i18n.language`
- **Existing page reader:** Book reader exists in `apps/mobile/app/book/` with page-turn animations and sound — audio must integrate without breaking these
- **Existing subscription gate:** RevenueCat already gates premium content — audiobook is premium but no new paywall logic needed
- **Backend:** Convex handles all data — audio URLs will be stored per-page per-language in Convex schema
- **No audio infrastructure exists** — TTS API integration, audio storage, and playback must be built from scratch
- **No tests exist** — audiobook code should be the first tested feature

## Constraints

- **Tech Stack:** Must use React Native compatible audio playback (expo-av or expo-audio)
- **Voice Quality:** Must use a high-quality neural TTS API (ElevenLabs, Google Cloud TTS Neural2, or Azure Neural) — not basic TTS
- **Language:** English and Romanian only for v1
- **Subscription:** Audiobook available to all RevenueCat `PREMIUM` entitlement holders
- **Page Turn:** Must preserve existing page-turn animation and sound — audio auto-turn is additive

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TTS API selection | Needs Romanian + English, human quality, cost-effective at scale | — Pending |
| Audio storage location | Convex file storage vs external CDN (Cloudflare R2, S3) | — Pending |
| Pre-generate vs on-demand | Pre-generate for instant playback; on-demand only as fallback | — Pending |

---
*Last updated: 2026-03-27 — initial audiobook milestone*
