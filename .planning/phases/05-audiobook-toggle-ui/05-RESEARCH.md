# Phase 5: Audiobook Toggle UI - Research

**Researched:** 2026-03-27
**Domain:** React Native UI (Expo), Zustand state management, RevenueCat subscription gating
**Confidence:** HIGH

## Summary

Phase 5 adds an audiobook toggle button inside the book reader, gated behind the existing PREMIUM subscription. The codebase is well-structured for this: the reader is a single file (`apps/mobile/app/story/[id].tsx`), state management uses Zustand stores in `src/store/`, subscription checks use `useSubscription` hook backed by RevenueCat, and the Convex query already returns audio fields via `...page` spread. The main work is: (1) adding a Zustand store for audiobook toggle state, (2) adding a headphone icon to the reader header, (3) gating visibility behind subscription + audio availability checks, and (4) ensuring the toggle state persists across page turns within a session.

**Primary recommendation:** Create an `audiobookStore.ts` Zustand store (session-only, not persisted to AsyncStorage), add a headphone toggle icon in the reader header between the title and page number, and conditionally render it based on `hasAccess` (from existing `useSubscription`) AND audio availability for the current language.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIO-01 | User can toggle audiobook mode on/off from a button inside any book | Header icon in `[id].tsx`, backed by Zustand store |
| AUDIO-04 | Audiobook toggle state persists within reading session (no reset on page turn) | Zustand store (not useState) holds `isAudiobookEnabled` per session |
| AUDIO-05 | When audiobook is off, book behaves exactly as before (no regression) | Toggle defaults to `false`; all audio logic behind `if (isAudiobookEnabled)` guards |
| ACCESS-01 | Audiobook available to PREMIUM users only | Existing `useSubscription(convexUser._id)` returns `hasAccess` |
| ACCESS-02 | Non-subscribed users see locked state or hidden toggle | Conditionally hide toggle or show lock icon; tap navigates to `/paywall` |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^4.5.5 | State management | Already used for `languageStore`, `userStore` |
| expo-av | ~16.0.8 | Audio playback (Phase 6, but referenced) | Already in package.json, used for page flip sound |
| react-native-reanimated | ~4.1.1 | Animations | Already used for page flip animations |
| expo-router | ^3.5.24 | Navigation | Already used; `router.replace("/paywall")` for paywall redirect |
| convex | ^1.16.0 | Backend queries | Already used; `usePublishedBook` fetches book with audio fields |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @expo/vector-icons | (bundled with Expo) | Headphone/lock icons | Toggle button icon in header |

**No new dependencies needed.** Everything required is already installed.

## Architecture Patterns

### File Inventory (existing files to modify or reference)

| File | Role | Modification Needed |
|------|------|-------------------|
| `apps/mobile/app/story/[id].tsx` | Book reader (single 1000+ line file) | Add toggle icon to header, import audiobookStore |
| `apps/mobile/src/store/languageStore.ts` | Zustand store pattern reference | Copy pattern for audiobookStore |
| `apps/mobile/src/store/userStore.ts` | Persisted Zustand store pattern | Reference but do NOT persist audiobook state |
| `apps/mobile/src/hooks/useSubscription.ts` | Subscription check | Already imported in reader; use `hasAccess` |
| `apps/mobile/src/hooks/useBooks.ts` | Book data hook + `ConvexBook` type | Type needs updating to include audio fields |
| `convex/books.ts` (line 832-843) | `getPublishedBookByKey` query | Already returns `...page` spread which includes audio fields |

### New Files to Create

```
apps/mobile/src/store/audiobookStore.ts   # Zustand store for audiobook toggle
```

