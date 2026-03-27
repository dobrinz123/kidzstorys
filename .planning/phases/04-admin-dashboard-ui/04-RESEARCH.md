# Phase 4: Admin Dashboard UI - Research

**Researched:** 2026-03-27
**Domain:** Next.js 14 App Router + Convex React hooks + existing admin UI component system
**Confidence:** HIGH

## Summary

Phase 4 is a pure frontend phase. The backend is fully built (Phase 3 completed `convex/audio.ts` with 13 exports). The admin app is a Next.js 14 App Router application using Convex React client, Tailwind CSS, lucide-react icons, and a custom component library (no shadcn/ui). The app has a well-established pattern: pages live under `apps/admin/app/dashboard/`, use `useQuery`/`useMutation` from `convex/react`, and compose UI from `components/ui/` primitives (Button, Card, Badge, Toast, Modal, Tabs, Loading).

The books list page (`apps/admin/app/dashboard/books/page.tsx`) already has a table with columns for Book, Category, Status, Pages, Stats, and Updated. Audio status needs to be added as a new column. The book edit page (`apps/admin/app/dashboard/books/[bookId]/page.tsx`) loads a `BookEditor` component where a "Generate Audio" action section needs to be added. A new dedicated audio management page should provide bulk generation controls, failed jobs list, and overall progress display.

**Primary recommendation:** Follow existing admin patterns exactly. Add an "Audio" column to the books table, add audio generation controls to BookEditor, create a new `/dashboard/audio` page for bulk operations and monitoring, and add it to the sidebar nav. Use existing Badge, Button, Card, Toast, and Loading components. Build one new `ProgressBar` component since none exists.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | Admin can trigger audio generation for a specific book (EN, RO, or both) | `startAudioBatch(bookId)` mutation exists in `convex/audio.ts`. Wire to a Button in BookEditor via `useMutation(api.audio.startAudioBatch)`. |
| ADMIN-02 | Admin can trigger bulk generation for all books with missing audio | `startBulkAudioGeneration()` mutation exists. Wire to Button on new `/dashboard/audio` page. |
| ADMIN-03 | Admin can see generation status per book (none / partial / complete / failed) | Compute from `book.pages[].audioStatus_en` and `audioStatus_ro` fields. Add AudioStatusBadge column to books table. |
| ADMIN-04 | Admin can see a list of failed jobs with error messages | Need new Convex query to list failed `audioJobs`. Display in table on `/dashboard/audio` page. |
| ADMIN-05 | Admin can manually retry failed jobs | Need new Convex mutation (public wrapper around `requeueJob`). Wire to retry button per failed job row. |
| ADMIN-06 | Admin dashboard shows overall progress (X/Y pages done with progress bar) | `getGenerationProgress(batchId)` query exists. Also need aggregate query across all books. Build ProgressBar component. |
</phase_requirements>

## Standard Stack

### Core (already installed in admin app)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.1.0 | App Router, page routing | Already installed |
| convex | ^1.16.0 | `useQuery`, `useMutation` hooks for real-time data | Already installed |
| react | 18.2.0 | UI framework | Already installed |
| tailwindcss | ^3.4.0 | Utility-first CSS | Already installed |
| lucide-react | ^0.300.0 | Icons (Volume2, Play, RefreshCw, AlertTriangle, etc.) | Already installed |
| clsx + tailwind-merge | ^2.1.0 / ^2.2.0 | `cn()` utility for class merging | Already installed |
| recharts | ^2.10.0 | Charts (could use for progress visualization) | Already installed but NOT needed for simple progress bar |

### No New Dependencies Needed

All UI can be built with existing components + one new ProgressBar. No new packages required.

## Architecture Patterns

### Admin App Routing Structure
```
apps/admin/app/
  layout.tsx                          # Root layout with ConvexClientProvider
  ConvexClientProvider.tsx            # ConvexProvider wrapper
  login/page.tsx                      # Login page
  dashboard/
    layout.tsx                        # Auth guard + Sidebar + MobileHeader
    page.tsx                          # Dashboard home
    books/
      page.tsx                        # Books list (TABLE with columns)
      new/page.tsx                    # New book form
      [bookId]/page.tsx               # Edit book (loads BookEditor)
      [bookId]/versions/page.tsx      # Version history
    audio/                            # NEW - Audio management page
      page.tsx                        # Bulk controls + failed jobs + progress
    categories/...
    statistics/...
    users/...
    settings/...
```

