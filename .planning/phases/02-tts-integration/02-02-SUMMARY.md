---
phase: 02-tts-integration
plan: "02"
subsystem: testing
tags: [convex-test, vitest, elevenlabs, tts, unit-tests, edge-runtime]

# Dependency graph
requires:
  - phase: 02-tts-integration
    plan: "01"
    provides: [convex/audio.ts with generatePageAudio internalAction, getPageText/markGenerating/markDone/markFailed helpers]
provides:
  - convex/audio.test.ts with 4 unit tests for generatePageAudio (EN happy, RO happy, 4xx error, empty text)
  - convex/vitest.config.ts with edge-runtime environment
  - convex-test + vitest + @edge-runtime/vm installed as devDependencies
affects: [phase-03-batch-scheduler, any caller of internal.audio.generatePageAudio]

# Tech tracking
tech-stack:
  added: [convex-test@0.0.44, vitest@4.1.2, @vitest/runner@4.1.2, @edge-runtime/vm@5.0.0]
  patterns:
    - convex-test-action-testing: t.action(internal.audio.X, args) invokes internalAction in isolated test environment
    - vi-stubGlobal-fetch: stub fetch globally per test then unstub in afterEach to prevent test pollution
    - process-env-stub: set process.env.* in beforeEach, delete in afterEach for env var isolation
    - t-run-for-seeding: use t.run(async ctx => ctx.db.insert(...)) to seed test data in mutation context

key-files:
  created:
    - convex/audio.test.ts
    - convex/vitest.config.ts
  modified:
    - convex/package.json

key-decisions:
  - "@edge-runtime/vm required as explicit devDependency — vitest edge-runtime environment does not pull it in transitively"
  - "convexTest(schema, import.meta.glob('./**/*.ts')) pattern works with anyApi generated file — audio module resolved at test runtime"
  - "fetch mock covers both Convex storage.store internal fetch and ElevenLabs call — only ElevenLabs URL prefix matched"

patterns-established:
  - "convex-test with edge-runtime: vitest.config.ts must set environment: 'edge-runtime' and inline: ['convex-test']"
  - "Env var injection for convex actions: set process.env in beforeEach, clean up in afterEach"
  - "t.run for DB assertions: read back state after t.action() completes to verify side effects"

requirements-completed: [GEN-03, GEN-04, GEN-05, GEN-06, VOICE-01, VOICE-02, VOICE-03]

# Metrics
duration: 10min
completed: 2026-03-27
---

# Phase 2 Plan 02: generatePageAudio Unit Tests Summary

**4-test convex-test + vitest suite for `generatePageAudio` covering EN/RO happy paths, ElevenLabs 4xx error, and empty page text — all 4 pass in ~50ms with fetch fully stubbed via `vi.stubGlobal`.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-27T21:00:00Z
- **Completed:** 2026-03-27T21:02:30Z
- **Tasks:** 2
- **Files modified:** 3 (1 created test, 1 created config, 1 updated package.json)

## Accomplishments

- All 4 vitest tests pass (`npm test` exits 0 in convex/ directory)
- No real ElevenLabs HTTP calls — fetch stubbed per test with `vi.stubGlobal`
- Tests verify both `audioJobs` record state AND `books.pages[0]` state after action runs
- RO voice ID path confirmed: Test 2 asserts `fetchMock.mock.calls[0][0]` contains `voice-ro-test`
- Job failure path confirmed: Test 3 checks `errorMessage` contains "422", Test 4 confirms fetch never called on empty text

## Task Commits

1. **Task 1: Install convex-test + vitest, create vitest.config.ts** - `5075f08` (chore)
2. **Task 2: Write audio.test.ts with 4 test cases** - `5e77667` (test)

## Files Created/Modified

- `convex/audio.test.ts` - 4 unit tests for generatePageAudio: EN happy path, RO happy path, 4xx error, empty page text
- `convex/vitest.config.ts` - Vitest config with `edge-runtime` environment and `convex-test` inline dependency
- `convex/package.json` - Added `"test": "vitest run"` script and `@edge-runtime/vm` devDependency

## Decisions Made

1. **`@edge-runtime/vm` required explicitly:** The vitest `edge-runtime` environment requires `@edge-runtime/vm` but it is not automatically installed by vitest. Needed `npm install --save-dev @edge-runtime/vm` to resolve `Cannot find package '@edge-runtime/vm'` error. Added to `devDependencies`.

2. **`anyApi` in generated `api.js` works with convex-test:** The generated `_generated/api.js` uses `anyApi` which makes all property accesses valid. `internal.audio.generatePageAudio` resolves at test runtime via the glob pattern — no need to regenerate the API for the test module to work.

3. **Fetch mock scoped per-test:** Each of the 4 tests calls its own `vi.stubGlobal("fetch", ...)` setup. `vi.unstubAllGlobals()` in `afterEach` ensures no cross-test contamination.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @edge-runtime/vm dependency**
- **Found during:** Task 2 (running `npm test` after writing audio.test.ts)
- **Issue:** vitest `edge-runtime` environment requires `@edge-runtime/vm` package which was not installed. Error: `Cannot find package '@edge-runtime/vm'`
- **Fix:** `npm install --save-dev @edge-runtime/vm` in convex/ directory
- **Files modified:** convex/package.json, convex/package-lock.json
- **Verification:** `npm test` passes all 4 tests after install
- **Committed in:** `5e77667` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking missing dependency)
**Impact on plan:** Required for the test environment to start. No scope creep — single missing transitive dependency resolved.

## Issues Encountered

- `convex-test` and `vitest` were already installed in `convex/package.json` from a prior session (the plan called for installing them, but they were already present). Only `@edge-runtime/vm` was missing.

## User Setup Required

None — all test infrastructure is local. Tests run with `cd convex && npm test`.

## Notes for Phase 3 (Batch Scheduler)

The following edge cases are now verified and can be relied upon:

1. **EN + RO happy paths verified:** `generatePageAudio` correctly writes `audioUrl`, `storageId`, and `status=done` to both `audioJobs` and `books.pages[0]` for both locales.
2. **ElevenLabs 4xx handling verified:** Any non-2xx response causes `status=failed` on both job and page, with `errorMessage` containing the HTTP status code.
3. **Empty text guard verified:** Empty `text_en`/`text_ro` on a page causes the action to fail before reaching ElevenLabs. Job ends as `failed`, fetch never called.
4. **Env var fast-path:** If `ELEVENLABS_API_KEY` or `ELEVENLABS_{EN|RO}_VOICE_ID` are missing, action calls `markFailed` before the try block (tested implicitly — would break happy path tests if not working).

## Known Stubs

None. Test file contains real assertions against real convex-test behavior. No hardcoded expected values that bypass the implementation.

## Self-Check: PASSED

- `convex/audio.test.ts` exists: FOUND
- `convex/vitest.config.ts` exists: FOUND
- `5075f08` commit exists: verified (git log)
- `5e77667` commit exists: verified (git log)
- All 4 tests pass: confirmed (`npm test` exits 0, "4 passed")

---
*Phase: 02-tts-integration*
*Completed: 2026-03-27*
