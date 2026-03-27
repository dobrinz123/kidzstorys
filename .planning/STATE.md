---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 2
status: unknown
stopped_at: Completed 04-admin-dashboard-ui 04-01-PLAN.md
last_updated: "2026-03-27T20:03:25.746Z"
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 9
  completed_plans: 8
---

# STATE.md — Project Memory

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** Every child can hear their book read aloud in their native language, hands-free, with the same page-turn feel they love.
**Current focus:** Phase 04 — admin-dashboard-ui

---

## Current Status

**Phase:** 04 — admin-dashboard-ui (IN PROGRESS)
**Milestone:** v2.0 Audiobook
**Phases complete:** 3 / 8
**Plans complete:** 1 / 2 (phase 04) | 8 total
**Current Plan:** 2

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
| audioStatus design (01-01) | Optional union (undefined = no job created) to avoid spurious states on existing books |
| Snapshot mirroring (01-01) | bookVersions.snapshot.pages mirrors books.pages shape for complete version history |
| audioJobs page reference (01-02) | bookId + pageIndex (zero-based) — pages are embedded in books, no standalone page ID |
| audioJobs locale scope (01-02) | en and ro only — Italian excluded from v1 TTS generation |
| batchId type (01-02) | v.optional(v.string()) not v.id() — allows external scheduler batch identifiers |
| internalAction DB delegation (02-01) | getPageText/markGenerating/markDone/markFailed co-located in audio.ts — action uses ctx.runQuery/runMutation only |
| Empty-text guard in try block (02-01) | getPageText inside try so empty-text errors reach markFailed and persist to audioJobs |
| Computed key typing (02-01) | audioStatus_en/ro keys cast to explicit union types (not any) for TypeScript compliance |
| @edge-runtime/vm explicit dep (02-02) | vitest edge-runtime environment requires @edge-runtime/vm as explicit devDependency — not pulled in transitively |
| anyApi works with convex-test (02-02) | Generated api.js uses anyApi so internal.audio.generatePageAudio resolves at test runtime via glob — no dev server needed |
| AudioStatusBadge dot variant (04-01) | Uses dot variant of existing Badge for visual consistency with StatusBadge pattern |
| getAudioOverview scope (04-01) | Only counts published books — draft/ready excluded from audio progress metrics |

---

## Architecture Notes

- Audio URLs stored as `audioUrl_en` / `audioUrl_ro` on `pages` records in Convex
- Job queue (`audioJobs` table) tracks generation status per page + locale
- ElevenLabs called from Convex internal actions (server-side, API key never exposed to client)
- Mobile playback via `useAudiobook` hook wrapping expo-av
- Auto page-turn calls existing `turnPage()` function — no new animation code
- Unit tests run via `cd convex && npm test` (vitest, edge-runtime, convex-test)

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

Last session: 2026-03-27T20:03:25.742Z
Stopped at: Completed 04-admin-dashboard-ui 04-01-PLAN.md
Next action: Execute Phase 04 Plan 02 — full audio dashboard page

---
*Last updated: 2026-03-27 — Phase 04 plan 01 complete*
