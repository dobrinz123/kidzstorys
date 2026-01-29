import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { sortStoriesByScore } from "./lib/recommendationEngine";
import { requireAdmin } from "./lib/authHelper";

// Get stories by category with pagination
export const getStoriesByCategory = query({
  args: {
    categoryId: v.id("categories"),
    limit: v.optional(v.number()),
    locale: v.union(v.literal("en"), v.literal("ro"), v.literal("it")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const stories = await ctx.db
      .query("stories")
      .withIndex("by_category", (q) =>
        q.eq("categoryId", args.categoryId).eq("isPublished", true)
      )
      .order("desc")
      .take(limit);

    return stories;
  },
});

// Get single story by key (with access check)
export const getStoryByKey = query({
  args: {
    storyKey: v.string(),
    userId: v.id("users"),
    locale: v.union(v.literal("en"), v.literal("ro"), v.literal("it")),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db
      .query("stories")
      .withIndex("by_storyKey", (q) => q.eq("storyKey", args.storyKey))
      .first();

    if (!story || !story.isPublished) {
      return null;
    }

    // Check user entitlement
    const user = await ctx.db.get(args.userId);
    const hasAccess = user?.entitlementActive || false;

    // Return story with access flag
    // If no access, return metadata only (title, tags, duration)
    // but don't return full text or parent questions
    if (!hasAccess) {
      return {
        _id: story._id,
        storyKey: story.storyKey,
        categoryId: story.categoryId,
        ageMin: story.ageMin,
        ageMax: story.ageMax,
        durationMin: story.durationMin,
        tags: story[`tags_${args.locale}`],
        title: story.locales[args.locale].title,
        hasAccess: false,
        isLocked: true,
      };
    }

    return {
      ...story,
      hasAccess: true,
      isLocked: false,
    };
  },
});

// Get recommended stories
export const getRecommendedStories = query({
  args: {
    userId: v.id("users"),
    childProfileId: v.optional(v.id("childProfiles")),
    categoryId: v.optional(v.id("categories")),
    durationMin: v.optional(v.number()),
    childState: v.optional(
      v.union(v.literal("calm"), v.literal("normal"), v.literal("agitated"))
    ),
    locale: v.union(v.literal("en"), v.literal("ro"), v.literal("it")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 3;

    // Get child age from profile
    let childAge: number | undefined;
    if (args.childProfileId) {
      const profile = await ctx.db.get(args.childProfileId);
      if (profile) {
        childAge = profile.ageBracket;
      }
    }

    // Get recent progress to determine preferences
    const recentProgress = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);

    const recentStoryKeys = recentProgress.map((p) => p.storyKey);

    // Get all published stories
    const allStories = await ctx.db
      .query("stories")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();

    // Score and sort
    const sortedStories = sortStoriesByScore(allStories, {
      childAge,
      categoryId: args.categoryId,
      durationMin: args.durationMin,
      childState: args.childState,
      recentStoryKeys,
      locale: args.locale,
    });

    return sortedStories.slice(0, limit);
  },
});

// Create story (admin only)
export const createStory = mutation({
  args: {
    adminUserId: v.id("users"),
    storyKey: v.string(),
    categoryId: v.id("categories"),
    ageMin: v.number(),
    ageMax: v.number(),
    durationMin: v.number(),
    tags_en: v.array(v.string()),
    tags_ro: v.array(v.string()),
    tags_it: v.array(v.string()),
    seriesId: v.optional(v.string()),
    episodeNo: v.optional(v.number()),
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
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    await requireAdmin(ctx, args.adminUserId);

    const now = Date.now();

    const storyId = await ctx.db.insert("stories", {
      storyKey: args.storyKey,
      categoryId: args.categoryId,
      ageMin: args.ageMin,
      ageMax: args.ageMax,
      durationMin: args.durationMin,
      tags_en: args.tags_en,
      tags_ro: args.tags_ro,
      tags_it: args.tags_it,
      seriesId: args.seriesId,
      episodeNo: args.episodeNo,
      locales: args.locales,
      readCount: 0,
      favoriteCount: 0,
      isPublished: args.isPublished,
      publishedAt: args.isPublished ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });

    return storyId;
  },
});

// Bulk create stories (for seeding - admin only)
export const bulkCreateStories = mutation({
  args: {
    adminUserId: v.id("users"),
    stories: v.array(
      v.object({
        storyKey: v.string(),
        categoryId: v.id("categories"),
        ageMin: v.number(),
        ageMax: v.number(),
        durationMin: v.number(),
        tags_en: v.array(v.string()),
        tags_ro: v.array(v.string()),
        tags_it: v.array(v.string()),
        seriesId: v.optional(v.string()),
        episodeNo: v.optional(v.number()),
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
        isPublished: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    await requireAdmin(ctx, args.adminUserId);

    const now = Date.now();
    const storyIds = [];

    for (const story of args.stories) {
      const storyId = await ctx.db.insert("stories", {
        ...story,
        readCount: 0,
        favoriteCount: 0,
        publishedAt: story.isPublished ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });
      storyIds.push(storyId);
    }

    return { count: storyIds.length, storyIds };
  },
});

// Increment read count
export const incrementReadCount = mutation({
  args: {
    storyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db
      .query("stories")
      .withIndex("by_storyKey", (q) => q.eq("storyKey", args.storyKey))
      .first();

    if (story) {
      await ctx.db.patch(story._id, {
        readCount: story.readCount + 1,
        updatedAt: Date.now(),
      });
    }
  },
});
