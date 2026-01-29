# Kids Stories - Production Deployment Checklist

Checklist complet pentru deployment în producție.

---

## 📋 PRE-DEPLOYMENT

### ✅ Local Testing
- [ ] Toate dependencies instalate (`pnpm install`)
- [ ] Convex dev ruleazӑ fără erori
- [ ] Mobile app ruleazӑ în Expo Go
- [ ] Admin panel ruleazӑ pe localhost:3000
- [ ] 100 stories validate (`pnpm validate-stories`)
- [ ] Database seeded cu success
- [ ] Auth flow funcționează (sign up/sign in)
- [ ] Paywall se deschide corect
- [ ] Settings screen permite schimbare limbă
- [ ] Translations arată corect în toate 3 limbile

### ✅ Code Quality
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No console.errors în production code
- [ ] Environment variables documentate în .env.example
- [ ] Git repository initialized
- [ ] .gitignore verificat (no .env files committed)

---

## 🔐 REVENUECAT SETUP

### 1. Create Account
- [ ] Sign up at https://www.revenuecat.com
- [ ] Create new project: "Kids Stories"
- [ ] Note down Project ID

### 2. iOS App Configuration
- [ ] Add iOS app in RevenueCat dashboard
- [ ] Bundle ID: `com.kidsstories.app`
- [ ] Upload App Store Connect API Key
- [ ] Copy iOS API Key: `appl_xxxxx`

### 3. Android App Configuration
- [ ] Add Android app in RevenueCat dashboard
- [ ] Package name: `com.kidsstories.app`
- [ ] Upload Google Play Service Credentials JSON
- [ ] Copy Android API Key: `goog_xxxxx`

### 4. Products & Entitlements
- [ ] Create entitlement: `premium`
- [ ] Create product: Monthly subscription
  - Product ID (iOS): `kids_stories_monthly`
  - Product ID (Android): `kids_stories_monthly`
  - Price: $4.99/month
- [ ] Create product: Yearly subscription
  - Product ID (iOS): `kids_stories_yearly`
  - Product ID (Android): `kids_stories_yearly`
  - Price: $39.99/year
- [ ] Attach both products to `premium` entitlement

### 5. Webhook Configuration
- [ ] Go to Integrations → Webhooks
- [ ] Add new webhook
- [ ] URL: `https://kids-stories-admin.vercel.app/api/revenuecat-webhook`
- [ ] Select events:
  - [x] INITIAL_PURCHASE
  - [x] RENEWAL
  - [x] CANCELLATION
  - [x] EXPIRATION
  - [x] BILLING_ISSUE
- [ ] Copy Authorization Header (webhook secret)
- [ ] Save webhook configuration

### 6. Testing
- [ ] Use Sandbox tester accounts (iOS TestFlight)
- [ ] Use License tester accounts (Android Internal Testing)
- [ ] Verify webhook fires after purchase
- [ ] Verify entitlement updates in Convex

---

## ☁️ CONVEX DEPLOYMENT

### 1. Deploy Backend
```bash
cd convex
npx convex deploy
```

- [ ] Copy production URL: `https://xxx.convex.cloud`
- [ ] Deployment successful (no errors)

### 2. Set Environment Variables
Go to Convex Dashboard → Settings → Environment Variables:

- [ ] `REVENUECAT_WEBHOOK_SECRET` = [from RevenueCat]
- [ ] `ADMIN_ALLOWLIST_SEED_EMAILS` = `your-email@domain.com`

### 3. Seed Production Database
```bash
$env:CONVEX_URL="https://xxx.convex.cloud"
pnpm seed
```

- [ ] 6 categories created
- [ ] 100 stories created
- [ ] Admin user created

### 4. Verify in Dashboard
- [ ] Open Convex dashboard
- [ ] Check Data → categories: 6 entries
- [ ] Check Data → stories: 100 entries
- [ ] Check Data → users: 1+ entries
- [ ] Check Logs: no errors

---

