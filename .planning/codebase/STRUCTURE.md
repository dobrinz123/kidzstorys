# STRUCTURE.md — Directory Structure

## Top-Level Layout
```
STORY_KIDS/
├── apps/
│   ├── admin/          # Next.js 14 admin dashboard
│   └── mobile/         # Expo React Native app
├── convex/             # Convex backend (DB schema + functions)
├── seed/               # Database seeding scripts
├── tools/              # Internal tooling
├── package.json        # pnpm workspace root
└── pnpm-workspace.yaml
```

## apps/admin/ — Next.js Admin
```
apps/admin/
├── app/                # Next.js App Router
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Root redirect
│   ├── login/          # Auth pages
│   └── dashboard/      # Protected admin area
│       ├── layout.tsx  # Dashboard shell (sidebar, header)
│       ├── page.tsx    # Overview / stats
│       ├── books/      # Book management
│       ├── categories/ # Category management
│       ├── users/      # User management
│       ├── subscriptions/ # Subscription management
│       └── content-audit/ # Content audit (placeholder)
├── components/
│   ├── ui/             # Primitive UI components (Button, Input, etc.)
│   ├── admin/          # Admin-specific feature components
│   └── providers/      # Context/Convex providers
├── lib/                # Utilities (cn, formatters, etc.)
├── store/              # Zustand stores (authStore)
├── hooks/              # Custom React hooks (useToast, useRole, etc.)
├── i18n/               # Translation files
└── public/             # Static assets
```

## apps/mobile/ — Expo React Native
```
apps/mobile/
├── app/                # Expo Router file-based routing
│   ├── _layout.tsx     # Root layout (providers, fonts)
│   ├── index.tsx       # Entry / splash
│   ├── (auth)/         # Auth screens (login, signup, reset)
│   ├── (tabs)/         # Main tab navigation
│   │   ├── home/       # Home / book discovery
│   │   ├── library/    # User's saved books
│   │   └── profile/    # User profile
│   └── book/           # Book reading screens
│       ├── [id].tsx    # Book detail / reader
│       └── page/       # Individual page reader
├── components/         # Reusable mobile components
├── store/              # Zustand stores (authStore, userStore)
├── hooks/              # Custom hooks
├── i18n/               # Locale files (en, ro, it)
├── assets/             # Images, fonts, sounds
└── constants/          # App constants (colors, sizes)
```

## convex/ — Backend
```
convex/
├── schema.ts           # Database schema definition
├── auth.ts             # Auth mutations (login, signup, session)
├── books.ts            # Book queries & mutations
├── categories.ts       # Category queries & mutations
├── users.ts            # User queries & mutations
├── subscriptions.ts    # Subscription logic
├── http.ts             # HTTP routes (RevenueCat webhook)
├── _generated/         # Auto-generated Convex types
└── utils/              # Shared backend utilities
```

## Key Files
| File | Purpose |
|------|---------|
| `convex/schema.ts` | Source of truth for all data models |
| `convex/auth.ts` | Authentication logic |
| `apps/mobile/app/_layout.tsx` | Mobile app entry point |
| `apps/admin/app/dashboard/layout.tsx` | Admin shell with auth guard |
| `apps/mobile/store/authStore.ts` | Mobile auth state |
| `apps/admin/store/authStore.ts` | Admin auth state |
