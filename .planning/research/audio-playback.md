# Audio Playback Research

## Recommended Approach

Use **expo-av** (already installed at v16.0.8 — correct for Expo SDK 54). The `Audio.Sound` class provides everything needed: remote URL playback, completion detection via `didJustFinish`, memory management via `unloadAsync()`, and platform-consistent behavior.

**Do NOT use expo-audio** — it is a separate experimental package, not a replacement for expo-av in SDK 54.

---

## Key Finding: expo-av Already Exists in Codebase

The project already uses expo-av for the page-flip sound in `apps/mobile/app/story/[id].tsx`. The audiobook feature builds on the same infrastructure — just a second `Sound` object running in parallel.

---

## Implementation Pattern

```typescript
// useAudiobook.ts hook
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useRef, useState, useCallback } from 'react';

export function useAudiobook() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadAndPlay = useCallback(async (audioUrl: string, onFinish: () => void) => {
    // Unload any previous audio
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true },
      (status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            onFinish(); // ← triggers auto page-turn
          }
        }
      }
    );

    soundRef.current = sound;
  }, []);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
  }, []);

  const resume = useCallback(async () => {
    await soundRef.current?.playAsync();
  }, []);

  const stop = useCallback(async () => {
    await soundRef.current?.stopAsync();
    await soundRef.current?.unloadAsync();
    soundRef.current = null;
    setIsPlaying(false);
  }, []);

  return { loadAndPlay, pause, resume, stop, isPlaying };
}
```

---

## Completion Detection (Critical for Auto Page-Turn)

`didJustFinish` in `AVPlaybackStatusSuccess` fires **exactly once** when audio reaches the end. This is the trigger for auto page-turn:

```typescript
if (status.isLoaded && status.didJustFinish) {
  // Audio finished → trigger existing page-turn animation + sound
  handlePageTurn();
}
```

**Important:** This same callback also fires on pause, seek, and buffering events — always check `status.isLoaded` first.

---

## Integration with Existing Page-Turn

The existing reader already plays a page-flip sound and runs the turn animation. The audiobook's `onFinish` callback simply calls the **same** page-turn function that already exists — no new animation code needed.

```typescript
// In book reader component
const { loadAndPlay, stop } = useAudiobook();

const handlePageTurn = () => {
  // Existing page turn logic (animation + flip sound)
  turnPage();
};

// When audiobook mode is ON and user arrives at a page:
useEffect(() => {
  if (audiobookEnabled && currentPageAudioUrl) {
    loadAndPlay(currentPageAudioUrl, handlePageTurn);
  }
  return () => { stop(); }; // cleanup on unmount / page change
}, [currentPageIndex, audiobookEnabled]);
```

---

## app.json Configuration Needed

Add expo-av plugin to `apps/mobile/app.json`:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-localization",
      "expo-font",
      ["expo-av", {
        "microphonePermission": false
      }]
    ]
  }
}
```

---

## Audio Mode Setup

Set audio mode once at app startup (in root `_layout.tsx`):

```typescript
import { Audio } from 'expo-av';

await Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,   // play even on silent switch
  staysActiveInBackground: false, // v1: don't need background
  shouldDuckAndroid: true,       // lower volume of other apps
});
```

---

## Preloading Next Page

For seamless auto-turn, preload the next page's audio while current plays:

```typescript
const preloadRef = useRef<Audio.Sound | null>(null);

// While current page plays, preload next
const preloadNext = async (nextUrl: string) => {
  preloadRef.current = (await Audio.Sound.createAsync(
    { uri: nextUrl },
    { shouldPlay: false } // load but don't play
  )).sound;
};

// On page turn, swap refs:
const playPreloaded = async (onFinish: () => void) => {
  soundRef.current = preloadRef.current;
  preloadRef.current = null;
  await soundRef.current?.setOnPlaybackStatusUpdate(statusHandler);
  await soundRef.current?.playAsync();
};
```

---

## Gotchas & Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| iOS silent mode | Audio won't play | Set `playsInSilentModeIOS: true` in Audio.setAudioModeAsync |
| Memory leak | App crash over time | Always call `unloadAsync()` on page change / unmount |
| Double-play on fast page turn | Garbled audio | Unload current before loading next (sequential, not parallel load) |
| `didJustFinish` fires on stop | Spurious page turn | Track `userInitiatedStop` flag; ignore `didJustFinish` when true |
| Missing audio URL | Silent fail | Check URL exists before attempting `createAsync`; graceful no-op |
| Android Content-Type | Won't play | Ensure Convex serves `Content-Type: audio/mpeg` for MP3s |
