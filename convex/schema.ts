import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ USERS & AUTH ============
  users: defineTable({
    email: v.string(),
    passwordHash: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),

    // Subscription/Entitlement
    entitlementActive: v.boolean(),
    entitlementExpiresAt: v.optional(v.number()),
    revenueCatAppUserId: v.optional(v.string()),
    lastCustomerInfoSyncedAt: v.optional(v.number()),

    // Subscription type for statistics
    subscriptionType: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("yearly"),
        v.literal("trial")
      )
    ),

    // Preferences
    preferredLanguage: v.union(
      v.literal("en"),
      v.literal("ro"),
      v.literal("it")
    ),

    // Password Reset
    resetToken: v.optional(v.string()),
    resetTokenExpiresAt: v.optional(v.number()),
    resetAttempts: v.optional(v.number()), // Track verification attempts

    // Trial tracking
    hasUsedTrial: v.optional(v.boolean()),
    trialUsedAt: v.optional(v.number()),

    // Activity tracking for statistics
    lastActiveAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_revenueCatAppUserId", ["revenueCatAppUserId"])
    .index("by_entitlement", ["entitlementActive", "entitlementExpiresAt"])
    .index("by_subscription_type", ["subscriptionType", "entitlementActive"])
    .index("by_last_active", ["lastActiveAt"])
    .index("by_created", ["createdAt"]),

  // User sessions for secure authentication
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(), // Secure random token (64 hex chars)
    expiresAt: v.number(), // Unix timestamp
    createdAt: v.number(),
    lastActiveAt: v.number(),
    userAgent: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"])
    .index("by_expires", ["expiresAt"]),

  // Rate limiting for security
  rateLimits: defineTable({
    key: v.string(), // e.g., "signIn:user@email.com"
    action: v.string(), // "signIn", "signUp", "passwordReset"
    count: v.number(),
    windowStart: v.number(), // Start of current window
    blockedUntil: v.optional(v.number()),
  })
    .index("by_key_action", ["key", "action"]),

  adminUsers: defineTable({
    email: v.string(),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("editor")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_userId", ["userId"])
    .index("by_role", ["role"]),

  // ============ CONTENT ============
  categories: defineTable({
    slug: v.string(),
    order: v.number(),

    // Multilingual names and descriptions
    name_en: v.string(),
    name_ro: v.string(),
    name_it: v.string(),
    description_en: v.string(),
    description_ro: v.string(),
    description_it: v.string(),

    iconKey: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"])
    .index("by_active", ["isActive", "order"]),

  // Books - New structure with pages (replaces stories for new content)
  books: defineTable({
    // Identification
    bookKey: v.string(), // unique slug

    // Category reference
    categoryId: v.id("categories"),

    // Metadata
    ageMin: v.number(),
    ageMax: v.number(),
    durationMin: v.number(),

    // Cover - separate from pages
    cover: v.object({
      // For new books: Convex storage ID
      // For migrated books: null (use legacy asset mapping)
      imageId: v.optional(v.id("_storage")),
      // Legacy asset key for migrated stories (maps to coverImages.ts)
      legacyAssetKey: v.optional(v.string()),
      // Titles in all languages
      title_en: v.string(),
      title_ro: v.string(),
      title_it: v.string(),
    }),

    // Pages - structured content
    pages: v.array(
      v.object({
        pageNumber: v.number(),
        // For new books: Convex storage ID
        // For migrated books: null (use legacy scene mapping)
        imageId: v.optional(v.id("_storage")),
        // Legacy asset key for migrated stories
        legacyAssetKey: v.optional(v.string()),
        // Text in all languages
        text_en: v.string(),
        text_ro: v.string(),
        text_it: v.string(),
        // Audio storage — EN
        audioUrl_en: v.optional(v.string()),
        audioStorageId_en: v.optional(v.id("_storage")),
        audioStatus_en: v.optional(
          v.union(
            v.literal("pending"),
            v.literal("generating"),
            v.literal("done"),
            v.literal("failed")
          )
        ),
        audioGeneratedAt_en: v.optional(v.number()),
        // Audio storage — RO
        audioUrl_ro: v.optional(v.string()),
        audioStorageId_ro: v.optional(v.id("_storage")),
        audioStatus_ro: v.optional(
          v.union(
            v.literal("pending"),
            v.literal("generating"),
            v.literal("done"),
            v.literal("failed")
          )
        ),
        audioGeneratedAt_ro: v.optional(v.number()),
      })
    ),

    // Tags per language
    tags_en: v.array(v.string()),
    tags_ro: v.array(v.string()),
    tags_it: v.array(v.string()),

    // Parent discussion questions
    parentQuestions_en: v.array(v.string()),
    parentQuestions_ro: v.array(v.string()),
    parentQuestions_it: v.array(v.string()),

    // For Adventure series
    seriesId: v.optional(v.string()),
    episodeNo: v.optional(v.number()),

    // Publishing status
    status: v.union(
      v.literal("draft"),
      v.literal("ready"), // Validated, ready to publish
      v.literal("published")
    ),
    publishedAt: v.optional(v.number()),

    // Versioning
    version: v.number(),
    previousVersionId: v.optional(v.id("bookVersions")),

    // Migration flag
    migratedFromStory: v.optional(v.boolean()),

    // Stats
    readCount: v.number(),
    favoriteCount: v.number(),

    // Audit
    createdBy: v.optional(v.id("adminUsers")),
    updatedBy: v.optional(v.id("adminUsers")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bookKey", ["bookKey"])
    .index("by_category", ["categoryId", "status"])
    .index("by_status", ["status", "publishedAt"])
    .index("by_published_date", ["publishedAt"])
    .index("by_series", ["seriesId", "episodeNo"])
    .index("by_migrated", ["migratedFromStory"]),

  // Book versions for audit trail
  bookVersions: defineTable({
    bookId: v.id("books"),
    version: v.number(),

    // Complete snapshot of the book at save time
    snapshot: v.object({
      cover: v.object({
        imageId: v.optional(v.id("_storage")),
        legacyAssetKey: v.optional(v.string()),
        title_en: v.string(),
        title_ro: v.string(),
        title_it: v.string(),
      }),
      pages: v.array(
        v.object({
          pageNumber: v.number(),
          imageId: v.optional(v.id("_storage")),
          legacyAssetKey: v.optional(v.string()),
          text_en: v.string(),
          text_ro: v.string(),
          text_it: v.string(),
          // Audio storage — EN (snapshot mirror)
          audioUrl_en: v.optional(v.string()),
          audioStorageId_en: v.optional(v.id("_storage")),
          audioStatus_en: v.optional(
            v.union(
              v.literal("pending"),
              v.literal("generating"),
              v.literal("done"),
              v.literal("failed")
            )
          ),
          audioGeneratedAt_en: v.optional(v.number()),
          // Audio storage — RO (snapshot mirror)
          audioUrl_ro: v.optional(v.string()),
          audioStorageId_ro: v.optional(v.id("_storage")),
          audioStatus_ro: v.optional(
            v.union(
              v.literal("pending"),
              v.literal("generating"),
              v.literal("done"),
              v.literal("failed")
            )
          ),
          audioGeneratedAt_ro: v.optional(v.number()),
        })
      ),
      tags_en: v.array(v.string()),
      tags_ro: v.array(v.string()),
      tags_it: v.array(v.string()),
      parentQuestions_en: v.array(v.string()),
      parentQuestions_ro: v.array(v.string()),
      parentQuestions_it: v.array(v.string()),
      ageMin: v.number(),
      ageMax: v.number(),
      durationMin: v.number(),
      categoryId: v.id("categories"),
    }),

    // Change metadata
    changeNote: v.optional(v.string()),
    changedBy: v.id("adminUsers"),
    createdAt: v.number(),
  })
    .index("by_book", ["bookId", "version"])
    .index("by_book_date", ["bookId", "createdAt"]),

  // Audit log for all changes
  auditLog: defineTable({
    // What was modified
    entityType: v.union(
      v.literal("book"),
      v.literal("category"),
      v.literal("user"),
      v.literal("adminUser"),
      v.literal("settings")
    ),
    entityId: v.string(),

    // Action taken
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("publish"),
      v.literal("unpublish"),
      v.literal("restore_version")
    ),

    // Details
    changes: v.optional(v.string()), // JSON diff
    description: v.string(),

    // Who performed it
    performedBy: v.id("adminUsers"),
    performedAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_performer", ["performedBy", "performedAt"])
    .index("by_date", ["performedAt"]),

  // ============ LEGACY STORIES (kept for backward compatibility) ============
  stories: defineTable({
    storyKey: v.string(),
    categoryId: v.id("categories"),
    ageMin: v.number(),
    ageMax: v.number(),
    durationMin: v.number(),

    // Tags per language
    tags_en: v.array(v.string()),
    tags_ro: v.array(v.string()),
    tags_it: v.array(v.string()),

    // For Adventure series
    seriesId: v.optional(v.string()),
    episodeNo: v.optional(v.number()),

    // Multilingual content
    locales: v.object({
      en: v.object({
        title: v.string(),
        text: v.string(),
        parentQuestions: v.array(v.string()),
      }),
      ro: v.object({
        title: v.string(),
        text: v.string(),
        parentQuestions: v.array(v.string()),
      }),
      it: v.object({
        title: v.string(),
        text: v.string(),
        parentQuestions: v.array(v.string()),
      }),
    }),

    // Publishing
    publishedAt: v.optional(v.number()),
    isPublished: v.boolean(),

    // Migration flag - marks if this story has been migrated to books table
    migratedToBooks: v.optional(v.boolean()),

    // Stats
    readCount: v.number(),
    favoriteCount: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_storyKey", ["storyKey"])
    .index("by_category", ["categoryId", "isPublished"])
    .index("by_published", ["isPublished", "publishedAt"])
    .index("by_age_range", ["ageMin", "ageMax", "isPublished"])
    .index("by_series", ["seriesId", "episodeNo"]),

  // ============ USER DATA ============
  childProfiles: defineTable({
    userId: v.id("users"),
    nickname: v.string(),
    ageBracket: v.number(),
    preferences: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  favorites: defineTable({
    userId: v.id("users"),
    storyKey: v.string(), // Can reference both stories and books via key
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_story", ["userId", "storyKey"]),

  routines: defineTable({
    userId: v.id("users"),
    childProfileId: v.optional(v.id("childProfiles")),
    categoryId: v.id("categories"),
    durationMin: v.number(),
    timeHHMM: v.string(),
    enabled: v.boolean(),
    notificationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_profile", ["childProfileId"]),

  progress: defineTable({
    userId: v.id("users"),
    storyKey: v.string(), // Can reference both stories and books via key
    childProfileId: v.optional(v.id("childProfiles")),
    lastReadAt: v.number(),
    completed: v.boolean(),
    readingPosition: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_story", ["userId", "storyKey"])
    .index("by_user", ["userId", "lastReadAt"]),

  // ============ SUBSCRIPTION EVENTS ============
  subscriptionEvents: defineTable({
    userId: v.id("users"),
    revenueCatAppUserId: v.string(),
    eventType: v.string(),
    productId: v.string(),
    expiresAt: v.optional(v.number()),
    isTrial: v.boolean(),
    processedAt: v.number(),
  })
    .index("by_user", ["userId", "processedAt"])
    .index("by_revenueCatAppUserId", ["revenueCatAppUserId"]),
});