### Pattern 1: Zustand Store (session-only, not persisted)
**What:** A minimal Zustand store holding `isAudiobookEnabled: boolean`.
**When to use:** Toggle state that must survive re-renders and page turns but NOT app restarts.
**Example:**
```typescript
// apps/mobile/src/store/audiobookStore.ts
import { create } from 'zustand';

interface AudiobookState {
  isAudiobookEnabled: boolean;
  toggleAudiobook: () => void;
  setAudiobookEnabled: (enabled: boolean) => void;
}

export const useAudiobookStore = create<AudiobookState>((set) => ({
  isAudiobookEnabled: false,
  toggleAudiobook: () => set((state) => ({ isAudiobookEnabled: !state.isAudiobookEnabled })),
  setAudiobookEnabled: (enabled) => set({ isAudiobookEnabled: enabled }),
}));
```

### Pattern 2: Header Layout in Reader
**What:** The reader header is a simple flexbox row with back button (left), title (center, flex:1), and page number (right).
**Where:** `[id].tsx` lines 757-767
**Current structure:**
```tsx
<View style={styles.header}>
  <TouchableOpacity style={styles.backButton} onPress={goBack}>
    <Text style={styles.backText}>{"\u2190"} {ui.back}</Text>
  </TouchableOpacity>
  <Text style={styles.title} numberOfLines={1}>{title}</Text>
  <Text style={styles.pageNumber}>{currentPage + 1} / {totalPages}</Text>
</View>
```
**Toggle placement:** Insert between `title` and `pageNumber`. The header uses `justifyContent: "space-between"` so adding a new element naturally positions it.

### Pattern 3: Subscription Gating (existing pattern)
**What:** The reader already checks subscription and redirects.
**Where:** `[id].tsx` lines 170-171, 544-548
```typescript
const { user: convexUser, isLoading: isAuthLoading } = useAuth();
const { hasAccess, isLoading: isSubLoading } = useSubscription(convexUser?._id ?? null);

// Redirect if no access
useEffect(() => {
  if (!isLoading && hasAccess === false) {
    router.replace("/paywall");
  }
}, [hasAccess, isLoading, router]);
```
**For audiobook toggle:** Use same `hasAccess` boolean. If `!hasAccess`, either hide the toggle entirely or show a lock icon that navigates to `/paywall` on tap.

### Pattern 4: Language Access (existing pattern)
**What:** Current language comes from Zustand languageStore.
**Where:** `[id].tsx` line 164
```typescript
const currentLang = useLanguageStore((state) => state.language);
```
**For audio availability:** Use `currentLang` to check `page.audioStatus_en` or `page.audioStatus_ro`.

### Anti-Patterns to Avoid
- **Don't use useState for toggle:** `useState` resets on re-render from page turn animation. Use Zustand store.
- **Don't add audio playback logic in Phase 5:** This phase is TOGGLE UI ONLY. Audio playback is Phase 6.
- **Don't check audio on every page individually for toggle visibility:** Check first page's audioStatus or a book-level flag. Toggle visibility should not flicker page-to-page.
- **Don't persist audiobook toggle to AsyncStorage:** Session-only state. User expects fresh start each time they open a book.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subscription check | Custom API call | `useSubscription` hook (existing) | Already handles RevenueCat, mock mode, Convex sync |
| State management | React Context / useState | Zustand store (existing pattern) | Consistent with codebase; survives page turns |
| Icons | Custom SVG components | `@expo/vector-icons` (Ionicons or MaterialCommunityIcons) | Bundled with Expo, no install needed |
| Navigation to paywall | Custom modal | `router.replace("/paywall")` (existing pattern) | Matches existing access-denied flow |

## Common Pitfalls

### Pitfall 1: Audio Fields Not in TypeScript Type
**What goes wrong:** The `ConvexBook` interface in `useBooks.ts` (line 32-64) does NOT include `audioUrl_en`, `audioUrl_ro`, `audioStatus_en`, `audioStatus_ro` fields in its `pages` type.
**Why it happens:** The type was written before audio fields were added to the schema.
**How to avoid:** Update the `ConvexBook` interface to include audio fields. The Convex query already returns them (it spreads `...page` on line 839).
**Warning signs:** TypeScript errors when accessing `page.audioUrl_en`.