### Pattern 1: Page Structure (from books/page.tsx)
**What:** Every admin page follows this exact structure.
**When to use:** All new pages.
```tsx
'use client';

import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Header } from '../../../components/layout/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageLoading } from '../../../components/ui/Loading';

export default function AudioPage() {
  const data = useQuery(api.audio.someQuery, {});

  if (data === undefined) {
    return <PageLoading message="Loading audio status..." />;
  }

  return (
    <div className="p-6">
      <Header
        title="Audio Generation"
        subtitle="Manage audiobook generation for all books"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audio Generation' },
        ]}
        actions={<Button>Bulk Generate</Button>}
      />
      {/* Content here */}
    </div>
  );
}
```

### Pattern 2: Mutation with Toast Feedback (from BookEditor.tsx)
**What:** All mutations use try/catch with toast notifications.
**When to use:** Generate audio button, retry button, bulk generate.
```tsx
'use client';

import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { useState } from 'react';

function GenerateAudioButton({ bookId }: { bookId: Id<"books"> }) {
  const { success, error: showError } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const startBatch = useMutation(api.audio.startAudioBatch);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await startBatch({ bookId });
      if (result.totalJobs === 0) {
        success('All audio already generated!');
      } else {
        success(`Started generation: ${result.totalJobs} jobs queued`);
      }
    } catch (err) {
      showError('Failed to start audio generation');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleGenerate} isLoading={isGenerating}>
      Generate Audio
    </Button>
  );
}
```

### Pattern 3: Sidebar Navigation Entry (from Sidebar.tsx)
**What:** Add new nav item to the `navItems` array.
**When to use:** Adding the Audio section to the sidebar.
```tsx
// In components/layout/Sidebar.tsx, add to navItems array:
{
  href: '/dashboard/audio',
  label: 'Audio',
  icon: <Volume2 size={20} />,  // from lucide-react
  roles: ['admin'],              // admin-only
},
```

### Pattern 4: Table in Card (from books/page.tsx)
**What:** Tables are plain HTML `<table className="table">` wrapped in `<Card padding="none">`.
**When to use:** Failed jobs table, any list display.
```tsx
<Card padding="none">
  <table className="table">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr key={item._id}>
          <td>{item.field}</td>
          <td><Button size="sm">Action</Button></td>
        </tr>
      ))}
    </tbody>
  </table>
</Card>
```

### Pattern 5: Badge Variants for Audio Status
**What:** Use existing Badge component with dot indicator for audio status.
**When to use:** Audio status column in books table.
```tsx
// New AudioStatusBadge component following StatusBadge pattern
export function AudioStatusBadge({ status }: { status: 'none' | 'partial' | 'complete' | 'failed' }) {
  const config = {
    none:     { variant: 'gray' as const, label: 'No Audio' },
    partial:  { variant: 'warning' as const, label: 'Partial' },
    complete: { variant: 'success' as const, label: 'Complete' },
    failed:   { variant: 'error' as const, label: 'Failed' },
  };
  const { variant, label } = config[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}
```

### Anti-Patterns to Avoid
- **Do NOT install shadcn/ui:** The admin app has its own custom component library. Adding shadcn would create inconsistency.
- **Do NOT use `useAction`:** The admin app only uses `useQuery` and `useMutation` from Convex. The audio mutations (`startAudioBatch`, `startBulkAudioGeneration`) are already public mutations, not actions.
- **Do NOT create a separate data fetching layer:** Convex hooks provide real-time reactivity out of the box. No need for SWR, React Query, or manual polling.
- **Do NOT build custom table components:** The app uses plain HTML tables with Tailwind classes. Keep it consistent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading states | Custom spinners | `PageLoading`, `SkeletonTable` from `components/ui/Loading` | Already built, consistent UX |
| Toast notifications | Custom notification system | `useToast()` from `components/ui/Toast` | Context provider already wired in app |
| Confirmation dialogs | Custom confirm UI | `ConfirmDialog` from `components/ui/Modal` | Handles escape, overlay click, loading state |
| Status indicators | Custom colored dots | `Badge` with `dot` prop from `components/ui/Badge` | Consistent color system |
| Tab navigation | Custom tab state | `Tabs`/`TabList`/`TabTrigger`/`TabContent` from `components/ui/Tabs` | Built-in active state management |
| Real-time updates | Polling/setInterval | Convex `useQuery` | Automatic real-time reactivity |

## Existing Component Inventory (Reusable)

