# Kids Stories - Quick Start Guide

Ghid rapid pentru a rula aplicația local în 10 minute.

---

## ⚡ SETUP RAPID (10 min)

### 1. Install Dependencies (2 min)
```bash
cd C:\Users\david\Desktop\RANDOM\STORY_KIDS
pnpm install
```

### 2. Setup Convex Backend (3 min)
```bash
# Login to Convex
cd convex
npx convex login

# Start dev server (va genera CONVEX_URL)
npx convex dev
```

**IMPORTANT:** Copiază `CONVEX_URL` din terminal output (ex: `https://happy-cat-123.convex.cloud`)

### 3. Configure Environment Variables (2 min)

**convex/.env** (creează fișierul):
```bash
REVENUECAT_WEBHOOK_SECRET=test_secret_123
ADMIN_ALLOWLIST_SEED_EMAILS=admin@test.com
```

**apps/mobile/.env** (creează fișierul):
```bash
EXPO_PUBLIC_CONVEX_URL=https://happy-cat-123.convex.cloud
EXPO_PUBLIC_REVENUECAT_IOS_KEY=test_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=test_key
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium
```

**apps/admin/.env.local** (creează fișierul):
```bash
NEXT_PUBLIC_CONVEX_URL=https://happy-cat-123.convex.cloud
REVENUECAT_WEBHOOK_SECRET=test_secret_123
```

### 4. Validate & Seed Database (2 min)
```bash
# Din root folder
cd C:\Users\david\Desktop\RANDOM\STORY_KIDS

# Validate stories
pnpm validate-stories
# Ar trebui să vezi: ✅ All validations passed! 100 stories ready

# Seed database
$env:CONVEX_URL="https://happy-cat-123.convex.cloud"
pnpm seed
```

Ar trebui să vezi:
```
📚 Seeding categories...
  ✓ Created category: bedtime
  ✓ Created category: calm-down
  ...
📖 Seeding stories...
  ✓ Created stories 1-10
  ✓ Created stories 11-20
  ...
✅ Seeded 100 stories
👤 Seeding admin users...
  ✓ Created admin user: admin@test.com
✨ Seed completed successfully!
```

### 5. Run Applications (1 min)

**Terminal 1 - Convex (deja ruleazӑ):**
```bash
cd convex
npx convex dev
```

**Terminal 2 - Mobile App:**
```bash
cd C:\Users\david\Desktop\RANDOM\STORY_KIDS
pnpm mobile
```

**Terminal 3 - Admin Panel:**
```bash
cd C:\Users\david\Desktop\RANDOM\STORY_KIDS
pnpm admin
```

---

## 📱 TESTARE APLICAȚIE

### Mobile App (Expo)
1. Scanează QR code cu Expo Go app (iOS/Android)
2. Sau apasă `w` pentru web browser
3. Creează cont nou (Sign Up)
4. Browse stories (toate sunt locked)
5. Tap pe o poveste → redirect la paywall
6. **Pentru testare fără RevenueCat:** modifică temporary în Convex user-ul tău:
   ```javascript
   // În Convex dashboard, rulează în Console:
   const user = await db.query("users").first();
   await db.patch(user._id, { entitlementActive: true });
   ```
7. Reîncarcă app → stories sunt unlocked!

### Admin Panel
1. Deschide http://localhost:3000
2. Vezi dashboard cu Categories și Stories
3. Click pe Stories → vezi toate cele 100 de povești
4. Poți adăuga/edita povești (CRUD complet în backend)

---

## 🔧 COMENZI UTILE

```bash
# Install all dependencies
pnpm install

# Validate stories structure
pnpm validate-stories

# Seed database (after Convex is running)
$env:CONVEX_URL="https://your-url.convex.cloud"
pnpm seed

# Start mobile app
pnpm mobile

# Start admin panel
pnpm admin

# Deploy Convex to production
cd convex
npx convex deploy

# Build mobile app for production
cd apps/mobile
eas build --platform ios
eas build --platform android
```

---

## 📊 VERIFICARE DUPĂ SEED

### Check în Convex Dashboard (dashboard.convex.dev)

1. Deschide Convex dashboard
2. Selectează proiectul tău
3. Click pe "Data" → "Tables"
4. Verifică:
   - **categories**: 6 entries
   - **stories**: 100 entries
   - **users**: 1 entry (admin)
   - **adminUsers**: 1 entry

### Check Stories Distribution
```bash
# Rulează în Convex Console:
const stories = await db.query("stories").collect();
const distribution = {};
stories.forEach(s => {
  const cat = s.categoryId;
  distribution[cat] = (distribution[cat] || 0) + 1;
});
console.log(distribution);
```

Ar trebui să vezi:
```javascript
{
  "bedtime": 25,
  "calm-down": 15,
  "emotions": 15,
  "adventure": 20,
  "learn-to-read": 15,
  "curiosities": 10
}
```

---

## 🐛 TROUBLESHOOTING

### Eroare: "CONVEX_URL is not set"
**Fix:**
```bash
# Windows PowerShell:
$env:CONVEX_URL="https://your-url.convex.cloud"
pnpm seed

# Windows CMD:
set CONVEX_URL=https://your-url.convex.cloud
pnpm seed
```

### Eroare: "Module not found"
**Fix:**
```bash
pnpm install
```

### Mobile app nu se conectează la Convex
**Fix:**
1. Verifică că `apps/mobile/.env` există
2. Verifică că `EXPO_PUBLIC_CONVEX_URL` e corect
3. Restart Expo: apasă `r` în terminal

### Stories nu apar în app
**Fix:**
1. Verifică în Convex dashboard că stories sunt seeded
2. Verifică că `isPublished: true` pentru stories
3. Check logs în Convex dashboard → "Logs"

### Paywall nu funcționează
**Așteptat:** În development fără RevenueCat setup real, paywall-ul va arăta "No offerings"

**Pentru testare:**
- Opțiunea 1: Setup RevenueCat Sandbox (urmează ghidul din README)
- Opțiunea 2: Modifică temporary entitlement în Convex (vezi secțiunea Testare mai sus)

---

## ✅ SUCCESS CHECKLIST

După rulare, ar trebui să vezi:

- [x] Convex dev server ruleazӑ (Terminal 1)
- [x] Mobile app ruleazӑ (Terminal 2) - QR code vizibil
- [x] Admin panel ruleazӑ (Terminal 3) - http://localhost:3000
- [x] 6 categories în Convex dashboard
- [x] 100 stories în Convex dashboard
- [x] 1 admin user în Convex dashboard
- [x] Mobile app arată Home screen cu categories
- [x] Toate stories au lock icon (fără subscription)
- [x] Paywall se deschide când tap pe story locked
- [x] Admin panel arată dashboard

---

## 🎯 NEXT: PRODUCTION DEPLOYMENT

După testare locală, deployment:

1. **RevenueCat Setup** (30 min)
   - Creează cont
   - Add iOS + Android apps
   - Create products + entitlement
   - Configure webhook

2. **Deploy Convex** (5 min)
   ```bash
   cd convex
   npx convex deploy
   ```

3. **Deploy Admin** (10 min)
   ```bash
   cd apps/admin
   vercel --prod
   ```

4. **Build Mobile** (30 min)
   ```bash
   eas build --platform all
   eas submit --platform all
   ```

**Timp total deployment: ~1.5 ore**

---

Mult succes! 🚀
