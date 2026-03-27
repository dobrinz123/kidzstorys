# TESTING.md — Testing Setup & Coverage

## Current State

**No tests exist in this codebase.**

- Zero `.test.ts` / `.spec.ts` / `.test.tsx` files found
- No testing framework configured (no Jest, Vitest, React Testing Library, etc.)
- No test scripts in `package.json`
- No CI test pipeline configured

## Testing Infrastructure
- **Status:** Absent
- **Coverage:** 0%

## What Should Be Tested (gaps)

### Critical (untested)
- Authentication flow (login, signup, password reset)
- RevenueCat subscription logic and webhook handling
- Convex backend mutations (user creation, book CRUD, subscription updates)
- Story generation pipeline (Google AI integration)

### High Priority
- i18n translation key completeness (en/ro/it)
- Admin dashboard data queries
- Book/page data model integrity

### Nice to Have
- Component rendering smoke tests
- Expo Router navigation flows
- Paywall display logic

## Recommendations for New Feature Work
When implementing the audiobook feature, consider setting up:
- **Vitest** for unit tests (compatible with Convex and Next.js)
- **React Native Testing Library** for mobile component tests
- Test the TTS API integration with mocks
- Test language-switching behavior (EN/RO)
