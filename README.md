# Kids Stories - Production-Ready Subscription App

A complete Netflix-style subscription app for children's stories with full multilingual support (English, Romanian, Italian). Built with React Native (Expo), Convex backend, RevenueCat subscriptions, and Next.js admin panel.

## 🌟 Features

- ✅ **100+ Original Multilingual Stories** - Fully localized in EN/RO/IT
- ✅ **Netflix-Style Subscription Model** - All content requires active subscription
- ✅ **6 Story Categories** - Bedtime, Calm Down, Emotions, Adventure, Learn to Read, Curiosities
- ✅ **Smart Recommendations** - Deterministic scoring algorithm (no AI)
- ✅ **Child Profiles** - Up to 3 profiles per account
- ✅ **Bedtime Routines** - Scheduled notifications
- ✅ **Parent Questions** - Discussion prompts for each story
- ✅ **Admin Panel** - Full CRUD interface for content management
- ✅ **RevenueCat Integration** - iOS + Android in-app purchases
- ✅ **Real-time Sync** - Convex live queries

## 📁 Project Structure

```
STORY_KIDS/
├── apps/
│   ├── mobile/          # React Native + Expo app
│   └── admin/           # Next.js admin panel
├── convex/              # Backend (Convex)
├── seed/                # Seed data (categories + 100 stories)
├── tools/               # Validation scripts
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Expo CLI
- Convex account (https://www.convex.dev)
- RevenueCat account (https://www.revenuecat.com)

### 1. Install Dependencies

```bash
# Install pnpm if you haven't
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

### 2. Set Up Convex Backend

```bash
# Navigate to convex directory
cd convex

# Login to Convex (creates account if needed)
npx convex login

# Initialize project
npx convex dev

# This will:
# - Create a new Convex project
# - Generate _generated/ files
# - Start dev server
# - Give you a CONVEX_URL
```

Copy the `CONVEX_URL` from the output.

### 3. Configure Environment Variables

#### Convex (.env in convex/)

```bash
# Copy example file
cp convex/.env.example convex/.env

# Edit convex/.env
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_from_revenuecat
ADMIN_ALLOWLIST_SEED_EMAILS=admin@example.com,editor@example.com
```

#### Mobile App (.env in apps/mobile/)

```bash
# Copy example file
cp apps/mobile/.env.example apps/mobile/.env

# Edit apps/mobile/.env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium
```

#### Admin Panel (.env.local in apps/admin/)

```bash
# Copy example file
cp apps/admin/.env.example apps/admin/.env.local

# Edit apps/admin/.env.local
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_from_revenuecat
```

### 4. Seed the Database

```bash
# Validate stories first (should have 100 stories)
pnpm validate-stories

# Seed categories, stories, and admin users
CONVEX_URL=https://your-deployment.convex.cloud pnpm seed
```

Expected output:
- 6 categories created
- 100 stories created
- Admin users created

### 5. Run the Applications

#### Mobile App

```bash
# Terminal 1: Keep Convex dev running
cd convex
npx convex dev

# Terminal 2: Start Expo
pnpm mobile

# Scan QR code with Expo Go app (iOS/Android)
```

#### Admin Panel

```bash
pnpm admin

# Open http://localhost:3000
```

## 🔐 RevenueCat Setup

### 1. Create RevenueCat Project

1. Go to https://www.revenuecat.com
2. Create new project
3. Add iOS and Android apps

### 2. Configure Products

1. Create entitlement: `premium`
2. Add products (e.g., monthly, yearly subscriptions)
3. Link products to `premium` entitlement

### 3. Get API Keys

- iOS API Key: `appl_xxxxx`
- Android API Key: `goog_xxxxx`
- Add these to `apps/mobile/.env`

### 4. Set Up Webhook

