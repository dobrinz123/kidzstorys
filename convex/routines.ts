import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireOwnership } from "./lib/authHelper";

// Get user's routines
export const getRoutines = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const routines = await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return routines;
  },
});

// Create routine
export const createRoutine = mutation({
  args: {
    userId: v.id("users"),
    childProfileId: v.optional(v.id("childProfiles")),
    categoryId: v.id("categories"),
    durationMin: v.number(),
    timeHHMM: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const routineId = await ctx.db.insert("routines", {
      userId: args.userId,
      childProfileId: args.childProfileId,
      categoryId: args.categoryId,
      durationMin: args.durationMin,
      timeHHMM: args.timeHHMM,
      enabled: args.enabled,
      createdAt: now,
      updatedAt: now,
    });

    return routineId;
  },
});

// Update routine
export const updateRoutine = mutation({
  args: {
    routineId: v.id("routines"),
    userId: v.id("users"),
    childProfileId: v.optional(v.id("childProfiles")),
    categoryId: v.optional(v.id("categories")),
    durationMin: v.optional(v.number()),
    timeHHMM: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    notificationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { routineId, userId, ...updates } = args;

    // Verify ownership
    const routine = await ctx.db.get(routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    requireOwnership(routine.userId, userId);

    await ctx.db.patch(routineId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete routine
export const deleteRoutine = mutation({
  args: {
    routineId: v.id("routines"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify ownership before deletion
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    requireOwnership(routine.userId, args.userId);

    await ctx.db.delete(args.routineId);
    return { success: true };
  },
});
