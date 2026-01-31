import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Check user's entitlement status
export const checkEntitlement = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { hasAccess: false, isActive: false };
    }

    // Check if expired
    if (user.entitlementActive && user.entitlementExpiresAt) {
      const hasAccess = Date.now() < user.entitlementExpiresAt;
      return {
        hasAccess,
        expiresAt: user.entitlementExpiresAt,
        isActive: user.entitlementActive,
      };
    }

    return {
      hasAccess: user.entitlementActive,
      isActive: user.entitlementActive,
    };
  },
});

// Update entitlement (called by RevenueCat webhook)
export const updateEntitlement = internalMutation({
  args: {
    revenueCatAppUserId: v.string(),
    entitlementActive: v.boolean(),
    expiresAt: v.optional(v.number()),
    eventType: v.string(),
    productId: v.optional(v.string()),
    isTrial: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Find user by RevenueCat app user ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_revenueCatAppUserId", (q) =>
        q.eq("revenueCatAppUserId", args.revenueCatAppUserId)
      )
      .first();

    if (!user) {
      // Try to extract Convex user ID from RC ID (format: "user:<convexUserId>")
      if (args.revenueCatAppUserId.startsWith("user:")) {
        const convexUserId = args.revenueCatAppUserId.replace(
          "user:",
          ""
        ) as Id<"users">;
        const userById = await ctx.db.get(convexUserId);

        if (userById) {
          const now = Date.now();

          // Update user with entitlement info
          await ctx.db.patch(userById._id, {
            entitlementActive: args.entitlementActive,
            entitlementExpiresAt: args.expiresAt,
            revenueCatAppUserId: args.revenueCatAppUserId,
            lastCustomerInfoSyncedAt: now,
            updatedAt: now,
          });

          // Log event
          await ctx.db.insert("subscriptionEvents", {
            userId: userById._id,
            revenueCatAppUserId: args.revenueCatAppUserId,
            eventType: args.eventType,
            productId: args.productId || "",
            expiresAt: args.expiresAt,
            isTrial: args.isTrial || false,
            processedAt: now,
          });

          return { success: true };
        }
      }

      throw new Error(`User not found: ${args.revenueCatAppUserId}`);
    }

    const now = Date.now();

    // Update user entitlement
    await ctx.db.patch(user._id, {
      entitlementActive: args.entitlementActive,
      entitlementExpiresAt: args.expiresAt,
      lastCustomerInfoSyncedAt: now,
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("subscriptionEvents", {
      userId: user._id,
      revenueCatAppUserId: args.revenueCatAppUserId,
      eventType: args.eventType,
      productId: args.productId || "",
      expiresAt: args.expiresAt,
      isTrial: args.isTrial || false,
      processedAt: now,
    });

    return { success: true };
  },
});

// Activate mock/demo trial for a user (for demo purposes)
export const activateDemoTrial = mutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("monthly"), v.literal("yearly")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has already used their trial
    if (user.hasUsedTrial) {
      throw new Error("Trial already used. Please subscribe to continue using premium features.");
    }

    // Check if user already has an active subscription
    if (user.entitlementActive && user.entitlementExpiresAt && user.entitlementExpiresAt > Date.now()) {
      throw new Error("You already have an active subscription.");
    }

    const now = Date.now();
    // 15 days trial for demo
    const trialDays = 15;
    const expiresAt = now + (trialDays * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.userId, {
      entitlementActive: true,
      entitlementExpiresAt: expiresAt,
      subscriptionType: "trial",
      hasUsedTrial: true,
      trialUsedAt: now,
      updatedAt: now,
    });

    // Log the trial activation
    await ctx.db.insert("subscriptionEvents", {
      userId: args.userId,
      revenueCatAppUserId: `user:${args.userId}`,
      eventType: "DEMO_TRIAL_STARTED",
      productId: args.plan === "yearly" ? "yearly_subscription" : "monthly_subscription",
      expiresAt: expiresAt,
      isTrial: true,
      processedAt: now,
    });

    return {
      success: true,
      expiresAt,
      message: "Demo trial activated for 15 days"
    };
  },
});

// Ensure user has RevenueCat app user ID set
export const ensureRevenueCatId = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.revenueCatAppUserId) {
      const revenueCatAppUserId = `user:${args.userId}`;
      await ctx.db.patch(args.userId, {
        revenueCatAppUserId,
        updatedAt: Date.now(),
      });

      return { revenueCatAppUserId };
    }

    return { revenueCatAppUserId: user.revenueCatAppUserId };
  },
});
