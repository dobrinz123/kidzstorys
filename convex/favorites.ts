import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user's favorites
export const getFavorites = query({
  args: {
    userId: v.id("users"),
    locale: v.union(v.literal("en"), v.literal("ro"), v.literal("it")),
  },
  handler: async (ctx, args) => {
    // Check if user has active entitlement
    const user = await ctx.db.get(args.userId);
    if (!user || !user.entitlementActive) {
      return [];
    }

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Get full story data for each favorite
    const storiesWithData = await Promise.all(
      favorites.map(async (fav) => {
        const story = await ctx.db
          .query("stories")
          .withIndex("by_storyKey", (q) => q.eq("storyKey", fav.storyKey))
          .first();
        return story;
      })
    );

    return storiesWithData.filter((s) => s !== null);
  },
});

// Toggle favorite
export const toggleFavorite = mutation({
  args: {
    userId: v.id("users"),
    storyKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user has active entitlement
    const user = await ctx.db.get(args.userId);
    if (!user || !user.entitlementActive) {
      throw new Error("Subscription required to favorite stories");
    }

    // Check if already favorited
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_story", (q) =>
        q.eq("userId", args.userId).eq("storyKey", args.storyKey)
      )
      .first();

    if (existing) {
      // Remove favorite
      await ctx.db.delete(existing._id);

      // Decrement story favorite count
      const story = await ctx.db
        .query("stories")
        .withIndex("by_storyKey", (q) => q.eq("storyKey", args.storyKey))
        .first();

      if (story) {
        await ctx.db.patch(story._id, {
          favoriteCount: Math.max(0, story.favoriteCount - 1),
          updatedAt: Date.now(),
        });
      }

      return { isFavorite: false };
    } else {
      // Add favorite
      await ctx.db.insert("favorites", {
        userId: args.userId,
        storyKey: args.storyKey,
        createdAt: Date.now(),
      });

      // Increment story favorite count
      const story = await ctx.db
        .query("stories")
        .withIndex("by_storyKey", (q) => q.eq("storyKey", args.storyKey))
        .first();

      if (story) {
        await ctx.db.patch(story._id, {
          favoriteCount: story.favoriteCount + 1,
          updatedAt: Date.now(),
        });
      }

      return { isFavorite: true };
    }
  },
});

// Check if story is favorited
export const isFavorite = query({
  args: {
    userId: v.id("users"),
    storyKey: v.string(),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_story", (q) =>
        q.eq("userId", args.userId).eq("storyKey", args.storyKey)
      )
      .first();

    return !!favorite;
  },
});