## 📱 MOBILE APP DEPLOYMENT (EAS)

### 1. Setup EAS
```bash
npm install -g eas-cli
eas login
```

- [ ] EAS CLI installed
- [ ] Logged in with Expo account

### 2. Configure Project
```bash
cd apps/mobile
eas build:configure
```

- [ ] `eas.json` generated
- [ ] iOS Bundle ID: `com.kidsstories.app`
- [ ] Android Package: `com.kidsstories.app`

### 3. Update app.json
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id-from-expo"
      }
    }
  }
}
```

### 4. Set Environment Secrets
```bash
eas secret:create --scope project --name EXPO_PUBLIC_CONVEX_URL --value https://xxx.convex.cloud
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxxxx
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_xxxxx
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID --value premium
```

- [ ] All 4 secrets created

### 5. Build iOS
```bash
eas build --platform ios --profile production
```

- [ ] Build started (will take ~20 min)
- [ ] Build completed successfully
- [ ] Download IPA or use EAS Submit

### 6. Build Android
```bash
eas build --platform android --profile production
```

- [ ] Build started
- [ ] Build completed successfully
- [ ] Download AAB or use EAS Submit

### 7. Submit to Stores

**iOS (App Store Connect):**
```bash
eas submit --platform ios
```

- [ ] App uploaded to App Store Connect
- [ ] Screenshots added
- [ ] App description added (EN/RO/IT)
- [ ] Privacy policy URL added
- [ ] Terms of service URL added
- [ ] In-App Purchases configured
- [ ] Submitted for review

**Android (Google Play Console):**
```bash
eas submit --platform android
```

- [ ] App uploaded to Google Play Console
- [ ] Screenshots added
- [ ] App description added (EN/RO/IT)
- [ ] Privacy policy URL added
- [ ] Terms of service URL added
- [ ] In-App Products configured
- [ ] Submitted for review

---

## 🌐 ADMIN PANEL DEPLOYMENT (VERCEL)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

- [ ] Vercel CLI installed

### 2. Deploy
```bash
cd apps/admin
vercel --prod
```

- [ ] Deployment started
- [ ] Deployment URL: `https://kids-stories-admin.vercel.app`
- [ ] Deployment successful

### 3. Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

- [ ] `NEXT_PUBLIC_CONVEX_URL` = `https://xxx.convex.cloud`
- [ ] `REVENUECAT_WEBHOOK_SECRET` = [same as Convex]

### 4. Redeploy
```bash
vercel --prod
```

- [ ] Redeployment completed with new env vars

### 5. Update RevenueCat Webhook URL
- [ ] Go to RevenueCat → Webhooks
- [ ] Update URL to: `https://kids-stories-admin.vercel.app/api/revenuecat-webhook`
- [ ] Test webhook (Send Test Event)
- [ ] Verify webhook received in Vercel logs

---

## 🔒 SECURITY CHECKS

### Environment Variables
- [ ] No .env files in git repository
- [ ] All secrets stored in platform-specific secret managers
- [ ] REVENUECAT_WEBHOOK_SECRET is strong and unique
- [ ] Admin allowlist emails verified

### Access Control
- [ ] Admin panel protected by admin allowlist
- [ ] All story content requires active subscription
- [ ] Webhook signature verification working
- [ ] No public API endpoints exposing sensitive data

### Data Privacy
- [ ] Privacy policy created and linked
- [ ] Terms of service created and linked
- [ ] GDPR compliance checked (if targeting EU)
- [ ] User data deletion flow implemented (GDPR right to erasure)

---

## ✅ POST-DEPLOYMENT TESTING

### Mobile App (Production)
- [ ] Download from TestFlight (iOS) / Internal Testing (Android)
- [ ] Sign up with test account
- [ ] Browse stories (all locked)
- [ ] Tap story → paywall appears
- [ ] Purchase subscription (sandbox)
- [ ] Verify webhook fires
- [ ] Verify stories unlock
- [ ] Read full story + parent questions
- [ ] Add to favorites
- [ ] Change language → UI updates
- [ ] Change language → story content updates
- [ ] Sign out and back in → subscription persists
- [ ] Restore purchases works

