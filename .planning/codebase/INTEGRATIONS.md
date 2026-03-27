# INTEGRATIONS.md — External Services & Integrations

## Payment & Subscriptions

### RevenueCat
- **Purpose:** Subscription management (iOS, Android, Web)
- **Entitlement ID:** `PREMIUM`
- **Webhook endpoint:** `/revenuecat-webhook` (admin Next.js)
- **SDKs:**
  - Mobile: `react-native-purchases` 7.0.0
  - Web: `@revenuecat/purchases-js` 1.24.4
- **Environment Variables:**
  - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
  - `EXPO_PUBLIC_REVENUECAT_WEB_KEY`

---

## Email Service

### Resend
- **Purpose:** Transactional email delivery
- **API Endpoint:** `https://api.resend.com/emails`
- **Multi-language support:** `en`, `ro`, `it`
- **Environment Variables:**
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`

---

## AI & Content Generation

### Google Generative AI
- **Purpose:** Story generation
- **SDK:** `@google/genai` 0.14.1
- **Environment Variables:** (Google AI API key — check Convex env)

---

## Backend Infrastructure

### Convex
- **Purpose:** Backend-as-a-Service (database, functions, auth, real-time)
- **Deployment:** `content-dolphin-131.convex.cloud`
- **Environment Variables:**
  - `NEXT_PUBLIC_CONVEX_URL` (admin)
  - `EXPO_PUBLIC_CONVEX_URL` (mobile)

---

## Mobile Platform

### Expo EAS
- **Purpose:** Build, distribution, and OTA updates
- **Bundle ID:** `com.kidsstories.app`
- **Environment Variables:**
  - `EAS_PROJECT_ID`

---

## Authentication
- **Type:** Custom password-based auth via Convex
- **Session expiry:** 7 days
- **Rate limiting:** Applied on auth operations
- **Password reset:** Via Resend email

---

## Error Monitoring (Optional)

### Sentry
- **Purpose:** Crash reporting (mobile)
- **Status:** Optional / conditionally configured
- **Environment Variables:**
  - `EXPO_PUBLIC_SENTRY_DSN`

---

## Localization
- **Libraries:** `react-i18next`, `expo-localization`, `i18next`
- **Languages supported:** English (`en`), Romanian (`ro`), Italian (`it`)
- **Detection:** Device locale via `expo-localization`
