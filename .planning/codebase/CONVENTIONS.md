# CONVENTIONS.md — Coding Conventions & Patterns

## Language & Framework
- **TypeScript** throughout (no plain JS in source files)
- **Functional components only** — no class components
- **React hooks** for all state and side effects

## File Naming
- `PascalCase` — React components (e.g., `BookCard.tsx`, `AdminLayout.tsx`)
- `camelCase` — Utilities, hooks, helpers (e.g., `useToast.ts`, `formatDate.ts`)
- `kebab-case` — Route segments (Next.js / Expo Router file-based routing)

## Component Structure
- UI primitives → `components/ui/`
- Feature components → `components/{feature}/`
- Page-level components → `app/` (Next.js) or `app/` (Expo Router)

## Next.js (Admin)
- `'use client'` directive explicitly declared on all client components
- Server components used by default where possible
- Path alias: `@/*` maps to project root

## Convex
- Path alias: `@convex/*` maps to Convex generated types
- Types imported from `@convex/_generated/dataModel`
- All backend functions in `convex/` directory

## State Management
- **Zustand** stores for global state (auth store, user store)
- Local state via `useState` / `useReducer` for component-scoped state

## Styling
- **Tailwind CSS** (admin) with custom color palette
- Conditional classnames via `clsx` + `tailwind-merge`
- No inline styles

## Icons
- `lucide-react` for all icons (admin)

## Error Handling
- Custom `useToast` hook for user-facing error/success messages
- No global error boundaries found

## Imports Order (observed pattern)
1. React / framework imports
2. Third-party libraries
3. Internal components (`@/*`)
4. Convex types (`@convex/*`)
5. Local utilities / styles

## Internationalization
- `react-i18next` with `useTranslation()` hook
- Translation keys in `i18n/` locale files
- Languages: `en`, `ro`, `it`
- Device locale auto-detected via `expo-localization` (mobile)
