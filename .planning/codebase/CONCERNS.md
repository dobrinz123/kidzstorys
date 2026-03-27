# CONCERNS.md — Technical Debt & Known Issues

## Critical

### Forced 2-Second Loading Timeout
- Dashboard layout and auth hook have a hardcoded 2s timeout that forces loading state to stop regardless of actual auth completion
- `useAuthStore.getState()` called inside effects creating potential stale closure issues
- **Impact:** Auth state may be incorrect; users could see content they shouldn't

### No Error Handling
- Only ~2 catch blocks found in all dashboard pages
- Failed Convex mutations surface no user feedback
- **Impact:** Silent failures; poor user experience

### Zero Tests
- No test files exist anywhere in the codebase
- No testing framework configured
- **Impact:** No regression safety net for any changes

---

## High

### Type Safety Violations
- `status as any` and `categoryId as any` in book listing component
- **Impact:** TypeScript protections bypassed; runtime errors possible

### Insecure Token Generation
- `generateId()` uses `Math.random()` instead of `crypto.getRandomValues()`
- **Impact:** Predictable session tokens (security risk)

### Memory-Based Search (No Pagination)
- `PAGE_SIZE = 500` — all books loaded into memory, filtered client-side
- No server-side search or cursor-based pagination
- **Impact:** Performance degrades significantly as book count grows

### JSON Clone Utility
- `JSON.parse(JSON.stringify(...))` used for deep cloning
- Breaks with circular references, `undefined` values, functions, `Date` objects
- **Impact:** Silent data corruption edge cases

### Missing Browser API Guards
- `localStorage` accessed in `useAuth` hook without `typeof window` check
- **Impact:** SSR crashes in Next.js admin

---

## Medium

### No Search Debouncing
- Search input in books page fires on every keystroke with no debounce
- **Impact:** Excessive re-renders / queries

### Toast ID Collisions
- Toast message IDs generated with `Math.random()` (no UUID)
- **Impact:** Rare duplicate toast suppression

### Hardcoded Timeouts
- 2s auth timeout is hardcoded, not configurable
- **Impact:** Brittle on slow connections

### No Auth Token Refresh
- Token expiry checked with fixed 1-minute buffer, no refresh logic
- **Impact:** Users silently logged out mid-session

### Image Upload Error Handling
- Blob URLs created without cleanup in error paths
- No handling for oversized files
- **Impact:** Memory leaks on failed uploads

---

## Low

### Console Warnings in Production
- `console.warn` statements in auth timeout code
- **Impact:** Noise in production logs

### Unused Code
- Redundant role check functions in `useRole` hook
- Duplicate icon rendering in books list table

### Inconsistencies
- Different error message formats across components
- `Button` variant usage inconsistent (ghost vs secondary)
- Timezone not specified in date formatting utilities

### Placeholder Content
- "Recent Activity" in dashboard is a "coming soon" placeholder
- Content audit page exists but has no implementation

---

## Relevance to Audiobook Feature

When implementing audiobooks, watch out for:
- **No audio infrastructure exists** — needs to be built from scratch
- **Memory concerns** — audio files will be large; avoid loading into memory like the current book search
- **No test coverage** — audiobook TTS + playback logic should be the first tested feature
- **i18n is ready** — EN/RO language switching infrastructure already exists via `react-i18next` + `expo-localization`
