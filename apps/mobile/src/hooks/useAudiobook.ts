import { Audio, AVPlaybackStatus } from 'expo-av';
import { useRef, useCallback } from 'react';

/**
 * useAudiobook — manages expo-av Sound lifecycle for narration playback.
 *
 * Critical invariants:
 * - Every createAsync MUST be matched with unloadAsync before creating the next Sound.
 * - isStoppingRef prevents spurious didJustFinish triggers when user manually stops audio.
 *   Without this guard, stopAsync() causes the onPlaybackStatusUpdate callback to fire with
 *   didJustFinish=true, which would trigger a spurious auto page-turn.
 * - All async operations are fire-and-forget from the caller; errors are silently caught.
 */
export function useAudiobook() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const preloadRef = useRef<Audio.Sound | null>(null);
  // Guard: set true BEFORE stopAsync, reset AFTER processing the callback.
  const isStoppingRef = useRef(false);

  /**
   * stop — stops and unloads the current sound.
   * Sets isStoppingRef=true so the onPlaybackStatusUpdate callback ignores the
   * didJustFinish=true that expo-av fires during stopAsync().
   */
  const stop = useCallback(async () => {
    isStoppingRef.current = true;
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
      } catch {
        // stopAsync can throw if already stopped — safe to ignore
      }
      try {
        await sound.unloadAsync();
      } catch {
        // unloadAsync can throw if already unloaded — safe to ignore
      }
    }
    // Reset AFTER fully stopped so the callback (which may fire during stopAsync)
    // sees isStoppingRef=true and ignores the finish event.
    isStoppingRef.current = false;
  }, []);

  /**
   * playPage — loads and plays audio for a page URL.
   * AUDIO-06: If audioUrl is undefined/null/empty, silently no-ops (no crash, no toast).
   * Does NOT call stop() internally — caller must handle cleanup via effect returns.
   */
  const playPage = useCallback(async (
    audioUrl: string | undefined,
    onFinish: () => void
  ) => {
    if (!audioUrl) return; // AUDIO-06: silent no-op for missing URL

    // Unload any existing sound first (defensive, in case cleanup didn't finish)
    const prev = soundRef.current;
    soundRef.current = null;
    if (prev) {
      try { await prev.unloadAsync(); } catch { /* ignore */ }
    }

    try {
      isStoppingRef.current = false; // Ensure guard is clear before new playback
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (
            status.isLoaded &&
            status.didJustFinish &&
            !isStoppingRef.current
          ) {
            onFinish();
          }
        }
      );
      soundRef.current = sound;
    } catch (e) {
      console.warn('[useAudiobook] Failed to load/play audio:', e);
    }
  }, []);

  /**
   * preloadNext — loads the next page's audio without playing it (AUDIO-08).
   * Unloads the previous preload first to avoid Sound accumulation.
   * If audioUrl is missing, no-ops silently.
   */
  const preloadNext = useCallback(async (audioUrl: string | undefined) => {
    if (!audioUrl) return;

    // Unload previous preload before loading new one
    const prev = preloadRef.current;
    preloadRef.current = null;
    if (prev) {
      try { await prev.unloadAsync(); } catch { /* ignore */ }
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false } // Load into memory but do not start playback
      );
      preloadRef.current = sound;
    } catch {
      // Non-critical: preload failure just means a small gap when the page turns.
      // Do NOT crash or warn loudly — it will fall back to playPage loading fresh.
    }
  }, []);

  /**
   * playPreloaded — promotes the preloaded Sound to the active sound and plays it.
   * Returns true if a preloaded Sound was available, false if not (caller falls back to playPage).
   * If the preloaded sound exists, it sets the completion callback and calls playAsync().
   */
  const playPreloaded = useCallback(async (onFinish: () => void): Promise<boolean> => {
    const preloaded = preloadRef.current;
    if (!preloaded) return false;

    await stop(); // Unload current sound before promoting preload

    soundRef.current = preloaded;
    preloadRef.current = null;
    isStoppingRef.current = false;

    try {
      preloaded.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (
          status.isLoaded &&
          status.didJustFinish &&
          !isStoppingRef.current
        ) {
          onFinish();
        }
      });
      await preloaded.playAsync();
      return true;
    } catch (e) {
      console.warn('[useAudiobook] Failed to play preloaded sound:', e);
      soundRef.current = null;
      try { await preloaded.unloadAsync(); } catch { /* ignore */ }
      return false;
    }
  }, [stop]);

  /**
   * cleanup — unloads both current and preloaded sounds.
   * Call on component unmount and when audiobook is toggled OFF.
   */
  const cleanup = useCallback(async () => {
    await stop();
    const preloaded = preloadRef.current;
    preloadRef.current = null;
    if (preloaded) {
      try { await preloaded.unloadAsync(); } catch { /* ignore */ }
    }
  }, [stop]);

  return { playPage, stop, preloadNext, playPreloaded, cleanup };
}
