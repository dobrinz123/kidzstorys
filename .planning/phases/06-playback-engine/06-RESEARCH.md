# Phase 6: Playback Engine - Research

**Researched:** 2026-03-27
**Domain:** expo-av audio playback, React Native audio lifecycle, auto page-turn integration
**Confidence:** HIGH

## Summary

Phase 6 adds actual audio playback to the reader. The audiobook toggle (Phase 5) already exists -- this phase makes it functional. When audiobook mode is ON, each page loads its narration audio from the `audioUrl_en` / `audioUrl_ro` field on the ConvexBook page, plays it via expo-av `Audio.Sound`, and auto-turns the page when `didJustFinish` fires in the playback status callback.

The codebase already uses expo-av for the page flip sound (`soundRef` in `[id].tsx`). The audiobook engine is a second `Audio.Sound` instance running alongside it, managed by a new `useAudiobook` hook. The critical integration point is calling `animateToPage(currentPage + 1)` -- the existing page-turn function -- when narration finishes.

**Primary recommendation:** Create a `useAudiobook` hook that encapsulates Sound lifecycle (load, play, stop, unload, preload-next) and exposes a simple `{ playPage, stop, isPlaying }` interface. Wire it into the reader via a `useEffect` that triggers on `currentPage` + `isAudiobookEnabled` changes.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIO-02 | Audio plays the current page text in the user's selected app language | audioUrl field selection by `currentLang` key; `useAudiobook` hook receives URL per page |
| AUDIO-03 | When a page finishes playing, the page auto-turns | `didJustFinish` in AVPlaybackStatus triggers `animateToPage(currentPage + 1)` |
| AUDIO-06 | Audio playback gracefully handles missing audio (no crash, silent fallback) | Guard: skip `loadAndPlay` if audioUrl is undefined/null; try-catch around createAsync |
| AUDIO-07 | App plays audio even when iOS silent/vibrate switch is on | `Audio.setAudioModeAsync({ playsInSilentModeIOS: true })` in `_layout.tsx` |
| AUDIO-08 | Next page's audio is preloaded while current page plays | Second `Audio.Sound` instance (`preloadRef`) loads next URL with `shouldPlay: false` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-av | ~16.0.8 | Audio playback (Sound API) | Already installed, locked decision in STATE.md |
| zustand | ^4.5.5 | Audiobook toggle state | Already used for `useAudiobookStore` |

### Important Notes

**expo-av deprecation:** expo-av is deprecated as of SDK 54 and removed in SDK 55. The replacement is `expo-audio` (production-ready in SDK 54). However, the project already uses expo-av for the page flip sound and STATE.md locks this choice. Staying with expo-av is correct for this phase. Migration to expo-audio is a v2 concern when the project upgrades to SDK 55.

**expo-audio NOT needed now:** Do not install or use expo-audio. The page flip sound and audiobook playback should use the same library (expo-av) to avoid two audio subsystems in one app.

### Installation
No new packages needed. expo-av ~16.0.8 is already installed.

## Architecture Patterns

### New File Structure
```
apps/mobile/src/hooks/
  useAudiobook.ts          # NEW - audio playback hook
apps/mobile/app/
  _layout.tsx              # MODIFY - add Audio.setAudioModeAsync
  story/[id].tsx           # MODIFY - wire useAudiobook into reader
apps/mobile/app.json       # MODIFY - add expo-av plugin (optional)
```

### Pattern 1: useAudiobook Hook
**What:** Encapsulates expo-av Sound lifecycle for narration audio.
**When to use:** Any component that needs to play page-by-page narration.

