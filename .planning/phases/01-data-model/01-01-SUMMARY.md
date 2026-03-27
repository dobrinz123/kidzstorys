---
phase: 1
plan: "01"
subsystem: data-model
tags: [schema, convex, audio, pages]
dependency_graph:
  requires: []
  provides: [books.pages.audioUrl_en, books.pages.audioUrl_ro, books.pages.audioStorageId_en, books.pages.audioStorageId_ro, books.pages.audioStatus_en, books.pages.audioStatus_ro, books.pages.audioGeneratedAt_en, books.pages.audioGeneratedAt_ro]
  affects: [bookVersions.snapshot.pages]
tech_stack:
  added: []
  patterns: [optional-fields-embedded-object, convex-file-storage-id]
key_files:
  created: []
  modified:
    - convex/schema.ts
decisions:
  - audioStatus uses optional union (pending/generating/done/failed) — undefined means no audio generated yet
  - Fields mirrored in bookVersions.snapshot.pages to keep snapshot shape in sync with live books.pages
metrics:
  duration_seconds: 79
  completed_date: "2026-03-27"
  tasks_completed: 4
  files_modified: 1
requirements_addressed: [GEN-01]
---

# Phase 1 Plan 01: Extend Embedded Page Objects With Audio URL and Storage ID Fields Summary

**One-liner:** Added 8 optional per-locale (EN + RO) audio fields to `books.pages` embedded object and mirrored them to `bookVersions.snapshot.pages`, satisfying the schema layer of GEN-01.

## What Was Built

Extended the Convex schema (`convex/schema.ts`) to support audio storage on each page of a book. Every page object in `books.pages` and `bookVersions.snapshot.pages` now carries:

- `audioUrl_en` / `audioUrl_ro` — public URL string for the generated audio file
- `audioStorageId_en` / `audioStorageId_ro` — Convex `_storage` ID for the stored audio file
- `audioStatus_en` / `audioStatus_ro` — optional union `"pending" | "generating" | "done" | "failed"` (undefined = no job created yet)
- `audioGeneratedAt_en` / `audioGeneratedAt_ro` — Unix timestamp of when generation completed

All fields are `v.optional(...)` so existing book documents are fully backward-compatible with no migration required.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Read and understand current pages object shape | (read-only) | Done |
| 2 | Add 8 audio fields to books.pages embedded object | 9026b07 | Done |
| 3 | Mirror 8 audio fields to bookVersions.snapshot.pages | 9026b07 | Done |
| 4 | Run npx convex dev --once — schema valid, types regenerated | (verification) | Done |

## Verification Results

All plan grep checks passed:

- `audioUrl_en` — 2 matches (books.pages + bookVersions.snapshot.pages)
- `audioUrl_ro` — 2 matches
- `audioStorageId_en` — 2 matches with `v.optional(v.id("_storage"))`
- `audioStorageId_ro` — 2 matches with `v.optional(v.id("_storage"))`
- `audioStatus_en` — 2 matches with `v.optional(`
- `audioStatus_ro` — 2 matches with `v.optional(`
- `audioGeneratedAt_en` — 2 matches with `v.optional(v.number())`
- `audioGeneratedAt_ro` — 2 matches with `v.optional(v.number())`
- `npx convex dev --once` — exited 0, "Convex functions ready! (3.65s)"

## Decisions Made

1. **audioStatus union design:** Uses `v.optional(v.union(...))` where `undefined` means "no audio job has ever been created for this page". This is intentional — status is only set when a generation job exists, avoiding spurious "pending" states on existing books.

2. **Snapshot mirroring:** The `bookVersions.snapshot.pages` object is kept in sync with `books.pages` shape. This ensures version history accurately reflects the full document state at each save point, including audio metadata.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan is schema-only; no UI or data-fetching code was written. No stub values are present.

## Self-Check: PASSED

- convex/schema.ts modified: FOUND
- Commit 9026b07 exists: FOUND
- All 8 audio fields present at 2 locations each: VERIFIED
- npx convex dev --once exit code 0: VERIFIED
