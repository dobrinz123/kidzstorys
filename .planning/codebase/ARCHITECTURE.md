# ARCHITECTURE.md — System Architecture

## High-Level Pattern
**Polyrepo Monolith** using pnpm workspaces — multiple app packages sharing one Convex backend.

```
┌──────────────┐     ┌──────────────┐
│  Mobile App  │     │  Admin Web   │
│  (Expo RN)   │     │  (Next.js)   │
└──────┬───────┘     └──────┬───────┘
       │                    │
       └────────┬───────────┘
                │ Convex Client SDK
       ┌────────▼───────────┐
       │   Convex Backend   │
       │  (DB + Functions)  │
       └────────────────────┘
```

## Backend — Convex
- **Real-time BaaS** — database, queries, mutations, actions, HTTP routes
- **Schema:** Users, books, categories, subscriptions, audit logs
- **Auth:** Session-based (session tokens stored in AsyncStorage / Zustand), rate-limited
- **Webhooks:** RevenueCat subscription events handled via Convex HTTP routes
- **Multi-language data:** Books have EN/RO/IT content with versioning

## Frontend — Mobile (Expo React Native)
- **Routing:** Expo Router (file-based, similar to Next.js App Router)
- **State:** Zustand stores — `authStore`, `userStore`
- **Auth flow:** Session token persisted in AsyncStorage → Zustand → Convex queries
- **Payments:** RevenueCat SDK for subscription management
- **i18n:** `react-i18next` + `expo-localization` for device locale detection

## Frontend — Admin (Next.js 14)
- **Routing:** Next.js App Router
- **Rendering:** Server components by default, `'use client'` where needed
- **State:** Zustand `authStore` for admin session
- **Charts:** Recharts for analytics
- **Payments:** RevenueCat webhook receiver

## Authentication Flow
```
User login → Convex mutation (rate-limited) → session token
→ stored in AsyncStorage (mobile) / localStorage (admin)
→ loaded into Zustand on app start
→ passed to Convex queries via auth context
Session expiry: 7 days
```

## Data Flow
```
User action → React component
→ Convex client query/mutation (real-time subscription)
→ Convex function (server-side validation)
→ Convex database
→ Real-time update pushed back to all subscribed clients
```

## Subscription / Paywall Flow
```
User taps upgrade → RevenueCat SDK
→ App Store / Play Store / Stripe purchase
→ RevenueCat processes → webhook to Convex HTTP route
→ Convex updates user subscription status
→ Real-time update propagates to client
```

## Key Architectural Decisions
- Convex chosen as BaaS to avoid managing a separate API server
- Multi-platform approach: single backend serves both mobile and admin
- RevenueCat abstracts cross-platform subscription complexity
- Zustand preferred over Redux for lightweight global state
- Multilingual content baked into data model (not translated at runtime)