| Component | File | Props | Use For |
|-----------|------|-------|---------|
| `Button` | `components/ui/Button.tsx` | variant, size, isLoading, leftIcon | Generate, Retry, Bulk Generate buttons |
| `Badge` | `components/ui/Badge.tsx` | variant (primary/success/warning/error/info/gray), dot, size | Audio status badges |
| `Card` / `CardHeader` / `CardTitle` | `components/ui/Card.tsx` | padding (none/sm/md/lg), hover | Wrapping tables, stat cards |
| `Modal` / `ConfirmDialog` | `components/ui/Modal.tsx` | isOpen, onClose, size | Confirm bulk generation |
| `Tabs` / `TabList` / `TabTrigger` / `TabContent` | `components/ui/Tabs.tsx` | defaultValue, onChange | Tab between Overview/Failed Jobs views |
| `Header` / `HeaderSearch` | `components/layout/Header.tsx` | title, subtitle, breadcrumbs, actions | Page headers |
| `PageLoading` / `SkeletonTable` | `components/ui/Loading.tsx` | message, rows | Loading states |
| `EmptyState` | `components/ui/EmptyState.tsx` | icon, title, description, action | No failed jobs state |
| `Select` | `components/ui/Select.tsx` | options, value, onChange | Filter dropdowns |
| `useToast()` | `components/ui/Toast.tsx` | success(), error(), warning(), info() | Action feedback |

## New Components Needed

| Component | Purpose | Complexity |
|-----------|---------|------------|
| `ProgressBar` | Show X/Y generation progress with percentage | Simple - div with width percentage + Tailwind |
| `AudioStatusBadge` | Show per-book audio status (none/partial/complete/failed) | Simple - wrapper around Badge |
| `GenerateAudioButton` | Per-book generate trigger with loading state | Medium - mutation + toast + loading |
| `BulkGenerateButton` | All-books generate trigger with confirmation dialog | Medium - mutation + ConfirmDialog + toast |
| `FailedJobsTable` | Table of failed audioJobs with retry buttons | Medium - query + table + retry mutation |
| `AudioProgressCard` | Card showing overall generation stats | Simple - Card + ProgressBar + stats |

## New Convex Queries/Mutations Needed

The backend (Phase 3) has the core mutations, but the admin UI needs additional **queries** to display data:

| Function | Type | Purpose | Exists? |
|----------|------|---------|---------|
| `startAudioBatch(bookId)` | mutation | Trigger per-book generation | YES (Export 6) |
| `startBulkAudioGeneration()` | mutation | Trigger all-books generation | YES (Export 8) |
| `getGenerationProgress(batchId)` | query | Batch progress | YES (Export 7) |
| `getFailedJobs()` | query | List failed audioJobs with error messages | NEEDS CREATION |
| `retryFailedJob(jobId)` | mutation | Public wrapper to requeue a failed job | NEEDS CREATION |
| `getAudioOverview()` | query | Aggregate stats: total pages, done EN, done RO, failed count | NEEDS CREATION |
| `getBookAudioStatus(bookId)` | query | Per-book audio breakdown for detail view | OPTIONAL (can compute client-side from book.pages) |

### Recommended: getFailedJobs query
```typescript
// convex/audio.ts — new public query
export const getFailedJobs = query({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query("audioJobs")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();

    // Enrich with book titles
    const bookIds = [...new Set(failed.map(j => j.bookId))];
    const books = await Promise.all(bookIds.map(id => ctx.db.get(id)));
    const bookMap = new Map(books.filter(Boolean).map(b => [b!._id, b!]));

    return failed.map(job => ({
      ...job,
      bookTitle: bookMap.get(job.bookId)?.cover.title_en ?? 'Unknown',
    }));
  },
});
```

### Recommended: retryFailedJob mutation
```typescript
// convex/audio.ts — new public mutation
export const retryFailedJob = mutation({
  args: { jobId: v.id("audioJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");
    if (job.status !== "failed") throw new Error("Job is not failed");
    if (job.retryCount >= 3) throw new Error("Max retries exceeded");
    await ctx.db.patch(args.jobId, {
      status: "pending",
      retryCount: job.retryCount + 1,
    });
    return { success: true };
  },
});
```

### Recommended: getAudioOverview query
```typescript
// convex/audio.ts — new public query
export const getAudioOverview = query({
  args: {},
  handler: async (ctx) => {
    const publishedBooks = await ctx.db
      .query("books")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    let totalPages = 0;
    let doneEn = 0;
    let doneRo = 0;
    let failedCount = 0;

    for (const book of publishedBooks) {
      for (const page of book.pages) {
        totalPages++;
        if (page.audioStatus_en === "done") doneEn++;
        if (page.audioStatus_ro === "done") doneRo++;
        if (page.audioStatus_en === "failed" || page.audioStatus_ro === "failed") failedCount++;
      }
    }

    return {
      totalBooks: publishedBooks.length,
      totalPages,
      doneEn,
      doneRo,
      totalSlots: totalPages * 2, // EN + RO per page
      totalDone: doneEn + doneRo,
      failedCount,
    };
  },
});
```

