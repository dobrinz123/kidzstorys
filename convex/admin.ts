import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import * as bcrypt from "bcryptjs";

// ============ ADMIN USER QUERIES ============

// Get admin user by email
export const getAdminByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return adminUser;
  },
});

// Get admin user by userId
export const getAdminByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return adminUser;
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

    return adminUser?.role === "admin";
  },
});

// Check if user has admin access (admin or editor)
export const hasAdminAccess = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return adminUser !== null;
  },
});

// Get current admin user with full details
export const getCurrentAdmin = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!adminUser) return null;

    return {
      ...adminUser,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  },
});

// ============ ADMIN USER MUTATIONS ============

// Generate session token for admin
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Admin login with session token
export const adminLogin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check password
    if (!user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(args.password, user.passwordHash);

    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Check if user is admin
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!adminUser) {
      throw new Error("Not authorized for admin access");
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

    // Update last active
    await ctx.db.patch(user._id, {
      lastActiveAt: now,
      updatedAt: now,
    });

    return {
      userId: user._id,
      adminUserId: adminUser._id,
      sessionToken,
      expiresAt,
      email: user.email,
      name: user.name,
      role: adminUser.role,
    };
  },
});

// Validate admin session and return current admin user
export const validateAdminSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    // Find session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    // Get admin user - verify role from server
    const adminUser = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .first();

    if (!adminUser) {
      return null;
    }

    return {
      userId: user._id,
      adminUserId: adminUser._id,
      email: user.email,
      name: user.name,
      role: adminUser.role, // Role from server, not client storage
      sessionExpiresAt: session.expiresAt,
    };
  },
});

// Admin logout
export const adminLogout = mutation({
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

// Seed admin user - INTERNAL ONLY (can only be called from Convex dashboard or other internal functions)
export const seedAdmin = internalMutation({
  args: {
    email: v.string(),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    // Check if already admin
    const existingAdmin = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingAdmin) {
      // Just update role if exists
      return existingAdmin._id;
    }

    const now = Date.now();
    const adminUserId = await ctx.db.insert("adminUsers", {
      email: args.email,
      userId: args.userId,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });

    return adminUserId;
  },
});

// Force reset password - INTERNAL ONLY (can only be called from Convex dashboard or other internal functions)
export const resetUserPassword = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(args.password, 10);

    await ctx.db.patch(user._id, {
      passwordHash: passwordHash,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Create admin user (admin only)
export const createAdminUser = mutation({
  args: {
    performedByAdminId: v.id("adminUsers"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    // Verify performer is admin
    const performer = await ctx.db.get(args.performedByAdminId);
    if (!performer || performer.role !== "admin") {
      throw new Error("Only admins can create admin users");
    }

    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User with this email does not exist. They must sign up first.");
    }

    // Check if already admin
    const existingAdmin = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (existingAdmin) {
      throw new Error("User is already an admin/editor");
    }

    const now = Date.now();
    const adminUserId = await ctx.db.insert("adminUsers", {
      email: args.email,
      userId: user._id,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "adminUser",
      entityId: adminUserId,
      action: "create",
      description: `Created ${args.role} user: ${args.email}`,
      performedBy: args.performedByAdminId,
      performedAt: now,
    });

    return adminUserId;
  },
});

// Update admin user role (admin only)
export const updateAdminRole = mutation({
  args: {
    performedByAdminId: v.id("adminUsers"),
    adminUserId: v.id("adminUsers"),
    role: v.union(v.literal("admin"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    // Verify performer is admin
    const performer = await ctx.db.get(args.performedByAdminId);
    if (!performer || performer.role !== "admin") {
      throw new Error("Only admins can update roles");
    }

    // Can't change own role
    if (args.performedByAdminId === args.adminUserId) {
      throw new Error("Cannot change your own role");
    }

    const adminUser = await ctx.db.get(args.adminUserId);
    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.adminUserId, {
      role: args.role,
      updatedAt: now,
    });

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "adminUser",
      entityId: args.adminUserId,
      action: "update",
      description: `Changed role from ${adminUser.role} to ${args.role}`,
      changes: JSON.stringify({ oldRole: adminUser.role, newRole: args.role }),
      performedBy: args.performedByAdminId,
      performedAt: now,
    });
  },
});

// Remove admin access (admin only)
export const removeAdminAccess = mutation({
  args: {
    performedByAdminId: v.id("adminUsers"),
    adminUserId: v.id("adminUsers"),
  },
  handler: async (ctx, args) => {
    // Verify performer is admin
    const performer = await ctx.db.get(args.performedByAdminId);
    if (!performer || performer.role !== "admin") {
      throw new Error("Only admins can remove admin access");
    }

    // Can't remove own access
    if (args.performedByAdminId === args.adminUserId) {
      throw new Error("Cannot remove your own admin access");
    }

    const adminUser = await ctx.db.get(args.adminUserId);
    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    await ctx.db.delete(args.adminUserId);

    // Log the action
    await ctx.db.insert("auditLog", {
      entityType: "adminUser",
      entityId: args.adminUserId,
      action: "delete",
      description: `Removed admin access for: ${adminUser.email}`,
      performedBy: args.performedByAdminId,
      performedAt: Date.now(),
    });
  },
});

// Get all admin users (admin only)
export const listAdminUsers = query({
  args: { performedByUserId: v.id("users") },
  handler: async (ctx, args) => {
    // Verify performer is admin
    const performer = await ctx.db
      .query("adminUsers")
      .withIndex("by_userId", (q) => q.eq("userId", args.performedByUserId))
      .first();

    if (!performer || performer.role !== "admin") {
      throw new Error("Only admins can list admin users");
    }

    const adminUsers = await ctx.db.query("adminUsers").collect();

    // Get user details for each admin
    const enrichedAdmins = await Promise.all(
      adminUsers.map(async (admin) => {
        const user = await ctx.db.get(admin.userId);
        return {
          ...admin,
          userName: user?.name,
        };
      })
    );

    return enrichedAdmins;
  },
});