### Pitfall 2: Toggle Flickers Between Pages
**What goes wrong:** If audiobook enabled state is in `useState`, it can reset during page flip animation (component re-render path).
**Why it happens:** Reanimated callbacks use `runOnJS` which can trigger re-render cycles.
**How to avoid:** Use Zustand store (external to component lifecycle).
**Warning signs:** Toggle visually resets to "off" during page flip.

### Pitfall 3: Checking Audio Availability Per-Page vs Per-Book
**What goes wrong:** Toggle appears/disappears as user flips through pages if some pages have audio and others don't.
**Why it happens:** Checking `currentPage.audioStatus` instead of checking book-level availability.
**How to avoid:** Check if ANY page in the book has `audioStatus_{lang} === "done"` once when book loads. Use this as the toggle visibility flag.
**Warning signs:** Toggle icon appearing and disappearing on different pages.

### Pitfall 4: Accessing Audio Fields for Wrong Language
**What goes wrong:** App checks `audioUrl_en` when user's language is Romanian, or vice versa.
**Why it happens:** Hardcoded language key instead of deriving from `currentLang`.
**How to avoid:** Build the field key dynamically: `audioUrl_${currentLang}` or use a helper function.
**Warning signs:** Toggle hidden even when audio exists for the active language.

### Pitfall 5: Static Story Fallback Has No Audio
**What goes wrong:** Trying to access audio fields on static story data (the `ALL_STORIES` fallback).
**Why it happens:** Only Convex books have audio. Static stories are legacy.
**How to avoid:** Only show audiobook toggle when `convexBook` is truthy (not static story fallback).
**Warning signs:** Undefined errors on static story pages.

## Code Examples

### Toggle Icon in Header
```tsx
// Inside the header View, between title and pageNumber
{convexBook && hasAccess && bookHasAudio && (
  <TouchableOpacity
    onPress={() => useAudiobookStore.getState().toggleAudiobook()}
    style={styles.audiobookToggle}
  >
    <Ionicons
      name={isAudiobookEnabled ? "headset" : "headset-outline"}
      size={24}
      color={isAudiobookEnabled ? BOOK_COLORS.buttonBg : BOOK_COLORS.textSecondary}
    />
  </TouchableOpacity>
)}

{/* Locked state for non-premium */}
{convexBook && !hasAccess && bookHasAudio && (
  <TouchableOpacity
    onPress={() => router.push("/paywall")}
    style={styles.audiobookToggle}
  >
    <Ionicons name="lock-closed-outline" size={20} color={BOOK_COLORS.textSecondary} />
  </TouchableOpacity>
)}
```

### Audio Availability Check
```typescript
// Compute once when book loads
const bookHasAudio = useMemo(() => {
  if (!convexBook) return false;
  const langKey = `audioStatus_${currentLang}` as const;
  return convexBook.pages.some(
    (page: any) => page[langKey] === "done"
  );
}, [convexBook, currentLang]);
```

### Updated ConvexBook Type (add to useBooks.ts)
```typescript
export interface ConvexBook {
  // ... existing fields ...
  pages: Array<{
    pageNumber: number;
    imageId?: string;
    legacyAssetKey?: string;
    imageUrl: string | null;
    text_en: string;
    text_ro: string;
    text_it: string;
    // Audio fields (added in Phase 1)
    audioUrl_en?: string;
    audioUrl_ro?: string;
    audioStatus_en?: "pending" | "generating" | "done" | "failed";
    audioStatus_ro?: "pending" | "generating" | "done" | "failed";
    audioStorageId_en?: string;
    audioStorageId_ro?: string;
    audioGeneratedAt_en?: number;
    audioGeneratedAt_ro?: number;
  }>;
}
```

## Data Flow Summary