## Computing Audio Status Per-Book (Client-Side)

Audio status per book (ADMIN-03) can be derived from `book.pages` without a new query. The `listBooks` query already returns full page data including `audioStatus_en` and `audioStatus_ro` fields.

```typescript
type BookAudioStatus = 'none' | 'partial' | 'complete' | 'failed';

function getBookAudioStatus(pages: Array<{
  audioStatus_en?: string;
  audioStatus_ro?: string;
}>): BookAudioStatus {
  if (pages.length === 0) return 'none';

  let doneCount = 0;
  let failedCount = 0;
  const totalSlots = pages.length * 2; // EN + RO per page

  for (const page of pages) {
    if (page.audioStatus_en === 'done') doneCount++;
    if (page.audioStatus_ro === 'done') doneCount++;
    if (page.audioStatus_en === 'failed') failedCount++;
    if (page.audioStatus_ro === 'failed') failedCount++;
  }

  if (failedCount > 0) return 'failed';
  if (doneCount === totalSlots) return 'complete';
  if (doneCount > 0) return 'partial';
  return 'none';
}
```

## Common Pitfalls

### Pitfall 1: Convex useQuery Returns Undefined While Loading
**What goes wrong:** Rendering data before query resolves, causing null reference errors.
**Why it happens:** `useQuery` returns `undefined` during initial load, not `null`.
**How to avoid:** Always guard with `if (data === undefined) return <PageLoading />;`
**Warning signs:** "Cannot read property of undefined" errors.

### Pitfall 2: Stale Closure in Mutation Handlers
**What goes wrong:** Button onClick captures stale state, causing double-submit or wrong data.
**Why it happens:** React closures + async mutations.
**How to avoid:** Use `isLoading` state flag with `setIsGenerating(true)` before await, and `finally { setIsGenerating(false) }`. Button component already supports `isLoading` + `disabled`.

### Pitfall 3: Bulk Generation Confirmation
**What goes wrong:** Admin accidentally triggers bulk generation on all books.
**Why it happens:** Single click triggers expensive operation (many ElevenLabs API calls = real cost).
**How to avoid:** Use `ConfirmDialog` before `startBulkAudioGeneration()`. Show count of affected books/pages.

### Pitfall 4: Progress Bar Not Updating in Real-Time
**What goes wrong:** Progress display shows stale data after triggering generation.
**Why it happens:** Forgetting that Convex `useQuery` is real-time -- it auto-updates. No manual refresh needed.
**How to avoid:** Just use `useQuery(api.audio.getAudioOverview)` and the progress bar will auto-update as jobs complete.

