# 📋 ADMIN PANEL - IMPLEMENTAT ✅

## 🎯 OVERVIEW

Implementare completă a panoului de administrare pentru Kids Stories cu:
- UI consistent cu aplicația (tema light cu accente violet)
- Editor de cărți tip Word cu pagini structurate
- Sistem de versionare și audit log
- Statistici comprehensive
- Roluri: Admin și Editor

---

## 📁 STRUCTURA NOUĂ DE FIȘIERE

```
apps/admin/
├── app/
│   ├── layout.tsx                    # Layout principal cu sidebar
│   ├── globals.css                   # Tema și variabile CSS
│   ├── page.tsx                      # Redirect la login/dashboard
│   ├── login/
│   │   └── page.tsx                  # Pagina de autentificare
│   ├── dashboard/
│   │   ├── layout.tsx                # Layout dashboard cu sidebar
│   │   ├── page.tsx                  # Overview (pentru admin)
│   │   ├── categories/
│   │   │   └── page.tsx              # Gestionare categorii
│   │   ├── books/
│   │   │   ├── page.tsx              # Lista cărți cu filtre
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Creator carte nouă
│   │   │   └── [bookId]/
│   │   │       ├── page.tsx          # Editor carte
│   │   │       └── versions/
│   │   │           └── page.tsx      # Istoric versiuni
│   │   ├── statistics/               # DOAR ADMIN
│   │   │   ├── page.tsx              # Dashboard statistici
│   │   │   ├── users/
│   │   │   │   └── page.tsx          # Statistici utilizatori
│   │   │   └── subscriptions/
│   │   │       └── page.tsx          # Statistici abonamente
│   │   └── settings/                 # DOAR ADMIN
│   │       └── page.tsx              # Setări sistem
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               # Navigare laterală
│   │   ├── Header.tsx                # Header cu user info
│   │   └── RoleGuard.tsx             # Protecție bazată pe rol
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Tabs.tsx
│   │   └── Toast.tsx
│   ├── books/
│   │   ├── BookEditor.tsx            # Editor principal
│   │   ├── PageEditor.tsx            # Editor per pagină
│   │   ├── PagePreview.tsx           # Preview pagină (stil carte)
│   │   ├── CoverEditor.tsx           # Editor copertă
│   │   ├── ImageUploader.tsx         # Upload imagini
│   │   ├── LanguageTabs.tsx          # Tabs EN/RO/IT
│   │   ├── PublishValidator.tsx      # Validare înainte de publicare
│   │   └── BookList.tsx              # Lista cu filtre
│   └── statistics/
│       ├── StatCard.tsx              # Card statistică
│       ├── UserChart.tsx             # Grafic utilizatori
│       ├── SubscriptionChart.tsx     # Grafic abonamente
│       └── TopStoriesTable.tsx       # Tabel povești populare
├── hooks/
│   ├── useAuth.ts                    # Hook autentificare
│   ├── useRole.ts                    # Hook verificare rol
│   └── useToast.ts                   # Hook notificări
├── lib/
│   ├── constants.ts                  # Constante (culori, etc.)
│   └── validation.ts                 # Funcții validare
└── types/
    └── index.ts                      # TypeScript types
```

---

## 🗄️ MODIFICĂRI SCHEMA CONVEX

### 1. Tabel `adminUsers` - ACTUALIZAT

```typescript
adminUsers: defineTable({
  email: v.string(),
  userId: v.id("users"),
  role: v.union(v.literal("admin"), v.literal("editor")), // NOU
  createdAt: v.number(),
  updatedAt: v.number(), // NOU
})
  .index("by_email", ["email"])
  .index("by_userId", ["userId"])
  .index("by_role", ["role"]), // NOU
```

### 2. Tabel `books` - NOU (înlocuiește structura stories pentru cărți noi)