```typescript
// apps/mobile/src/hooks/useAudiobook.ts
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useRef, useCallback } from 'react';

export function useAudiobook() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const preloadRef = useRef<Audio.Sound | null>(null);
  const isStoppingRef = useRef(false); // prevents spurious didJustFinish on manual stop

  const stop = useCallback(async () => {
    isStoppingRef.current = true;
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    isStoppingRef.current = false;
  }, []);

  const playPage = useCallback(async (
    audioUrl: string | undefined,
    onFinish: () => void
  ) => {
    // AUDIO-06: graceful no-op if URL missing
    if (!audioUrl) return;

    await stop();

    try {
      isStoppingRef.current = false;
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish && !isStoppingRef.current) {
            onFinish();
          }
        }
      );
      soundRef.current = sound;
    } catch (e) {
      // AUDIO-06: silent fallback on load failure
      console.warn('[useAudiobook] Failed to load audio:', e);
    }
  }, [stop]);

  const preloadNext = useCallback(async (audioUrl: string | undefined) => {
    if (!audioUrl) return;
    // Unload previous preload
    if (preloadRef.current) {
      await preloadRef.current.unloadAsync();
      preloadRef.current = null;
    }
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false } // load only, don't play
      );
      preloadRef.current = sound;
    } catch {
      // Non-critical: preload failure just means a small gap
    }
  }, []);

  const playPreloaded = useCallback(async (onFinish: () => void) => {
    if (!preloadRef.current) return false;
    await stop();
    soundRef.current = preloadRef.current;
    preloadRef.current = null;
    isStoppingRef.current = false;
    soundRef.current.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish && !isStoppingRef.current) {
        onFinish();
      }
    });
    await soundRef.current.playAsync();
    return true;
  }, [stop]);

  const cleanup = useCallback(async () => {
    await stop();
    if (preloadRef.current) {
      await preloadRef.current.unloadAsync();
      preloadRef.current = null;
    }
  }, [stop]);

  return { playPage, stop, preloadNext, playPreloaded, cleanup };
}
```

### Pattern 2: Reader Integration
**What:** Wire useAudiobook into the existing reader via useEffect.
**Critical:** `animateToPage` is the ONLY page-turn function. It handles animation, flip sound, image preloading, and state update.

```typescript
// Inside StoryReader component
const { playPage, stop, preloadNext, playPreloaded, cleanup } = useAudiobook();

// Get audio URL for current page
const currentAudioUrl = useMemo(() => {
  if (!convexBook) return undefined;
  const page = convexBook.pages[currentPage];
  if (!page) return undefined;
  const key = `audioUrl_${currentLang}` as 'audioUrl_en' | 'audioUrl_ro';
  return page[key];
}, [convexBook, currentPage, currentLang]);

// Get audio URL for NEXT page (for preloading)
const nextAudioUrl = useMemo(() => {
  if (!convexBook) return undefined;
  const page = convexBook.pages[currentPage + 1];
  if (!page) return undefined;
  const key = `audioUrl_${currentLang}` as 'audioUrl_en' | 'audioUrl_ro';
  return page[key];
}, [convexBook, currentPage, currentLang]);

// Auto-play when page changes and audiobook is enabled
useEffect(() => {
  if (!isAudiobookEnabled) return;

  const autoTurn = () => {
    // Use animateToPage — the existing page-turn function
    animateToPage(currentPageRef.current + 1);
  };

  playPage(currentAudioUrl, autoTurn);
  // Preload next page audio
  if (nextAudioUrl) {
    preloadNext(nextAudioUrl);
  }

  return () => { stop(); };
}, [currentPage, isAudiobookEnabled, currentAudioUrl]);

// Cleanup on unmount or audiobook toggle off
useEffect(() => {
  if (!isAudiobookEnabled) {
    stop();
  }
  return () => { cleanup(); };
}, [isAudiobookEnabled]);
```

### Pattern 3: Audio Mode Setup (AUDIO-07)
**What:** Configure iOS silent mode override at app startup.
**Where:** `_layout.tsx`, called once on mount.

```typescript
// In _layout.tsx RootLayout component
useEffect(() => {
  Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false, // v1: no background playback
    shouldDuckAndroid: true,
  });
}, []);
```

### Anti-Patterns to Avoid
- **Creating Sound in render:** Never call `Audio.Sound.createAsync` outside useEffect/useCallback. It triggers side effects on every render.
- **Forgetting unloadAsync:** Every `createAsync` MUST have a matching `unloadAsync`. Without it, Sound objects accumulate and crash the app.
- **Calling animateToPage from worklet thread:** `animateToPage` uses React state. Always call via `runOnJS` if from reanimated, or call directly from JS thread (which `didJustFinish` callback already is).
- **Ignoring isStoppingRef:** Without this flag, manually stopping audio triggers `didJustFinish` which causes a spurious auto-turn. The `isStoppingRef` guard is essential.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio playback | Custom WebView audio player | expo-av Audio.Sound | Already installed, handles codec/format/platform differences |
| Completion detection | Polling positionMillis vs durationMillis | `didJustFinish` callback | Built-in, fires exactly once, no timer drift |
| iOS silent mode | Custom AVAudioSession bridge | `Audio.setAudioModeAsync` | One-liner, handles all iOS categories |
| Audio preloading | Manual fetch + cache MP3 blobs | `Audio.Sound.createAsync({ shouldPlay: false })` | expo-av handles HTTP caching internally |