1. In RevenueCat dashboard → Integrations → Webhooks
2. Add webhook URL: `https://your-admin-domain.com/api/revenuecat-webhook`
3. Select events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`
4. Copy Authorization Header (webhook secret)
5. Add to `convex/.env` and `apps/admin/.env.local`

## 📱 Mobile App Features

### Authentication
- Sign up with email/password
- Sign in
- Logout

### Home Screen
- 6 category aisles (horizontal scrollable)
- "Pick One Now" recommendation
- Filters: Age (3-4, 5-6, 7-8, 9-10), Duration (3, 5, 8, 12 min), Child State (calm/normal/agitated)

### Story Detail
- Full story text (subscribers only)
- Reading mode with font size controls
- Parent discussion questions (3 per story)
- Favorite toggle
- "Next Similar" recommendation

### Favorites
- Subscribers-only feature
- List of favorited stories

### Child Profiles
- Create up to 3 profiles
- Nickname, age bracket, preferences
- Switch active profile for personalized recommendations

### Bedtime Routines
- Schedule story time with notifications
- Select category and duration

### Settings
- Language switcher (EN/RO/IT)
- Subscription status
- Manage subscription (deep link to app store)
- Restore purchases
- Logout

### Paywall
- Shown when accessing locked content
- Displays available subscription packages
- Purchase flow via RevenueCat
- Restore purchases button

## 🎭 Admin Panel Features

### Login
- Email/password authentication
- Admin allowlist enforcement

### Dashboard
- Overview of content stats

### Categories Management
- List all categories
- Create/edit categories
- Multilingual fields (EN/RO/IT)

### Stories Management
- List all stories with filters
- Create new story
- Edit existing story
- Multilingual content editor:
  - Title (EN/RO/IT)
  - Story text (EN/RO/IT)
  - Parent questions (3 per language)
- Metadata: age range, duration, tags, series info
- Publish/unpublish toggle

### Webhook Endpoint
- POST `/api/revenuecat-webhook`
- Verifies RevenueCat signature
- Updates user entitlement in Convex

## 📊 Content Distribution (100 Stories)

| Category | Count | Description |
|----------|-------|-------------|
| Bedtime | 25 | Calm endings, no scary elements |
| Calm Down | 15 | De-escalation, breathing cues |
| Emotions | 15 | Fear, anger, jealousy, shame |
| Adventure | 20 | 2 series × 10 episodes each |
| Learn to Read | 15 | Graded, short, repetitive |
| Curiosities | 10 | STEM, animals, space facts |

## 🧮 Recommendation Algorithm

Deterministic scoring (no AI):

```
Score =
  + 50 (category match)
  + 40 (age bracket perfect match)
  + 20 (duration proximity)
  + 30 (child state boost for calming tags)
  - penalty for recently read
  + popularity bonus (capped)

Tie-breaker: publishedAt desc
```

## 🌐 Localization

### UI Translations
- Mobile app fully translated (EN/RO/IT)
- Language switcher in settings
- Device locale auto-detection
- Persistent language preference

### Story Content
- Every story has 3 localized versions
- Natural, native translations (no literal calques)
- Romanian: proper diacritics, avoid anglicisms
- Italian: correct articles/prepositions, native idioms

### Translation Quality
- No Romanianisms in English
- No Englishisms in Romanian/Italian
- Restructured sentences for native flow
- Culturally appropriate names and expressions

## 🔒 Subscription Flow

1. **User Installs App** → Signs up (entitlementActive: false)
2. **Browse Stories** → Locked overlays on all story cards
3. **Tap Story** → Redirected to paywall
4. **View Paywall** → Display subscription packages
5. **Purchase** → RevenueCat processes payment
6. **Webhook Fired** → Convex updates entitlement
7. **Live Query Refresh** → App unlocks content
8. **Access Granted** → Full story text + parent questions available

## 🛠️ Development Commands

```bash
# Install all dependencies
pnpm install

# Start Convex dev server
pnpm convex:dev

# Start mobile app
pnpm mobile

# Start admin panel
pnpm admin

# Validate stories
pnpm validate-stories

# Seed database
CONVEX_URL=https://your-url.convex.cloud pnpm seed

