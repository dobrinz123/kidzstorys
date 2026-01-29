import { v, ConvexError } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import * as bcrypt from "bcryptjs";

// Sign up new user
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(), // Changed to password (raw) to be hashed here
    name: v.optional(v.string()),
    preferredLanguage: v.optional(
      v.union(v.literal("en"), v.literal("ro"), v.literal("it"))
    ),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new ConvexError("User already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(args.password, 10);

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email,
      passwordHash: passwordHash,
      name: args.name,
      entitlementActive: false,
      preferredLanguage: args.preferredLanguage || "en",
      createdAt: now,
      updatedAt: now,
    });

    return { userId };
  },
});

// Sign in user with password verification
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.passwordHash) {
      return null;
    }

    // Verify password
    const isValid = await bcrypt.compare(args.password, user.passwordHash);

    if (!isValid) {
      return null;
    }

    // Update last active timestamp
    await ctx.db.patch(user._id, {
      lastActiveAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      entitlementActive: user.entitlementActive,
    };
  },
});

// Get current user
export const getCurrentUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Check if entitlement expired
    if (user.entitlementActive && user.entitlementExpiresAt) {
      if (Date.now() > user.entitlementExpiresAt) {
        // Expired
        return { ...user, entitlementActive: false };
      }
    }

    return user;
  },
});

// Update last active timestamp (call this when user opens the app or performs actions)
export const updateLastActive = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(args.userId, {
      lastActiveAt: Date.now(),
    });

    return { success: true };
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    preferredLanguage: v.union(
      v.literal("en"),
      v.literal("ro"),
      v.literal("it")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      preferredLanguage: args.preferredLanguage,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Check if user is admin
export const isAdmin = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return !!adminUser;
  },
});

// Check if email is admin
export const isAdminByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return !!adminUser;
  },
});

// Update user phone number
export const updatePhone = mutation({
  args: {
    userId: v.id("users"),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(args.userId, {
      phone: args.phone,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete user account and all associated data
export const deleteAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Delete all favorites
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const favorite of favorites) {
      await ctx.db.delete(favorite._id);
    }

    // Delete all progress records
    const progressRecords = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const record of progressRecords) {
      await ctx.db.delete(record._id);
    }

    // Delete all routines
    const routines = await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const routine of routines) {
      await ctx.db.delete(routine._id);
    }

    // Delete all child profiles
    const profiles = await ctx.db
      .query("childProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const profile of profiles) {
      await ctx.db.delete(profile._id);
    }

    // Delete subscription events
    const subscriptionEvents = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const event of subscriptionEvents) {
      await ctx.db.delete(event._id);
    }

    // Delete admin user entry if exists
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (adminUser) {
      await ctx.db.delete(adminUser._id);
    }

    // Finally delete the user
    await ctx.db.delete(args.userId);

    return { success: true, deletedEmail: user.email };
  },
});

// Internal mutation to generate and store reset token
export const generateResetToken = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      // Don't reveal if user exists
      return { exists: false };
    }

    // Generate reset token (6-digit code)
    const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    const resetTokenExpiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    await ctx.db.patch(user._id, {
      resetToken,
      resetTokenExpiresAt,
      updatedAt: Date.now(),
    });

    return {
      exists: true,
      resetToken,
      userEmail: user.email,
      language: user.preferredLanguage || "ro",
    };
  },
});

// Request password reset - generates token and sends via email
export const requestPasswordReset = action({
  args: {
    email: v.string(),
    sendVia: v.union(v.literal("email"), v.literal("phone")),
  },
  handler: async (ctx, args) => {
    // Generate token using mutation
    const result = await ctx.runMutation(api.users.generateResetToken, {
      email: args.email,
    });

    if (!result.exists) {
      // Don't reveal if user exists - return success anyway
      return { success: true, message: "If account exists, reset code was sent" };
    }

    // Check if user has phone if sending via phone
    if (args.sendVia === "phone") {
      // For now, phone SMS not implemented - fall back to email
      // In production, integrate with Twilio or similar
      throw new ConvexError("SMS not available. Please use email.");
    }

    // Send email with reset code
    try {
      await ctx.runAction(api.email.sendPasswordResetEmail, {
        to: result.userEmail!,
        resetCode: result.resetToken!,
        language: result.language as "en" | "ro" | "it" | undefined,
      });
    } catch (error) {
      console.error("Failed to send reset email:", error);
      throw new ConvexError("Failed to send reset email. Please try again.");
    }

    return {
      success: true,
      message: "Reset code sent to your email",
    };
  },
});

// Verify reset token is valid
export const verifyResetToken = query({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { valid: false, error: "Invalid token" };
    }

    if (!user.resetToken || user.resetToken !== args.token.toUpperCase()) {
      return { valid: false, error: "Invalid token" };
    }

    if (!user.resetTokenExpiresAt || Date.now() > user.resetTokenExpiresAt) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true };
  },
});

// Reset password with valid token
export const resetPassword = mutation({
  args: {
    email: v.string(),
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new ConvexError("Invalid reset request");
    }

    if (!user.resetToken || user.resetToken !== args.token.toUpperCase()) {
      throw new ConvexError("Invalid or expired token");
    }

    if (!user.resetTokenExpiresAt || Date.now() > user.resetTokenExpiresAt) {
      throw new ConvexError("Token expired");
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(args.newPassword, 10);

    // Update password and clear token
    await ctx.db.patch(user._id, {
      passwordHash: passwordHash,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


// Get user by email - for checking if phone exists
export const getUserContactInfo = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return null;
    }

    return {
      hasPhone: !!user.phone,
      phoneLastDigits: user.phone ? user.phone.slice(-4) : null,
      emailMasked: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
    };
  },
});