## Common Pitfalls

### Pitfall 1: didJustFinish Fires on Manual Stop
**What goes wrong:** User swipes to next page manually. `stop()` is called. `didJustFinish` fires. Auto-turn triggers a SECOND page turn.
**Why it happens:** expo-av fires status updates during `stopAsync()`, and `didJustFinish` can be true.
**How to avoid:** Use `isStoppingRef.current = true` before calling `stopAsync()`. Check `!isStoppingRef.current` in the callback before calling `onFinish`.
**Warning signs:** Pages skip by 2 when user swipes during narration.

### Pitfall 2: Android didJustFinish Not Resetting (expo/expo#34301)
**What goes wrong:** On Android, `didJustFinish` stays `true` across sequential tracks, causing instant "finish" on the next track.
**Why it happens:** Known Android bug in expo-av (reported on SDK 52, fixed May 2025).
**How to avoid:** Project uses expo-av 16.0.8 (SDK 54) which includes the fix. If symptoms appear, workaround: call `sound.setStatusAsync({ positionMillis: 0 })` before playing or use `replayAsync()`.
**Warning signs:** Pages auto-turn immediately without audio playing.

### Pitfall 3: Memory Leak from Un-unloaded Sounds
**What goes wrong:** App memory grows with each page turn until crash.
**Why it happens:** Each `createAsync` allocates native resources. Without `unloadAsync`, they accumulate.
**How to avoid:** Always `unloadAsync()` previous Sound before creating new one. Also clean up preloaded Sound on unmount.
**Warning signs:** Increasing memory usage in profiler, iOS low-memory warnings.

### Pitfall 4: Race Condition on Fast Page Turns
**What goes wrong:** User swipes rapidly. Multiple `createAsync` calls overlap. Two audio tracks play simultaneously.
**Why it happens:** `createAsync` is async. If user swipes before previous `stop()` completes, both old and new sounds play.
**How to avoid:** The `stop()` call in `playPage` is sequential (`await stop()` then `createAsync`). This serializes transitions. Additionally, `isFlipping` state prevents gesture-based page turns during animation.
**Warning signs:** Overlapping audio, garbled playback.

### Pitfall 5: Auto-Turn on Last Page
**What goes wrong:** Narration finishes on last page and tries to turn to a non-existent page.
**Why it happens:** `animateToPage` is called with `currentPage + 1` which equals `totalPages`.
**How to avoid:** `animateToPage` already has a bounds check: `if (targetPage >= totalPagesRef.current) return`. No extra guard needed, but verify this works.
**Warning signs:** Crash or blank screen after last page audio finishes.

### Pitfall 6: Missing Audio Mode Setup
**What goes wrong:** Audio plays fine in development but is silent when iOS silent switch is on in production.
**Why it happens:** `Audio.setAudioModeAsync({ playsInSilentModeIOS: true })` was never called.
**How to avoid:** Call it once in `_layout.tsx` on mount. Test by toggling iOS silent switch.
**Warning signs:** Audio works in Expo Go but not in TestFlight build with silent switch on.

## Code Examples

### Getting Audio URL for Current Page and Language

```typescript
// Source: apps/mobile/src/hooks/useBooks.ts - ConvexBook type
// Pages have: audioUrl_en?, audioUrl_ro?, audioStatus_en?, audioStatus_ro?

const getAudioUrl = (
  book: ConvexBook,
  pageIndex: number,
  lang: 'en' | 'ro'
): string | undefined => {
  const page = book.pages[pageIndex];
  if (!page) return undefined;
  const statusKey = `audioStatus_${lang}` as const;
  const urlKey = `audioUrl_${lang}` as const;
  // Only return URL if generation is complete
  if (page[statusKey] !== 'done') return undefined;
  return page[urlKey];
};
```

