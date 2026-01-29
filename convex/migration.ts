import { v } from "convex/values";
import { mutation, internalMutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Migration: Convert stories to books format
// Image mapping from mobile app
const STORY_SCENES: Record<string, any[]> = {
  "bedtime-001-sleepy-cloud": ["bedtime_001_1.png", "bedtime_001_1.png", "bedtime_001_2.png", "bedtime_001_2.png", "bedtime_001_3.png", "bedtime_001_3.png", "bedtime_001_3.png", "bedtime_001_3.png"],
  "bedtime-002-teddy-lullaby": ["bedtime_002_1.png", "bedtime_002_1.png", "bedtime_002_1.png", "bedtime_002_2.png", "bedtime_002_2.png", "bedtime_002_2.png", "bedtime_002_3.png", "bedtime_002_3.png", "bedtime_002_3.png"],
  "bedtime-003-moonlight-garden": ["bedtime_003_1.png", "bedtime_003_1.png", "bedtime_003_1.png", "bedtime_003_2.png", "bedtime_003_2.png", "bedtime_003_2.png", "bedtime_003_3.png", "bedtime_003_3.png"],
  "bedtime-004-starlight-blanket": ["bedtime_004_1.png", "bedtime_004_1.png", "bedtime_004_1.png", "bedtime_004_2.png", "bedtime_004_2.png", "bedtime_004_2.png", "bedtime_004_3.png", "bedtime_004_3.png"],
  "bedtime-005-sleepy-owl": ["bedtime_005_1.png", "bedtime_005_1.png", "bedtime_005_1.png", "bedtime_005_1.png", "bedtime_005_2.png", "bedtime_005_2.png", "bedtime_005_2.png", "bedtime_005_3.png", "bedtime_005_3.png"],
  "bedtime-006-river-lullaby": ["bedtime_006_1.png", "bedtime_006_1.png", "bedtime_006_1.png", "bedtime_006_2.png", "bedtime_006_2.png", "bedtime_006_2.png", "bedtime_006_3.png", "bedtime_006_3.png"],
  "bedtime-007-snowflake-dreams": ["bedtime_007_1.png", "bedtime_007_1.png", "bedtime_007_1.png", "bedtime_007_2.png", "bedtime_007_2.png", "bedtime_007_2.png", "bedtime_007_3.png", "bedtime_007_3.png"],
  "bedtime-008-sunset-meadow": ["bedtime_008_1.png", "bedtime_008_1.png", "bedtime_008_1.png", "bedtime_008_2.png", "bedtime_008_2.png", "bedtime_008_2.png", "bedtime_008_3.png", "bedtime_008_3.png"],
  "bedtime-009-raindrop-song": ["bedtime_009_1.png", "bedtime_009_1.png", "bedtime_009_1.png", "bedtime_009_2.png", "bedtime_009_2.png", "bedtime_009_2.png", "bedtime_009_3.png", "bedtime_009_3.png"],
  "bedtime-010-feather-bed": ["bedtime_010_1.png", "bedtime_010_1.png", "bedtime_010_1.png", "bedtime_010_1.png", "bedtime_010_2.png", "bedtime_010_2.png", "bedtime_010_2.png", "bedtime_010_3.png", "bedtime_010_3.png"],
  "bedtime-023-treehouse-night": ["bedtime_023_treehouse_night_1.png", "bedtime_023_treehouse_night_1.png", "bedtime_023_treehouse_night_2.png", "bedtime_023_treehouse_night_2.png", "bedtime_023_treehouse_night_3.png", "bedtime_023_treehouse_night_3.png"],
  "bedtime-024-music-box": ["bedtime_024_music_box_1.png", "bedtime_024_music_box_1.png", "bedtime_024_music_box_2.png", "bedtime_024_music_box_2.png", "bedtime_024_music_box_3.png", "bedtime_024_music_box_3.png"],
  "bedtime-025-whale-song": ["bedtime_025_whale_night_1.png", "bedtime_025_whale_night_1.png", "bedtime_025_whale_night_2.png", "bedtime_025_whale_night_2.png", "bedtime_025_whale_night_3.png", "bedtime_025_whale_night_3.png"],
  "calm-down-001-breathing-balloon": ["calm_down_001_1_v2.png", "calm_down_001_1_v2.png", "calm_down_001_2_v2.png", "calm_down_001_2_v2.png", "calm_down_001_3_v2.png", "calm_down_001_3_v2.png"],
  "calm-down-002-gentle-waves": ["calm_down_002_1.png", "calm_down_002_1.png", "calm_down_002_2.png", "calm_down_002_2.png", "calm_down_002_3.png", "calm_down_002_3.png"],
};

export const migrateStoriesToBooks = mutation({
  args: {
    adminUserId: v.id("adminUsers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const adminUser = await ctx.db.get(args.adminUserId);
    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Only admins can run migrations");
    }

    const limit = args.limit || 10;
    const now = Date.now();

    // Get stories that haven't been migrated yet
    const stories = await ctx.db
      .query("stories")
      .filter((q) =>
        q.or(
          q.eq(q.field("migratedToBooks"), undefined),
          q.eq(q.field("migratedToBooks"), false)
        )
      )
      .take(limit);

    const migrated: string[] = [];
    const errors: { storyKey: string; error: string }[] = [];

    for (const story of stories) {
      try {
        // Check if book already exists
        const existingBook = await ctx.db
          .query("books")
          .withIndex("by_bookKey", (q) => q.eq("bookKey", story.storyKey))
          .first();

        if (existingBook) {
          // Mark story as migrated
          await ctx.db.patch(story._id, { migratedToBooks: true });
          migrated.push(story.storyKey);
          continue;
        }

        // Split text into pages (approximate 150 characters per page for readability)
        const textEn = story.locales.en.text;
        const textRo = story.locales.ro.text;
        const textIt = story.locales.it.text;

        // Robust text splitting logic ported from mobile app
        // Splits by sentences while respecting max char length per page
        function splitIntoPages(text: string): string[] {
          if (!text) return [];

          // Split by sentence delimiters but keep delimiters
          // Match non-delimiters followed by delimiters
          const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
          const pages: string[] = [];
          let currentPage = "";
          const MAX_CHARS_PER_PAGE = 150; // Sync with mobile app logic for consistent paging

          sentences.forEach((sentence) => {
            const trimmed = sentence.trim();
            if (currentPage.length + trimmed.length > MAX_CHARS_PER_PAGE && currentPage.length > 0) {
              pages.push(currentPage.trim());
              currentPage = trimmed;
            } else {
              currentPage += (currentPage ? " " : "") + trimmed;
            }
          });

          if (currentPage.trim()) {
            pages.push(currentPage.trim());
          }
          return pages;
        }

        const paragraphsEn = splitIntoPages(textEn);
        const paragraphsRo = splitIntoPages(textRo);
        const paragraphsIt = splitIntoPages(textIt);

        const maxParagraphs = Math.max(
          paragraphsEn.length,
          paragraphsRo.length,
          paragraphsIt.length
        );

        const pages = [];
        for (let i = 0; i < maxParagraphs; i++) {

          // Calculate correct legacyAssetKey with clamping logic (from mobile app)
          const scenes = STORY_SCENES[story.storyKey] || [];
          let assetKeyIndex = i + 1; // Default

          if (scenes.length > 0) {
            const clampedIndex = Math.min(i, scenes.length - 1);
            assetKeyIndex = clampedIndex + 1;
          }

          pages.push({
            pageNumber: i + 1,
            // Use legacy asset key for scene images
            // Mobile app will map this to the correct image via storyScenes.ts
            // But now we map it HERE so Admin panel sees the CLAMPED value (which exists on disk)
            legacyAssetKey: `${story.storyKey}_page_${assetKeyIndex}`,
            text_en: paragraphsEn[i] || '',
            text_ro: paragraphsRo[i] || '',
            text_it: paragraphsIt[i] || '',
          });
        }

        // If no paragraphs were split, create a single page with all text
        if (pages.length === 0) {
          pages.push({
            pageNumber: 1,
            legacyAssetKey: `${story.storyKey}_page_1`,
            text_en: textEn,
            text_ro: textRo,
            text_it: textIt,
          });
        }

        // Create the book
        await ctx.db.insert("books", {
          bookKey: story.storyKey,
          categoryId: story.categoryId,
          ageMin: story.ageMin,
          ageMax: story.ageMax,
          durationMin: story.durationMin,
          cover: {
            // Use storyKey as legacyAssetKey - mobile app will map via coverImages.ts
            legacyAssetKey: story.storyKey,
            title_en: story.locales.en.title,
            title_ro: story.locales.ro.title,
            title_it: story.locales.it.title,
          },
          pages,
          tags_en: story.tags_en,
          tags_ro: story.tags_ro,
          tags_it: story.tags_it,
          parentQuestions_en: story.locales.en.parentQuestions,
          parentQuestions_ro: story.locales.ro.parentQuestions,
          parentQuestions_it: story.locales.it.parentQuestions,
          seriesId: story.seriesId,
          episodeNo: story.episodeNo,
          status: story.isPublished ? "published" : "draft",
          publishedAt: story.publishedAt,
          version: 1,
          migratedFromStory: true,
          readCount: story.readCount,
          favoriteCount: story.favoriteCount,
          createdAt: story.createdAt,
          updatedAt: now,
        });

        // Mark story as migrated
        await ctx.db.patch(story._id, {
          migratedToBooks: true,
          updatedAt: now,
        });

        migrated.push(story.storyKey);
      } catch (err: any) {
        errors.push({
          storyKey: story.storyKey,
          error: err.message || "Unknown error",
        });
      }
    }

    // Log the migration
    await ctx.db.insert("auditLog", {
      entityType: "book",
      entityId: "migration",
      action: "create",
      description: `Migrated ${migrated.length} stories to books format`,
      changes: JSON.stringify({ migrated, errors }),
      performedBy: args.adminUserId,
      performedAt: now,
    });

    // Count remaining
    const remainingStories = await ctx.db
      .query("stories")
      .filter((q) =>
        q.or(
          q.eq(q.field("migratedToBooks"), undefined),
          q.eq(q.field("migratedToBooks"), false)
        )
      )
      .collect();

    return {
      migrated,
      errors,
      remaining: remainingStories.length,
      message: `Successfully migrated ${migrated.length} stories. ${errors.length} errors. ${remainingStories.length} remaining.`,
    };
  },
});

// Get migration status
export const getMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    const allStories = await ctx.db.query("stories").collect();
    const migratedStories = allStories.filter(s => s.migratedToBooks === true);
    const allBooks = await ctx.db.query("books").collect();
    const migratedBooks = allBooks.filter(b => b.migratedFromStory === true);

    return {
      totalStories: allStories.length,
      migratedStories: migratedStories.length,
      remainingStories: allStories.length - migratedStories.length,
      totalBooks: allBooks.length,
      migratedBooks: migratedBooks.length,
      newBooks: allBooks.length - migratedBooks.length,
      progress: allStories.length > 0
        ? Math.round((migratedStories.length / allStories.length) * 100)
        : 100,
    };
  },
});