```typescript
books: defineTable({
  // Identificare
  bookKey: v.string(), // slug unic
  categoryId: v.id("categories"),

  // Metadata
  ageMin: v.number(),
  ageMax: v.number(),
  durationMin: v.number(),

  // Copertă separată
  cover: v.object({
    imageId: v.id("_storage"), // Convex File Storage
    title_en: v.string(),
    title_ro: v.string(),
    title_it: v.string(),
  }),

  // Pagini structurate
  pages: v.array(v.object({
    pageNumber: v.number(),
    imageId: v.id("_storage"),
    text_en: v.string(),
    text_ro: v.string(),
    text_it: v.string(),
  })),

  // Tags per limbă
  tags_en: v.array(v.string()),
  tags_ro: v.array(v.string()),
  tags_it: v.array(v.string()),

  // Parent questions
  parentQuestions_en: v.array(v.string()),
  parentQuestions_ro: v.array(v.string()),
  parentQuestions_it: v.array(v.string()),

  // Serie (opțional)
  seriesId: v.optional(v.string()),
  episodeNo: v.optional(v.number()),

  // Publishing
  status: v.union(
    v.literal("draft"),
    v.literal("ready"),      // Validat, gata de publicare
    v.literal("published")
  ),
  publishedAt: v.optional(v.number()),

  // Versionare
  version: v.number(),
  previousVersionId: v.optional(v.id("bookVersions")),

  // Stats
  readCount: v.number(),
  favoriteCount: v.number(),

  // Audit
  createdBy: v.id("adminUsers"),
  updatedBy: v.id("adminUsers"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_bookKey", ["bookKey"])
  .index("by_category", ["categoryId", "status"])
  .index("by_status", ["status", "publishedAt"])
  .index("by_published_date", ["publishedAt"]) // Pentru "New Arrivals"
  .index("by_series", ["seriesId", "episodeNo"]),
```

### 3. Tabel `bookVersions` - NOU (istoricul versiunilor)

```typescript
bookVersions: defineTable({
  bookId: v.id("books"),
  version: v.number(),

  // Snapshot complet al cărții la momentul salvării
  snapshot: v.object({
    cover: v.object({
      imageId: v.id("_storage"),
      title_en: v.string(),
      title_ro: v.string(),
      title_it: v.string(),
    }),
    pages: v.array(v.object({
      pageNumber: v.number(),
      imageId: v.id("_storage"),
      text_en: v.string(),
      text_ro: v.string(),
      text_it: v.string(),
    })),
    tags_en: v.array(v.string()),
    tags_ro: v.array(v.string()),
    tags_it: v.array(v.string()),
    ageMin: v.number(),
    ageMax: v.number(),
    durationMin: v.number(),
  }),

  // Metadata modificare
  changeNote: v.optional(v.string()),
  changedBy: v.id("adminUsers"),
  createdAt: v.number(),
})
  .index("by_book", ["bookId", "version"])
  .index("by_book_date", ["bookId", "createdAt"]),
```

### 4. Tabel `auditLog` - NOU (log modificări)

```typescript
auditLog: defineTable({
  // Ce s-a modificat
  entityType: v.union(
    v.literal("book"),
    v.literal("category"),
    v.literal("user"),
    v.literal("adminUser")
  ),
  entityId: v.string(),

  // Acțiune
  action: v.union(
    v.literal("create"),
    v.literal("update"),
    v.literal("delete"),
    v.literal("publish"),
    v.literal("unpublish")
  ),

  // Detalii
  changes: v.optional(v.string()), // JSON cu diff-ul
  description: v.string(),

  // Cine
  performedBy: v.id("adminUsers"),
  performedAt: v.number(),
})
  .index("by_entity", ["entityType", "entityId"])
  .index("by_performer", ["performedBy", "performedAt"])
  .index("by_date", ["performedAt"]),
```

### 5. Actualizare `users` - câmpuri noi pentru statistici

```typescript
// Adăugări la users existente:
users: defineTable({
  // ... câmpuri existente ...

  // Statistici
  lastActiveAt: v.optional(v.number()),      // NOU - ultima activitate
  subscriptionType: v.optional(v.union(      // NOU - tip abonament
    v.literal("monthly"),
    v.literal("yearly"),
    v.literal("trial")
  )),
})
  // Index nou pentru statistici
  .index("by_subscription_type", ["subscriptionType", "entitlementActive"])
  .index("by_last_active", ["lastActiveAt"]),
```

---

## 🎨 TEMA ȘI DESIGN SYSTEM

### Variabile CSS (globals.css)

```css
:root {
  /* Primary - Violet din aplicație */
  --primary-50: #F3E8FF;
  --primary-100: #E9D5FF;
  --primary-200: #D8B4FE;
  --primary-300: #C084FC;
  --primary-400: #A855F7;
  --primary-500: #7C4DFF;  /* Main */
  --primary-600: #6D28D9;
  --primary-700: #5B21B6;

  /* Background - Light mode cu accente */
  --bg-primary: #FAFAFA;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F5F3FF;  /* Violet foarte deschis */

  /* Text */
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;

  /* Accente funcționale */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(124, 77, 255, 0.05);
  --shadow-md: 0 4px 6px rgba(124, 77, 255, 0.1);
  --shadow-lg: 0 10px 15px rgba(124, 77, 255, 0.15);

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

### Tailwind Config Extended

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#F3E8FF',
        100: '#E9D5FF',
        500: '#7C4DFF',
        600: '#6D28D9',
        700: '#5B21B6',
      },
      surface: {
        primary: '#FAFAFA',
        secondary: '#FFFFFF',
        tertiary: '#F5F3FF',
      }
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    boxShadow: {
      'card': '0 4px 6px rgba(124, 77, 255, 0.1)',
      'card-hover': '0 10px 15px rgba(124, 77, 255, 0.15)',
    }
  }
}
```

