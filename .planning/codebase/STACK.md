# STACK.md — Technology Stack

## Languages
- **TypeScript** 5.3.3 (primary)
- **JavaScript** (config files)

## Runtime
- **Node.js** >=18.0.0
- **Package Manager:** pnpm 9.6.0

## Monorepo Structure
Three packages: `admin` (Next.js web), `mobile` (React Native / Expo), `convex` (backend)

---

## Frontend — Admin (Web)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 14.1.0 |
| UI Library | React | 18.2.0 |
| Styling | Tailwind CSS | 3.4.0 |
| Build | PostCSS + Autoprefixer | 8.4.33 / 10.4.17 |

### Key Admin Libraries
- `recharts` 2.10.0 — Charts/analytics
- `zustand` 4.5.0 — State management
- `date-fns` 3.0.0 — Date utilities
- `lucide-react` 0.300.0 — Icons
- `clsx` 2.1.0 + `tailwind-merge` 2.2.0 — Conditional classnames
- `react-dropzone` 14.2.3 — File uploads
- `react-i18next` 14.0.0 — Internationalization
- `@revenuecat/purchases-js` 1.24.4 — Web subscription SDK

---

## Frontend — Mobile (React Native)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.73.11 |
| Build Toolchain | Expo | 54.0.32 |
| Routing | Expo Router | 3.5.24 |
| UI Library | React | 18.2.0 |

### Key Mobile Libraries
- `react-native-purchases` 7.0.0 — RevenueCat mobile SDK
- `expo-localization` 14.8.0 — Device locale detection
- `i18next` 23.7.0 — i18n core
- `react-i18next` 14.0.0 — i18n React bindings
- `@expo-google-fonts/comic-neue` — Custom font
- `@expo-google-fonts/patrick-hand` — Custom font

---

## Backend — Convex

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend-as-a-Service | Convex | 1.16.0 |
| Auth | Custom (bcryptjs) | 2.4.3 |
| AI | Google Generative AI | 0.14.1 |

### Key Backend Libraries
- `bcryptjs` 2.4.3 — Password hashing
- `@google/genai` 0.14.1 — Google AI API (story generation)

---

## Build & Deployment
- **Mobile:** Expo EAS (Build & Deployment)
- **Admin:** Next.js standard build
- **Backend:** Convex cloud deployment (`content-dolphin-131.convex.cloud`)