### Existing Page Turn Function (animateToPage)

```typescript
// Source: apps/mobile/app/story/[id].tsx lines 339-388
// This is the ONLY page turn function. It:
// 1. Checks bounds (targetPage < 0 || >= totalPages → return)
// 2. Checks isFlipping (prevents double-turn)
// 3. Ensures target page image is preloaded
// 4. Plays flip sound
// 5. Runs slide animation via reanimated
// 6. Sets currentPage state via runOnJS(setCurrentPage)(targetPage)
// 7. Clears isFlipping when animation completes

const animateToPage = useCallback(async (targetPage: number) => {
  if (isFlippingRef.current) return;
  if (targetPage < 0 || targetPage >= totalPagesRef.current) return;
  // ... animation logic
}, [slideX, width, ensurePagePreloaded]);
```

### Existing Flip Sound Pattern

```typescript
// Source: apps/mobile/app/story/[id].tsx lines 134-174
// The page flip sound is loaded once on mount, played via replayAsync, unloaded on unmount.
// The audiobook hook follows the same pattern but with remote URLs and completion detection.

const soundRef = useRef<Audio.Sound | null>(null);
useEffect(() => {
  const loadSound = async () => {
    const { sound } = await Audio.Sound.createAsync(PAGE_FLIP_SOUND);
    soundRef.current = sound;
  };
  loadSound();
  return () => { soundRef.current?.unloadAsync(); };
}, []);

const playFlipSound = useCallback(async () => {
  await soundRef.current?.replayAsync();
}, []);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-av Audio.Sound | expo-audio useAudioPlayer | SDK 53 (2025) | expo-av deprecated SDK 54, removed SDK 55 |
| Manual Sound lifecycle | Hook-based (useAudioPlayer) | SDK 53 | Auto-cleanup, simpler API |

**For this phase:** Stay with expo-av. It works in SDK 54. Migration is a v2 task.

**Deprecated/outdated:**
- expo-av: Deprecated in SDK 54, removed in SDK 55. Plan migration to expo-audio when upgrading to SDK 55.

## app.json Configuration

The expo-av plugin should be added to app.json for proper native configuration:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-localization",
      "expo-font",
      ["expo-av", { "microphonePermission": false }]
    ]
  }
}
```

**Note:** `microphonePermission: false` ensures the app does not request microphone access (playback only, no recording). This avoids an unnecessary permission prompt.

**Background audio is NOT needed for v1.** Do not add `UIBackgroundModes: ["audio"]` to infoPlist.

## Planning Recommendations

### Task Breakdown (suggested order)

1. **Audio mode setup** (AUDIO-07): Add `Audio.setAudioModeAsync` to `_layout.tsx`. Add expo-av plugin to app.json. Small, self-contained, enables all subsequent work.

2. **useAudiobook hook** (AUDIO-02, AUDIO-06, AUDIO-08): Create `apps/mobile/src/hooks/useAudiobook.ts` with `playPage`, `stop`, `preloadNext`, `playPreloaded`, `cleanup`. Include `isStoppingRef` guard. Include try-catch for graceful failure.

3. **Reader integration** (AUDIO-02, AUDIO-03): Wire `useAudiobook` into `[id].tsx`. Add `currentAudioUrl` / `nextAudioUrl` memos. Add `useEffect` for auto-play on page change. Wire `onFinish` to `animateToPage(currentPage + 1)`.

4. **Manual turn handling**: Ensure that when user swipes during playback, `stop()` is called BEFORE `animateToPage` proceeds. The useEffect cleanup (`return () => { stop(); }`) handles this because `currentPage` changes trigger cleanup of previous effect.

5. **Edge cases and cleanup**: Handle last page (no auto-turn), unmount cleanup, audiobook toggle off mid-playback, language change mid-playback.

### Key Integration Points

| What | Where | How |
|------|-------|-----|
| Audio mode | `_layout.tsx` line ~13 (useEffect) | `Audio.setAudioModeAsync(...)` |
| Page audio URL | `[id].tsx` new useMemo | `convexBook.pages[currentPage].audioUrl_{lang}` |
| Auto-play trigger | `[id].tsx` new useEffect | Depends on `[currentPage, isAudiobookEnabled]` |
| Auto-turn callback | `[id].tsx` inside useEffect | `() => animateToPage(currentPageRef.current + 1)` |
| Manual stop | `[id].tsx` useEffect cleanup | `return () => { stop(); }` |
| Toggle off | `[id].tsx` separate useEffect | `if (!isAudiobookEnabled) stop()` |

