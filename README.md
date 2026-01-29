# 📚 StoryKids - Interactive Stories for Children

StoryKids is a cross-platform application designed to provide engaging, educational, and interactive stories for children. It features a robust subscription model, multilingual support, and a dedicated parent dashboard for tracking progress.

## ✨ Features

### 📱 **Cross-Platform Experience**
- **Mobile (iOS & Android)**: Built with **Expo** and **React Native** for a native performance.
- **Web App**: Fully responsive web version (`kidzstoryz.com`) allowing access from any browser.
- **Unified Codebase**: 95% code sharing between platforms.

### 📖 **Rich Content & Personalization**
- **Interactive Books**: Stories with rich illustrations, structured pages, and age-appropriate content.
- **Multilingual Support**: Switch usage instantly between **English**, **Romanian**, and **Italian** (EN/RO/IT).
- **Audio & Visuals**: Immersive storytelling with support for background audio and distinct visual themes.
- **Child Profiles**: Parents can create multiple profiles for their children to track individual progress.

### 💰 **Subscription & Monetization**
- **Freemium Model**: Free access to select stories with a premium upgrade path.
- **RevenueCat Integration**: Seamless subscription management for Monthly and Yearly plans across Apple App Store, Google Play Store, and Web (Stripe).
- **Paywall**: Dynamic paywall UI showcasing premium benefits.
- **Trial Support**: Built-in logic for free trials.

### 🛠 **Backend & Admin**
- **Real-time Backend**: Powered by **Convex** for instant data sync properties.
- **Admin Dashboard**: A separate Next.js application (`apps/admin`) for content creators to:
    - Upload and edit stories/books.
    - Manage categories and assets.
    - View user analytics.

## 🏗 Tech Stack

- **Framework**: [Expo](https://expo.dev) (React Native)
- **Navigation**: Expo Router (File-based routing)
- **Backend / Database**: [Convex](https://convex.dev)
- **Payments**: [RevenueCat](https://www.revenuecat.com/)
- **Admin Panel**: Next.js
- **Styling**: NativeWind (TailwindCSS for React Native)
- **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- Expo Go app on your phone (for mobile testing)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/dobrinz123/kidzstorys.git
cd kidzstorys
pnpm install
```

### 2. Environment Setup

Create `.env.local` files in `apps/mobile` and `apps/admin` with your keys:

- **Convex**: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`
- **RevenueCat**: `EXPO_PUBLIC_REVENUECAT_WEB_KEY`, `..._IOS_KEY`, `..._ANDROID_KEY`

### 3. Running the App

**Mobile & Web (Expo):**
```bash
cd apps/mobile
npx expo start
```
*Press `w` for Web, `i` for iOS Simulator, or scan QR code with your phone.*

**Backend (Convex):**
```bash
npx convex dev
```

**Admin Panel:**
```bash
cd apps/admin
npm run dev
```

## 📦 Deployment

### Web (Vercel)
The web versions (both the App and Admin) are optimized for deployment on Vercel.
- Build command: `expo export -p web` (for App) / `next build` (for Admin).
- Output directory: `dist` (for App).

### Mobile (Stores)
Use **EAS Build** to generate binaries for App Store and Play Store.
```bash
eas build --platform all
```

## 🔒 Security
- **Authentication**: Secure email/password auth via Convex.
- **Privacy**: Child data is siloed and protected.
- **Payments**: PCI-DSS compliant via RevenueCat & Stripe integration.

---
*Built with ❤️ by Dobrin David Marius.*
# Trigger Vercel build
