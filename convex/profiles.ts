import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireOwnership } from "./lib/authHelper";

// Get user's child profiles
export const getProfiles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("childProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return profiles;
  },
});

// Get active profile
export const getActiveProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("childProfiles")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .first();

    return profile;
  },
});

// Create child profile
export const createProfile = mutation({
  args: {
    userId: v.id("users"),
    nickname: v.string(),
    ageBracket: v.number(),
    preferences: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check limit (max 3 profiles)
    const existing = await ctx.db
      .query("childProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (existing.length >= 3) {
      throw new Error("Maximum 3 child profiles allowed");
    }

    const now = Date.now();

    // If this is the first profile, make it active
    const isActive = existing.length === 0;

    const profileId = await ctx.db.insert("childProfiles", {
      userId: args.userId,
      nickname: args.nickname,
      ageBracket: args.ageBracket,
      preferences: args.preferences,
      isActive,
      createdAt: now,
      updatedAt: now,
    });

    return profileId;
  },
});

// Update profile
export const updateProfile = mutation({
  args: {
    profileId: v.id("childProfiles"),
    userId: v.id("users"),
    nickname: v.optional(v.string()),
    ageBracket: v.optional(v.number()),
    preferences: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { profileId, userId, ...updates } = args;

    // Verify ownership
    const profile = await ctx.db.get(profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    requireOwnership(profile.userId, userId);

    await ctx.db.patch(profileId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Set active profile
export const setActiveProfile = mutation({
  args: {
    userId: v.id("users"),
    profileId: v.id("childProfiles"),
  },
  handler: async (ctx, args) => {
    // Verify the target profile belongs to the user
    const targetProfile = await ctx.db.get(args.profileId);
    if (!targetProfile) {
      throw new Error("Profile not found");
    }
    requireOwnership(targetProfile.userId, args.userId);

    // Deactivate all profiles for this user
    const profiles = await ctx.db
      .query("childProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const profile of profiles) {
      await ctx.db.patch(profile._id, {
        isActive: profile._id === args.profileId,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Delete profile
export const deleteProfile = mutation({
  args: {
    profileId: v.id("childProfiles"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify ownership before deletion
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    requireOwnership(profile.userId, args.userId);

    await ctx.db.delete(args.profileId);
    return { success: true };
  },
});