### Testing Strategy

Manual testing is primary for audio playback (no automated audio assertion possible in unit tests):

| Scenario | What to verify |
|----------|----------------|
| Toggle ON, page has audio | Audio plays, page auto-turns when done |
| Toggle ON, page missing audio | No crash, page sits silently, no auto-turn |
| Toggle OFF during playback | Audio stops immediately |
| Swipe during playback | Audio stops, page turns normally, new page audio starts |
| Last page finishes | Audio plays, no auto-turn attempted, no crash |
| iOS silent switch ON | Audio still plays (AUDIO-07) |
| Rapid page swiping | No overlapping audio, no crash |
| Toggle ON then OFF then ON | Clean state each time, no residual sounds |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual testing (audio playback cannot be unit-tested meaningfully) |
| Config file | N/A |
| Quick run command | `cd apps/mobile && npx expo start` |
| Full suite command | Manual test matrix above |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIO-02 | Audio plays current page in selected language | manual | Expo Go: toggle audiobook, verify audio plays | N/A |
| AUDIO-03 | Auto page-turn on narration finish | manual | Let audio finish, verify page turns | N/A |
| AUDIO-06 | Graceful handling of missing audio | manual | Open book with incomplete audio, verify no crash | N/A |
| AUDIO-07 | Plays with iOS silent switch on | manual | Toggle silent switch, verify audio | N/A |
| AUDIO-08 | Preload next page audio | manual | Listen for gap between pages (should be < 200ms) | N/A |

### Wave 0 Gaps
None -- this phase is primarily integration code with manual verification. No test framework setup needed.

## Open Questions

1. **Convex audio URL availability:** Are there books with completed audio generation (audioStatus = "done") to test against? If not, the playback engine can be built but needs test data from Phase 8 (seed run).
   - What we know: Phase 2 built the generation pipeline, Phase 3/4 built admin controls.
   - What's unclear: Whether any books have been processed yet.
   - Recommendation: If no audio data exists, create a test fixture with a known public MP3 URL for development.

2. **animateToPage and audiobook interaction timing:** When `didJustFinish` fires and calls `animateToPage`, this sets `currentPage` which triggers the useEffect to play the next page. But `animateToPage` is async (animation duration ~550ms). The useEffect fires on `currentPage` state change, which happens mid-animation via `runOnJS(setCurrentPage)(targetPage)`.
   - What we know: The setCurrentPage call happens during the animation (line 370), not after it completes.
   - What's unclear: Whether starting next audio during page-turn animation causes any perceivable issue.
   - Recommendation: This is actually desirable -- audio starts loading/playing slightly before animation finishes, reducing perceived gap. No action needed.

## Sources

### Primary (HIGH confidence)
- [expo-av SDK 54 docs](https://docs.expo.dev/versions/v54.0.0/sdk/audio-av/) - Audio.Sound API, setAudioModeAsync, AVPlaybackStatus
- `apps/mobile/app/story/[id].tsx` - Existing reader code, animateToPage function, page flip sound pattern
- `apps/mobile/src/store/audiobookStore.ts` - Zustand toggle store
- `apps/mobile/src/hooks/useBooks.ts` - ConvexBook type with audio fields
- `.planning/research/audio-playback.md` - Prior research with implementation patterns

### Secondary (MEDIUM confidence)
- [expo-audio SDK 54 docs](https://docs.expo.dev/versions/v54.0.0/sdk/audio/) - Replacement library API (for future reference)
- [expo/expo#34301](https://github.com/expo/expo/issues/34301) - Android didJustFinish bug (fixed May 2025)
- [expo/expo#37259](https://github.com/expo/expo/issues/37259) - expo-av deprecation timeline

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - expo-av 16.0.8 verified installed, API confirmed via official docs
- Architecture: HIGH - existing reader code fully analyzed, integration points identified
- Pitfalls: HIGH - known issues documented with specific mitigations

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- expo-av API frozen since deprecated)