### Admin Panel (Production)
- [ ] Visit production URL
- [ ] Login with admin email
- [ ] View dashboard
- [ ] View categories (6 total)
- [ ] View stories (100 total)
- [ ] Filter stories by category
- [ ] Search for specific story
- [ ] Verify multilingual content displays correctly

### RevenueCat Integration
- [ ] Sandbox purchase → webhook fires within 30 seconds
- [ ] Check Convex logs for webhook processing
- [ ] Check user entitlement updated in Convex data
- [ ] Check RevenueCat dashboard shows active subscription
- [ ] Test subscription renewal
- [ ] Test subscription cancellation
- [ ] Test restore purchases

---

## 📊 MONITORING SETUP

### Convex
- [ ] Enable error notifications
- [ ] Set up alerts for failed functions
- [ ] Monitor webhook success rate
- [ ] Track database size

### Vercel
- [ ] Enable error tracking
- [ ] Set up uptime monitoring
- [ ] Configure deployment notifications
- [ ] Monitor webhook endpoint

### RevenueCat
- [ ] Enable revenue notifications
- [ ] Set up churn alerts
- [ ] Monitor subscription analytics
- [ ] Track conversion funnel

### Mobile App
- [ ] Integrate crash reporting (Sentry)
- [ ] Set up analytics (Expo Analytics or Firebase)
- [ ] Monitor app performance
- [ ] Track user engagement

---

## 🎯 LAUNCH CHECKLIST

### Pre-Launch (1 week before)
- [ ] All deployment steps completed
- [ ] Production testing completed
- [ ] App Store / Play Store listings finalized
- [ ] Privacy policy live
- [ ] Terms of service live
- [ ] Support email configured
- [ ] Social media accounts created
- [ ] Landing page created (optional)

### Launch Day
- [ ] App approved on App Store
- [ ] App approved on Google Play
- [ ] Public availability enabled
- [ ] Monitor webhook success rate
- [ ] Monitor new user signups
- [ ] Monitor subscription purchases
- [ ] Respond to initial user feedback

### Post-Launch (first week)
- [ ] Daily monitoring of error rates
- [ ] Daily monitoring of subscription metrics
- [ ] Respond to all user support requests within 24h
- [ ] Fix any critical bugs immediately
- [ ] Collect user feedback
- [ ] Plan first update based on feedback

---

## 📈 SUCCESS METRICS

Track these KPIs:

### Week 1
- [ ] Total downloads: Target 100+
- [ ] Active users: Target 50+
- [ ] Conversion rate (free → paid): Target 5%+
- [ ] Crash-free rate: Target 99%+
- [ ] Webhook success rate: Target 100%

### Month 1
- [ ] Monthly Active Users: Target 500+
- [ ] Paying subscribers: Target 25+
- [ ] Monthly Recurring Revenue: Target $100+
- [ ] Retention rate (Day 7): Target 20%+
- [ ] Average session duration: Target 10+ min

---

## 🆘 ROLLBACK PLAN

If critical issues occur:

### Mobile App
```bash
# Revert to previous build in EAS
eas build:list
eas submit --build-id [previous-successful-build]
```

### Admin Panel
```bash
# Revert deployment in Vercel dashboard
# Or redeploy previous commit
git checkout [previous-commit]
vercel --prod
```

### Convex
```bash
# Restore from backup in Convex dashboard
# Data → Backups → Restore
```

### RevenueCat
- Webhook can be disabled temporarily
- Subscriptions will continue to work
- Re-enable when issue is fixed

---

## 📝 NOTES

- Keep this checklist updated as deployment process evolves
- Document any issues encountered and solutions
- Share learnings with team
- Celebrate successful deployment! 🎉

---

**Last Updated:** [Date]
**Deployed By:** [Name]
**Deployment Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