---

## 📖 EDITOR DE CĂRȚI - DESIGN

### Structura UI

```
┌─────────────────────────────────────────────────────────────┐
│  ◀ Back to Books    │  Book: "Dragon Adventure"  │  💾 Save │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Cover] [Page 1] [Page 2] [Page 3] [+ Add Page]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────┬────────────────────────────────┐  │
│  │                     │                                │  │
│  │   📸 IMAGINE        │   📝 TEXT                      │  │
│  │                     │                                │  │
│  │   [Upload Zone]     │   [EN] [RO] [IT]              │  │
│  │                     │                                │  │
│  │   Click to upload   │   ┌─────────────────────────┐ │  │
│  │   or drag & drop    │   │ Once upon a time...     │ │  │
│  │                     │   │                         │ │  │
│  │   📎 Cover.jpg      │   │ There was a little     │ │  │
│  │                     │   │ dragon who loved...    │ │  │
│  │                     │   └─────────────────────────┘ │  │
│  │                     │                                │  │
│  └─────────────────────┴────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PREVIEW (Book Style)                                │  │
│  │  ┌────────────┬─────────────────────────────────┐    │  │
│  │  │            │  Once upon a time there was a   │    │  │
│  │  │  [IMAGE]   │  little dragon who loved to     │    │  │
│  │  │            │  explore the magical forest...  │    │  │
│  │  └────────────┴─────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  METADATA                                                   │
│  ┌─────────────┬──────────────┬──────────────────────┐     │
│  │ Category ▼  │ Age: 3-8     │ Duration: 5 min      │     │
│  └─────────────┴──────────────┴──────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Status: DRAFT                                        │  │
│  │ ⚠️ Missing: Page 3 image, Page 2 Italian text       │  │
│  │                                                      │  │
│  │ [Save Draft]  [Validate] [🚀 Publish - Disabled]    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Fluxul de Validare

```
┌─────────────────────────────────────────┐
│        VALIDATION CHECKLIST             │
├─────────────────────────────────────────┤
│ ✅ Cover image uploaded                 │
│ ✅ Cover title (EN)                     │
│ ✅ Cover title (RO)                     │
│ ✅ Cover title (IT)                     │
│ ✅ Category selected                    │
│ ✅ Age range set                        │
│ ✅ Duration set                         │
├─────────────────────────────────────────┤
│ PAGE 1                                  │
│ ✅ Image uploaded                       │
│ ✅ Text (EN)                            │
│ ✅ Text (RO)                            │
│ ❌ Text (IT) - MISSING                  │
├─────────────────────────────────────────┤
│ PAGE 2                                  │
│ ❌ Image - MISSING                      │
│ ✅ Text (EN)                            │
│ ✅ Text (RO)                            │
│ ✅ Text (IT)                            │
├─────────────────────────────────────────┤
│                                         │
│ 🔴 Cannot publish: 2 issues remaining   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📊 PAGINA DE STATISTICI - DESIGN

### Dashboard Overview (Admin Only)