```
Convex DB (books.pages[].audioUrl_en/ro, audioStatus_en/ro)
  |
  v
getPublishedBookByKey query (returns ...page spread, includes all fields)
  |
  v
usePublishedBook hook (convexBook object in reader)
  |
  v
[id].tsx reader component
  |-- reads currentLang from useLanguageStore
  |-- reads hasAccess from useSubscription
  |-- computes bookHasAudio from pages[].audioStatus_{lang}
  |-- reads isAudiobookEnabled from useAudiobookStore
  |
  v
Header renders: toggle icon (if convexBook + hasAccess + bookHasAudio)
                OR lock icon (if convexBook + !hasAccess + bookHasAudio)
                OR nothing (if no audio for this language / static story)
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None for mobile app (no test runner configured in apps/mobile/) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIO-01 | Toggle button renders in header | manual | Visual inspection in Expo Go | N/A |
| AUDIO-04 | Toggle persists across page turns | manual | Flip pages, verify toggle state | N/A |
| AUDIO-05 | No regression when audiobook off | manual | Read book normally end-to-end | N/A |
| ACCESS-01 | Premium users see toggle | manual | Login as premium, open book | N/A |
| ACCESS-02 | Non-premium see lock/hidden | manual | Login as free, open book | N/A |

### Sampling Rate
- **Per task commit:** Manual visual check in Expo Go
- **Per wave merge:** Full read-through of a book with audiobook toggle
- **Phase gate:** All 5 requirements manually verified

### Wave 0 Gaps
- No test infrastructure for mobile app UI (this is standard for Expo apps -- tests would require Detox or Maestro which are out of scope for v1)
- Verification is manual-only for this phase

## Planning Recommendations

### Task Breakdown Suggestion

**Task 1: Create audiobookStore.ts**
- New file: `apps/mobile/src/store/audiobookStore.ts`
- Minimal Zustand store: `isAudiobookEnabled`, `toggleAudiobook()`, `setAudiobookEnabled()`
- No persistence (session-only)

**Task 2: Update ConvexBook type**
- Modify `apps/mobile/src/hooks/useBooks.ts`
- Add audio fields to the `pages` array type in `ConvexBook` interface
- No runtime changes, TypeScript-only

**Task 3: Add toggle UI to reader header**
- Modify `apps/mobile/app/story/[id].tsx`
- Import `useAudiobookStore`, `Ionicons` (from `@expo/vector-icons`)
- Add `bookHasAudio` computed value (useMemo)
- Add toggle/lock icon to header between title and pageNumber
- Add styles for the toggle button
- Gate visibility: premium + audio available = toggle; non-premium + audio = lock; no audio = hidden

### Key Constraints for Planner
1. **Phase 5 is UI ONLY** -- no audio playback logic. The toggle sets state that Phase 6 will consume.
2. **Single file modification** for the reader -- `[id].tsx` is a large monolith (~1000 lines). All reader changes happen here.
3. **`convexBook` gates everything** -- static story fallback has no audio. Toggle only appears for Convex books.
4. **`hasAccess` is already available** in the reader (line 171). No new subscription logic needed.
5. **`currentLang` is already available** (line 164). Use it to derive `audioStatus_{lang}` field key.
6. **The Convex query already returns audio fields** -- the `...page` spread on line 839 of `convex/books.ts` includes all page fields from the schema.

## Sources

### Primary (HIGH confidence)
- `apps/mobile/app/story/[id].tsx` -- direct code inspection of reader component
- `apps/mobile/src/store/languageStore.ts` -- Zustand store pattern
- `apps/mobile/src/hooks/useSubscription.ts` -- subscription check pattern
- `apps/mobile/src/hooks/useBooks.ts` -- ConvexBook type definition
- `convex/schema.ts` -- audio field definitions in books.pages
- `convex/books.ts` lines 813-868 -- getPublishedBookByKey query returns `...page` spread

### Secondary (MEDIUM confidence)
- `.planning/research/audio-playback.md` -- expo-av patterns for Phase 6 (not needed in Phase 5 but informs toggle state design)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use
- Architecture: HIGH - patterns directly observed in codebase
- Pitfalls: HIGH - identified from actual code structure and type mismatches

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no moving targets, purely internal UI)
