---
phase: 06-playback-engine
plan: 01
subsystem: audio
tags: [expo-av, audio, react-native, hooks, ios-silent-mode]

# Dependency graph
requires:
  - phase: 01-data-model
    provides: ConvexBook page schema with audioUrl_en/audioUrl_ro fields
provides:
  - useAudiobook hook with playPage, stop, preloadNext, playPreloaded, cleanup
  - iOS silent mode audio override via Audio.setAudioModeAsync
  - expo-av plugin configuration in app.json
affects: [06-02-reader-integration, playback-engine]

# Tech tracking
tech-stack:
  added: []
  patterns: [isStoppingRef guard for expo-av didJustFinish spurious fires, fire-and-forget audio with silent error handling]

key-files:
  created: [apps/mobile/src/hooks/useAudiobook.ts]
  modified: [apps/mobile/app/_layout.tsx, apps/mobile/app.json]

key-decisions:
  - "isStoppingRef guard pattern to prevent spurious auto-turn when manually stopping audio"
  - "All audio errors caught silently with console.warn — no user-facing error toasts for missing audio"
  - "microphonePermission:false in expo-av plugin — playback only, no recording"

patterns-established:
  - "useAudiobook hook: centralized Sound lifecycle management for narration"
  - "isStoppingRef: set true before stopAsync, check in onPlaybackStatusUpdate before calling onFinish"
  - "Preload pattern: createAsync with shouldPlay:false for next page audio"

requirements-completed: [AUDIO-02, AUDIO-06, AUDIO-07, AUDIO-08]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 6 Plan 1: Audio Engine Setup Summary

**useAudiobook hook with expo-av Sound lifecycle management, iOS silent mode override, and next-page audio preloading**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T20:58:51Z
- **Completed:** 2026-03-27T21:02:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- iOS silent mode override configured via Audio.setAudioModeAsync in app root layout
- expo-av plugin added to app.json with microphonePermission:false (playback only)
- useAudiobook hook created with full Sound lifecycle: playPage, stop, preloadNext, playPreloaded, cleanup
- isStoppingRef guard prevents spurious auto-turn when user manually stops audio

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Audio.setAudioModeAsync and expo-av plugin** - `49b8422` (feat)
2. **Task 2: Create useAudiobook hook** - `3821cdd` (feat)

## Files Created/Modified
- `apps/mobile/src/hooks/useAudiobook.ts` - Core audio playback hook managing expo-av Sound lifecycle
- `apps/mobile/app/_layout.tsx` - Added Audio import and setAudioModeAsync for iOS silent mode
- `apps/mobile/app.json` - Added expo-av plugin with microphonePermission:false

## Decisions Made
- isStoppingRef guard pattern: set true before stopAsync, checked in onPlaybackStatusUpdate to prevent spurious didJustFinish triggering auto page-turn
- All audio errors caught silently (console.warn only) -- no user-facing toasts for missing audio (AUDIO-06)
- microphonePermission:false in expo-av plugin -- app only plays audio, never records
- staysActiveInBackground:false -- background playback is a v2 feature

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pre-existing TypeScript error in convex/crons.ts (unrelated to this plan) was the only compiler output.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all functions are fully implemented with proper error handling.

## Next Phase Readiness
- useAudiobook hook ready to be wired into story reader component (Plan 06-02)
- Hook exposes clean interface: { playPage, stop, preloadNext, playPreloaded, cleanup }
- Reader integration needs: currentAudioUrl/nextAudioUrl memos, useEffect for auto-play, onFinish wired to animateToPage

---
*Phase: 06-playback-engine*
*Completed: 2026-03-27*