```
┌─────────────────────────────────────────────────────────────┐
│  📊 STATISTICS DASHBOARD                    Last 30 days ▼  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │ 👥 USERS    │ │ 💳 ACTIVE   │ │ 📚 BOOKS    │ │ 📖     ││
│  │    1,247    │ │     892     │ │    156      │ │ READS  ││
│  │  +12% ↑     │ │   71.5%     │ │  +8 new     │ │ 45.2K  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│
│                                                             │
│  ┌────────────────────────────┐ ┌────────────────────────┐ │
│  │ SUBSCRIPTIONS BY TYPE      │ │ NEW USERS (30 days)    │ │
│  │                            │ │                        │ │
│  │   Monthly ████████░░ 634   │ │    📈 [LINE CHART]    │ │
│  │   Yearly  ████░░░░░░ 198   │ │                        │ │
│  │   Trial   ██░░░░░░░░  60   │ │                        │ │
│  │                            │ │                        │ │
│  └────────────────────────────┘ └────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────┐ ┌────────────────────────┐ │
│  │ TOP STORIES               │ │ USERS BY LANGUAGE      │ │
│  │                            │ │                        │ │
│  │ 1. Dragon Adventure  2.3K │ │   🇬🇧 EN  45%          │ │
│  │ 2. Sleepy Moon      1.9K │ │   🇷🇴 RO  35%          │ │
│  │ 3. Brave Little...  1.7K │ │   🇮🇹 IT  20%          │ │
│  │ 4. Counting Stars   1.5K │ │                        │ │
│  │ 5. Forest Friends   1.2K │ │   [PIE CHART]          │ │
│  └────────────────────────────┘ └────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BOOKS BY CATEGORY                                    │  │
│  │                                                      │  │
│  │ Bedtime      ████████████████████ 25                │  │
│  │ Adventure    ████████████████░░░░ 20                │  │
│  │ Emotions     ████████████░░░░░░░░ 15                │  │
│  │ Learn Read   ████████████░░░░░░░░ 15                │  │
│  │ Calm Down    ████████████░░░░░░░░ 15                │  │
│  │ Curiosities  ████████░░░░░░░░░░░░ 10                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 SISTEM DE ROLURI

### Permisiuni

| Funcționalitate | Editor | Admin |
|----------------|--------|-------|
| Vezi cărți | ✅ | ✅ |
| Creează cărți | ✅ | ✅ |
| Editează cărți | ✅ | ✅ |
| Șterge cărți | ❌ | ✅ |
| Publică cărți | ✅ | ✅ |
| Vezi categorii | ✅ | ✅ |
| Editează categorii | ❌ | ✅ |
| Statistici | ❌ | ✅ |
| Gestionare utilizatori | ❌ | ✅ |
| Audit log complet | ❌ | ✅ |

---

## 🆕 "NEW ARRIVALS" LOGIC

### Criterii pentru a apărea în "New Arrivals"
- Carte publicată în ultimele 7 zile
- Status = "published"
- `publishedAt` în intervalul `[now - 7 days, now]`

### Query Convex

```typescript
export const getNewArrivals = query({
  args: { locale: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const books = await ctx.db
      .query("books")
      .withIndex("by_published_date")
      .filter(q =>
        q.and(
          q.eq(q.field("status"), "published"),
          q.gte(q.field("publishedAt"), sevenDaysAgo)
        )
      )
      .order("desc")
      .take(args.limit || 10);

    return books;
  },
});
```

---

## 📦 DEPENDENȚE NOI DE INSTALAT

```json
{
  "dependencies": {
    "recharts": "^2.10.0",           // Grafice statistici
    "@tanstack/react-table": "^8.0", // Tabel avansat
    "react-dropzone": "^14.2.0",     // Upload imagini
    "zustand": "^4.5.0",             // State management
    "date-fns": "^3.0.0",            // Formatare date
    "lucide-react": "^0.300.0",      // Iconuri
    "class-variance-authority": "^0.7", // Component variants
    "clsx": "^2.1.0",                // Clase condiționale
    "tailwind-merge": "^2.2.0"       // Merge Tailwind classes
  }
}
```

---

## 📋 ORDINEA IMPLEMENTĂRII

### Faza 1: Fundație (Prima)
1. ✅ Schema Convex actualizată
2. ✅ Tema și design system
3. ✅ Componente UI de bază
4. ✅ Layout cu sidebar

### Faza 2: Autentificare și Roluri
5. ✅ Login page
6. ✅ Sistem roluri (admin/editor)
7. ✅ RoleGuard component

### Faza 3: Editor Cărți
8. ✅ Lista cărți cu filtre
9. ✅ Upload imagini (Convex Storage)
10. ✅ Editor copertă
11. ✅ Editor pagini
12. ✅ Validare publicare
13. ✅ Sistem versionare

### Faza 4: Statistici (Doar Admin)
14. ✅ Dashboard overview
15. ✅ Grafice utilizatori
16. ✅ Statistici abonamente
17. ✅ Top stories

### Faza 5: Integrare
18. ✅ Migrare stories existente → books (opțional)
19. ✅ API pentru mobile app (New Arrivals)
20. ✅ Testing end-to-end

---

## ⚠️ NOTE IMPORTANTE

1. **Cărțile existente** - Rămân în tabelul `stories` neschimbate
2. **Cărțile noi** - Se creează în tabelul `books` cu structura nouă
3. **Mobile app** - Va trebui actualizat să citească din ambele tabele
4. **Backward compatibility** - Stories vechi funcționează ca înainte
5. **Versionare** - La fiecare salvare pe o carte publicată se creează versiune nouă

---

## 🚀 PREGĂTIT PENTRU IMPLEMENTARE

Confirmă acest plan și pot începe implementarea de la Faza 1.
