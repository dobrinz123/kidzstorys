import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/authHelper";

// Track story read progress
export const trackProgress = mutation({
  args: {
    userId: v.id("users"),
    storyKey: v.string(),
    childProfileId: v.optional(v.id("childProfiles")),
    completed: v.boolean(),
    readingPosition: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate user exists
    await requireAuth(ctx, args.userId);

    const now = Date.now();

    // Check if progress exists
    const existing = await ctx.db
      .query("progress")
      .withIndex("by_user_story", (q) =>
        q.eq("userId", args.userId).eq("storyKey", args.storyKey)
      )
      .first();

    if (existing) {
      // Update existing progress
      await ctx.db.patch(existing._id, {
        childProfileId: args.childProfileId,
        completed: args.completed,
        readingPosition: args.readingPosition,
        lastReadAt: now,
      });

      return { progressId: existing._id };
    } else {
      // Create new progress
      const progressId = await ctx.db.insert("progress", {
        userId: args.userId,
        storyKey: args.storyKey,
        childProfileId: args.childProfileId,
        completed: args.completed,
        readingPosition: args.readingPosition,
        lastReadAt: now,
        createdAt: now,
      });

      return { progressId };
    }
  },
});

// Get user's progress
export const getProgress = query({
  args: {
    userId: v.id("users"),
    storyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.storyKey) {
      // Get specific story progress
      const progress = await ctx.db
        .query("progress")
        .withIndex("by_user_story", (q) =>
          q.eq("userId", args.userId).eq("storyKey", args.storyKey!)
        )
        .first();

      return progress;
    } else {
      // Get all progress for user
      const allProgress = await ctx.db
        .query("progress")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();

      return allProgress;
    }
  },
});
