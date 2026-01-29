import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Validates that a user exists in the database
 * @throws Error if user not found
 */
export async function requireAuth(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">
): Promise<void> {
    const user = await ctx.db.get(userId);
    if (!user) {
        throw new Error("User not found");
    }
}

/**
 * Validates that the requesting user owns the resource
 * @throws Error if ownership doesn't match
 */
export function requireOwnership(
    resourceUserId: Id<"users">,
    requestUserId: Id<"users">
): void {
    if (resourceUserId !== requestUserId) {
        throw new Error("Unauthorized: You don't have permission to access this resource");
    }
}

/**
 * Validates that the user is an admin
 * @throws Error if user is not an admin
 */
export async function requireAdmin(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">
): Promise<void> {
    const adminUser = await ctx.db
        .query("adminUsers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

    if (!adminUser) {
        throw new Error("Admin access required");
    }
}

/**
 * Checks if user is admin (returns boolean instead of throwing)
 */
export async function isUserAdmin(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">
): Promise<boolean> {
    const adminUser = await ctx.db
        .query("adminUsers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

    return !!adminUser;
}