// Rollback migration for a specific story
export const rollbackMigration = mutation({
  args: {
    adminUserId: v.id("adminUsers"),
    bookKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const adminUser = await ctx.db.get(args.adminUserId);
    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Only admins can rollback migrations");
    }

    // Find the book
    const book = await ctx.db
      .query("books")
      .withIndex("by_bookKey", (q) => q.eq("bookKey", args.bookKey))
      .first();

    if (!book) {
      throw new Error("Book not found");
    }

    if (!book.migratedFromStory) {
      throw new Error("This book was not migrated from a story");
    }

    // Find the original story
    const story = await ctx.db
      .query("stories")
      .withIndex("by_storyKey", (q) => q.eq("storyKey", args.bookKey))
      .first();

    if (story) {
      // Mark story as not migrated
      await ctx.db.patch(story._id, {
        migratedToBooks: false,
        updatedAt: Date.now(),
      });
    }

    // Delete the book
    await ctx.db.delete(book._id);

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "book",
      entityId: args.bookKey,
      action: "delete",
      description: `Rolled back migration for: ${args.bookKey}`,
      performedBy: args.adminUserId,
      performedAt: Date.now(),
    });

    return { success: true, bookKey: args.bookKey };
  },
});

// Reset ALL migrations (Dev only helper)
export const resetAllMigrations = mutation({
  args: {
    adminUserId: v.id("adminUsers"),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const adminUser = await ctx.db.get(args.adminUserId);
    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Only admins can reset migrations");
    }

    const books = await ctx.db.query("books").filter(q => q.eq(q.field("migratedFromStory"), true)).collect();

    let count = 0;
    for (const book of books) {
      // Delete book
      await ctx.db.delete(book._id);

      // Find story and reset flag
      const story = await ctx.db.query("stories").withIndex("by_storyKey", q => q.eq("storyKey", book.bookKey)).first();
      if (story) {
        await ctx.db.patch(story._id, { migratedToBooks: false });
      }
      count++;
    }

    return { deleted: count };
  }
});

// FORCE DELETE EVERYTHING (Nuclear option)
export const forceDeleteAllBooks = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify admin via userId lookup
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", q => q.eq("userId", args.userId))
      .first();

    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Admin only");
    }

    // 1. Delete ALL books
    const allBooks = await ctx.db.query("books").collect();
    for (const b of allBooks) {
      await ctx.db.delete(b._id);
    }

    // 2. Reset ALL stories
    const allStories = await ctx.db.query("stories").collect();
    for (const s of allStories) {
      await ctx.db.patch(s._id, { migratedToBooks: false });
    }

    return { deletedBooks: allBooks.length, resetStories: allStories.length };
  }
});