### Pitfall 5: Audio Status Column Breaking Books Table
**What goes wrong:** Adding audio fields to the `Book` TypeScript type or `BookPage` type in `apps/admin/types/index.ts` without making them optional.
**Why it happens:** Existing books may not have audio status fields set (they're `v.optional()` in schema).
**How to avoid:** Audio fields are already optional in the Convex schema. The client-side `getBookAudioStatus` helper handles undefined values correctly. Don't modify the admin `BookPage` type -- use the raw Convex return type.

## Styling Reference

### Design Token Colors Used in Admin
```
Primary:   primary-100, primary-500, primary-600     (blue tones)
Success:   success-50, success-200, success-500, success-800  (green)
Warning:   warning-50, warning-200, warning-500, warning-800  (amber)
Error:     error-50, error-200, error-300, error-500, error-600, error-700, error-800  (red)
Info:      info-50, info-200, info-500, info-800      (blue)
Surface:   surface-primary                             (page bg)
Gray:      gray-100 through gray-900                   (text, borders)
```

### Progress Bar Pattern (new component)
```tsx
interface ProgressBarProps {
  value: number;   // 0-100
  size?: 'sm' | 'md';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
}

const colorClasses = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
};

export function ProgressBar({
  value,
  size = 'md',
  color = 'primary',
  showLabel = true,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('w-full', className)}>
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        size === 'sm' ? 'h-2' : 'h-3'
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            colorClasses[color]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-gray-600 mt-1">{Math.round(clampedValue)}%</p>
      )}
    </div>
  );
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (already configured in `convex/` directory) |
| Config file | `convex/vitest.config.ts` |
| Quick run command | `cd convex && npm test` |
| Full suite command | `cd convex && npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | startAudioBatch triggers per-book generation | unit (backend already tested) | `cd convex && npm test` | Existing |
| ADMIN-02 | startBulkAudioGeneration triggers all-books | unit (backend already tested) | `cd convex && npm test` | Existing |
| ADMIN-03 | Audio status computation per book | unit | `cd convex && npx vitest run audio-status` | Wave 0 |
| ADMIN-04 | getFailedJobs returns failed jobs with error messages | unit | `cd convex && npx vitest run audio` | Wave 0 |
| ADMIN-05 | retryFailedJob requeues a failed job | unit | `cd convex && npx vitest run audio` | Wave 0 |
| ADMIN-06 | getAudioOverview returns correct counts | unit | `cd convex && npx vitest run audio` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd convex && npm test`
- **Per wave merge:** Full suite
- **Phase gate:** All tests green

### Wave 0 Gaps
- [ ] New Convex queries (`getFailedJobs`, `retryFailedJob`, `getAudioOverview`) need test coverage in `convex/audio.test.ts`
- [ ] Client-side `getBookAudioStatus` utility needs unit test (can add to a new `apps/admin/lib/__tests__/audio-utils.test.ts`)

## Planning Recommendations

### Suggested Task Breakdown

**Task 1: Backend additions** (new Convex queries/mutations)
- Add `getFailedJobs` query to `convex/audio.ts`
- Add `retryFailedJob` public mutation to `convex/audio.ts`
- Add `getAudioOverview` query to `convex/audio.ts`
- Add tests for all three

**Task 2: Shared UI components**
- Create `ProgressBar` component at `components/ui/ProgressBar.tsx`
- Create `AudioStatusBadge` component at `components/ui/Badge.tsx` (add to existing file)
- Create `getBookAudioStatus()` utility function in `apps/admin/lib/utils.ts`

**Task 3: Books list audio column** (ADMIN-03)
- Add "Audio" column to `apps/admin/app/dashboard/books/page.tsx` table
- Use `AudioStatusBadge` + `getBookAudioStatus()` helper

**Task 4: Per-book audio generation** (ADMIN-01)
- Add audio generation section to `BookEditor.tsx` or create standalone component
- Wire `startAudioBatch` mutation with toast feedback
- Show per-book audio breakdown (pages done/total per locale)

**Task 5: Audio management page** (ADMIN-02, ADMIN-04, ADMIN-05, ADMIN-06)
- Create `apps/admin/app/dashboard/audio/page.tsx`
- Add sidebar nav entry (Volume2 icon, admin-only)
- Overview section: AudioProgressCard with ProgressBar (ADMIN-06)
- Bulk generate button with ConfirmDialog (ADMIN-02)
- Failed jobs tab: FailedJobsTable with retry buttons (ADMIN-04, ADMIN-05)

### Key Decisions for Planner

1. **Audio status column placement:** Insert AFTER the "Pages" column and BEFORE "Stats" in the books table.
2. **Sidebar position:** Place "Audio" nav item AFTER "Content Audit" and BEFORE "Statistics" -- it's a content management function.
3. **Audio section in BookEditor:** Add as a collapsible card section below the existing page editor, not a separate page.
4. **No polling needed:** Convex queries are real-time reactive. Progress bars auto-update.
5. **Retry limit display:** Show retry count (X/3) next to retry button so admin knows how many retries remain.

## Sources

### Primary (HIGH confidence)
- `apps/admin/app/dashboard/books/page.tsx` - Books list page pattern, table structure
- `apps/admin/components/books/BookEditor.tsx` - Mutation pattern with toast
- `apps/admin/components/ui/Badge.tsx` - Badge variants (success/warning/error/gray)
- `apps/admin/components/ui/Toast.tsx` - Toast context pattern (useToast hook)
- `apps/admin/components/ui/Button.tsx` - Button variants, isLoading prop
- `apps/admin/components/layout/Sidebar.tsx` - Nav items array, role-based filtering
- `convex/audio.ts` - All 13 exports, mutation args/returns
- `convex/schema.ts` - audioJobs, audioGenBatches, books.pages audio fields

### Secondary (MEDIUM confidence)
- `apps/admin/package.json` - Dependency list (no shadcn, no table library)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, no new packages
- Architecture: HIGH - Patterns directly observed from existing codebase
- Pitfalls: HIGH - Based on actual code patterns and Convex reactivity model

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no external dependency changes expected)