# Deploy Convex to production
pnpm convex:deploy
```

## 🚢 Deployment

### Convex Backend

```bash
cd convex
npx convex deploy

# Set environment variables in Convex dashboard
# - REVENUECAT_WEBHOOK_SECRET
# - ADMIN_ALLOWLIST_SEED_EMAILS
```

### Mobile App (EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Admin Panel (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd apps/admin
vercel --prod

# Set environment variables in Vercel dashboard
# - NEXT_PUBLIC_CONVEX_URL
# - REVENUECAT_WEBHOOK_SECRET
```

## 📝 Story Format

Each story must have:

```json
{
  "storyKey": "unique-story-identifier",
  "categorySlug": "bedtime | calm-down | emotions | adventure | learn-to-read | curiosities",
  "ageMin": 3,
  "ageMax": 8,
  "durationMin": 3 | 5 | 8 | 12,
  "tags_en": ["tag1", "tag2"],
  "tags_ro": ["etichetă1", "etichetă2"],
  "tags_it": ["etichetta1", "etichetta2"],
  "seriesId": "series-name (adventure only)",
  "episodeNo": 1 (adventure only),
  "locales": {
    "en": {
      "title": "Story Title",
      "text": "Full story text matching duration target...",
      "parentQuestions": ["Question 1?", "Question 2?", "Question 3?"]
    },
    "ro": { "...same structure..." },
    "it": { "...same structure..." }
  },
  "isPublished": true
}
```

### Word Count Targets

| Duration | Category | Word Count |
|----------|----------|------------|
| 3 min | Normal | 320-450 |
| 3 min | Learn to Read | 120-260 |
| 5 min | Normal | 520-720 |
| 5 min | Learn to Read | 120-260 |
| 8 min | Normal | 820-1150 |
| 12 min | Normal | 1250-1700 |

## 🧪 Testing

### Test Subscription Flow

1. Use RevenueCat sandbox environment
2. Test purchase on iOS Simulator / Android Emulator
3. Verify webhook fires and Convex updates
4. Check story unlocks in app

### Test Recommendation Engine

1. Create child profile with age 5
2. Read several bedtime stories
3. Check "Pick One Now" recommendation
4. Should prioritize bedtime category + age 5 stories

## 🔧 Troubleshooting

### Webhook Not Firing

- Check webhook URL is correct and accessible
- Verify REVENUECAT_WEBHOOK_SECRET matches
- Check RevenueCat dashboard logs
- Test webhook with RevenueCat "Send Test" button

### Stories Not Loading

- Verify Convex deployment is running
- Check EXPO_PUBLIC_CONVEX_URL is correct
- Run `pnpm seed` to populate database
- Check Convex dashboard for errors

### Subscription Not Unlocking

- Check RevenueCat entitlement ID matches EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID
- Verify webhook processed successfully (check Convex logs)
- Test with `Purchases.getCustomerInfo()` to see RC state
- Manual sync: call `ensureRevenueCatId` mutation

## 📚 Tech Stack

- **Frontend**: React Native, Expo, expo-router
- **Backend**: Convex (TypeScript)
- **Database**: Convex (real-time)
- **Subscriptions**: RevenueCat
- **Admin**: Next.js, Tailwind CSS
- **I18n**: i18next, react-i18next
- **Monorepo**: pnpm workspaces

## 🤝 Contributing

This is a production-ready template. To customize:

1. Fork the repository
2. Modify story content in `/seed/stories.seed.json`
3. Update categories in `/seed/categories.seed.json`
4. Customize UI translations in `/apps/mobile/locales/`
5. Run validation: `pnpm validate-stories`
6. Re-seed: `pnpm seed`

## 📄 License

Proprietary - All rights reserved

## 🙋 Support

For issues or questions:
- Check Convex docs: https://docs.convex.dev
- Check RevenueCat docs: https://docs.revenuecat.com
- Check Expo docs: https://docs.expo.dev

---

**Built with ❤️ for children and families worldwide**
