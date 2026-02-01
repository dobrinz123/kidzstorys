import { v, ConvexError } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { hashPassword, verifyPassword } from "./lib/crypto";
import { checkRateLimit, resetRateLimit, formatRetryTime } from "./lib/rateLimit";
import { validateEmail, validatePassword, validateName } from "./lib/validation";

// ============ SESSION TOKEN UTILITIES ============

// Generate cryptographically secure session token (64 hex chars)
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Session expiration time: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

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
    // Validate email
    const emailValidation = validateEmail(args.email);
    if (!emailValidation.valid) {
      throw new ConvexError(emailValidation.error!);
    }

    // Validate password
    const passwordValidation = validatePassword(args.password);
    if (!passwordValidation.valid) {
      throw new ConvexError(passwordValidation.error!);
    }

    // Validate name if provided
    if (args.name) {
      const nameValidation = validateName(args.name);
      if (!nameValidation.valid) {
        throw new ConvexError(nameValidation.error!);
      }
    }

    // Normalize email
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check rate limit
    const rateCheck = await checkRateLimit(ctx, "signUp", normalizedEmail);
    if (!rateCheck.allowed) {
      throw new ConvexError(
        `Too many signup attempts. Please try again in ${formatRetryTime(rateCheck.retryAfterMs!)}.`
      );
    }

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      throw new ConvexError("User already exists");
    }

    // Hash password
    const passwordHash = await hashPassword(args.password);

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: normalizedEmail,
      passwordHash: passwordHash,
      name: args.name?.trim(),
      entitlementActive: false,
      preferredLanguage: args.preferredLanguage || "en",
      createdAt: now,
      updatedAt: now,
    });

    // Create session token for automatic login after signup
    const sessionToken = generateSessionToken();
    const expiresAt = now + SESSION_EXPIRY_MS;

    await ctx.db.insert("sessions", {
      userId,
      token: sessionToken,
      expiresAt,
      createdAt: now,
      lastActiveAt: now,
    });

    // Clear rate limit on successful signup
    await resetRateLimit(ctx, "signUp", normalizedEmail);

    return {
      userId,
      sessionToken,
      expiresAt,
    };
  },
});

// Sign in user with password verification
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize email
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check rate limit
    const rateCheck = await checkRateLimit(ctx, "signIn", normalizedEmail);
    if (!rateCheck.allowed) {
      throw new ConvexError(
        `Too many login attempts. Please try again in ${formatRetryTime(rateCheck.retryAfterMs!)}.`
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user || !user.passwordHash) {
      return null;
    }

    // Verify password
    const isValid = await verifyPassword(args.password, user.passwordHash);

    if (!isValid) {
      return null;
    }

    const now = Date.now();

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = now + SESSION_EXPIRY_MS;

    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt,
      createdAt: now,
      lastActiveAt: now,
    });

    // Update last active timestamp
    await ctx.db.patch(user._id, {
      lastActiveAt: now,
      updatedAt: now,
    });

    // Clear rate limit on successful login
    await resetRateLimit(ctx, "signIn", normalizedEmail);

    return {
      userId: user._id,
      sessionToken,
      expiresAt,
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

    // Delete all sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Finally delete the user
    await ctx.db.delete(args.userId);

    return { success: true, deletedEmail: user.email };
  },
});

// Generate cryptographically secure reset token (32 hex chars)
function generateSecureResetToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Internal mutation to generate and store reset token
export const generateResetToken = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check rate limit for password reset requests
    const rateCheck = await checkRateLimit(ctx, "passwordReset", normalizedEmail);
    if (!rateCheck.allowed) {
      throw new ConvexError(
        `Too many reset attempts. Please try again in ${formatRetryTime(rateCheck.retryAfterMs!)}.`
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      // Don't reveal if user exists
      return { exists: false };
    }

    // Generate cryptographically secure reset token (32 hex chars)
    const resetToken = generateSecureResetToken();
    const resetTokenExpiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes (reduced from 30)

    await ctx.db.patch(user._id, {
      resetToken,
      resetTokenExpiresAt,
      resetAttempts: 0, // Reset verification attempts
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

// Verify reset token is valid (converted to mutation to track attempts)
export const verifyResetToken = mutation({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      return { valid: false, error: "Invalid token" };
    }

    // Check if too many verification attempts
    const maxAttempts = 5;
    if ((user.resetAttempts || 0) >= maxAttempts) {
      // Invalidate token after too many attempts
      await ctx.db.patch(user._id, {
        resetToken: undefined,
        resetTokenExpiresAt: undefined,
        resetAttempts: undefined,
        updatedAt: Date.now(),
      });
      return { valid: false, error: "Too many attempts. Please request a new code." };
    }

    // Increment attempt counter
    await ctx.db.patch(user._id, {
      resetAttempts: (user.resetAttempts || 0) + 1,
    });

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
    const normalizedEmail = args.email.toLowerCase().trim();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
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
    const passwordHash = await hashPassword(args.newPassword);

    // Update password and clear token + reset attempts
    await ctx.db.patch(user._id, {
      passwordHash: passwordHash,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
      resetAttempts: undefined,
      updatedAt: Date.now(),
    });

    // Invalidate all existing sessions (force re-login with new password)
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Clear rate limit for password reset
    await resetRateLimit(ctx, "passwordReset", normalizedEmail);

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

// ============ SESSION MANAGEMENT ============

// Validate session token and return user data
export const validateSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session) {
      return null;
    }

    // Check if session expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    // Check if entitlement expired
    let entitlementActive = user.entitlementActive;
    if (user.entitlementActive && user.entitlementExpiresAt) {
      if (Date.now() > user.entitlementExpiresAt) {
        entitlementActive = false;
      }
    }

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      entitlementActive,
      entitlementExpiresAt: user.entitlementExpiresAt,
      sessionExpiresAt: session.expiresAt,
    };
  },
});

// Sign out - invalidate session
export const signOut = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Refresh session - extend expiration time
export const refreshSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const now = Date.now();
    const newExpiresAt = now + SESSION_EXPIRY_MS;

    await ctx.db.patch(session._id, {
      expiresAt: newExpiresAt,
      lastActiveAt: now,
    });

    return { expiresAt: newExpiresAt };
  },
});

// Sign out all sessions for a user (useful for security)
export const signOutAllSessions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    return { deletedCount: sessions.length };
  },
});
