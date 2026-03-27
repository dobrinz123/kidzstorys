---
phase: 01-data-model
plan: "03"
subsystem: database
tags: [convex, schema, typescript, audio, batch-tracking]

# Dependency graph
requires:
  - phase: 01-data-model/01-01
    provides: audio fields (audioUrl_en/ro, audioStorageId_en/ro, audioStatus_en/ro) on books.pages and bookVersions.snapshot.pages
  - phase: 01-data-model/01-02
    provides: audioJobs table for per-page TTS generation job tracking
provides:
  - audioGenBatches table for batch-level TTS run tracking
  - Full three-table audio schema deployed to production Convex deployment
  - TypeScript types regenerated and validated (convex dev --once)
  - Production deployment confirmed at kindred-ox-197.convex.cloud
affects: [02-generation-pipeline, 03-admin-ui, 04-mobile-playback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Convex table index names are scoped per-table — same index name (e.g. by_status) can exist across multiple tables with different field shapes"
    - "audioGenBatches.by_batchId enables O(1) batch lookup by string identifier for Phase 3 scheduler"

key-files:
  created: []
  modified:
    - convex/schema.ts

key-decisions:
  - "Production Convex deployment is kindred-ox-197.convex.cloud (dev is content-dolphin-131) — plan had incorrect prod URL"
  - "audioGenBatches.by_status index includes createdAt for time-ordered status queries (unlike audioJobs.by_status which indexes status only)"
  - "locales field uses v.array(v.union(...)) not v.object() — allows variable locale sets per batch"

patterns-established:
  - "Guard tasks (Task 1) verify prerequisite plan outputs before any edits — prevents out-of-order execution"

requirements-completed: [GEN-01, GEN-02]

# Metrics
duration: 15min
completed: 2026-03-27
---

# Phase 01 Plan 03: audioGenBatches Table and Full Schema Deployment Summary

**audioGenBatches table added to Convex schema and all three audio schema changes (audio fields, audioJobs, audioGenBatches) deployed to production at kindred-ox-197.convex.cloud**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-27T18:13:59Z
- **Completed:** 2026-03-27T18:26:00Z
- **Tasks:** 5
- **Files modified:** 1 (convex/schema.ts)

## Accomplishments
- Confirmed 01-01 and 01-02 prerequisites present (audioUrl_en + audioJobs both in schema.ts)
- Inserted audioGenBatches table with required fields: batchId, locales, status (5-literal union), totalJobs, completedJobs, failedJobs, createdAt, completedAt (optional)
- Added by_status (status, createdAt) and by_batchId indexes
- npx convex dev --once exited 0, new table indexes confirmed active on dev deployment
- pnpm/npx tsc --noEmit produced zero audio-related errors (pre-existing errors unrelated to audio)
- npx convex deploy --yes pushed all three schema changes to production, deployment confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1: Confirm prerequisites** - no commit (guard-only, no file changes)
2. **Task 2: Insert audioGenBatches table** - `67676de` (feat)
3. **Task 3: npx convex dev --once validation** - no separate commit (generated files unchanged vs HEAD after merge)
4. **Task 4: TypeScript type-check** - no commit (verification-only)
5. **Task 5: npx convex deploy** - no separate commit (deployment action, no file changes)

**Plan metadata:** to be committed as docs(01-03) after SUMMARY

## Files Created/Modified
- `convex/schema.ts` - Added audioGenBatches table definition (20 lines) after audioJobs block, before LEGACY STORIES section

## Decisions Made
- Production Convex URL is `kindred-ox-197.convex.cloud` — the plan listed `content-dolphin-131` as production but that is actually the dev deployment. The convex CLI correctly identified the prod deployment automatically.
- Used `npx convex deploy --yes` to skip interactive confirmation in non-interactive terminal

## Deviations from Plan

### Minor Execution Adjustments

**1. [Rule 3 - Blocking] Worktree was behind main — merged before proceeding**
- **Found during:** Task 1 (prerequisite check)
- **Issue:** Worktree `agent-af8bc1c6` was on commit `4b68d55` (before 01-01 and 01-02 commits). audioUrl_en and audioJobs were missing from schema.ts in this worktree.
- **Fix:** `git merge main --no-edit` brought the worktree up to commit `607184f` (fast-forward, all 01-01 and 01-02 changes included)
- **Files modified:** convex/schema.ts (merged) + all planning files
- **Verification:** grep confirmed both audioUrl_en and audioJobs present after merge
- **Committed in:** merge commit (fast-forward, no merge commit created)

**2. Corrected --yes flag for non-interactive deploy**
- **Found during:** Task 5
- **Issue:** `npx convex deploy` prompted interactively and failed in non-interactive shell
- **Fix:** Reran with `--yes` flag as documented in convex deploy --help
- **Impact:** None — same deployment, just added the documented flag

---

**Total deviations:** 1 blocking (worktree sync), 1 minor (CLI flag)
**Impact on plan:** Worktree merge was required prerequisite resolution, not a plan error. CLI flag was documented behavior. No scope creep.

## Issues Encountered
- Worktree was isolated from main branch commits — required `git merge main` before prerequisite check could pass. This is expected worktree behavior.
- Convex production URL in plan (content-dolphin-131) was the dev deployment. Actual prod is kindred-ox-197. The CLI handled this transparently.

## User Setup Required
None - no external service configuration required beyond existing Convex auth session (already active).

## Next Phase Readiness
- Phase 01 (data-model) is fully complete: audio fields on pages, audioJobs table, audioGenBatches table all in schema and deployed to production
- Phase 02 (generation-pipeline) can now reference audioJobs and audioGenBatches tables for the ElevenLabs TTS job scheduler
- Phase 03 admin UI can render batch status from audioGenBatches.status field
- All indexes are live in production — no migration required before Phase 02 work begins

---
*Phase: 01-data-model*
*Completed: 2026-03-27*
