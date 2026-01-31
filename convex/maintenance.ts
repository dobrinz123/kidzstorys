import { internalMutation } from "./_generated/server";

// ============ CLEANUP FUNCTIONS ============

/**
 * Clean up expired sessions
 * Runs daily - removes sessions that have expired
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deletedCount = 0;

    // Get expired sessions (batch of 500 at a time to avoid timeout)
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(500);

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
      deletedCount++;
    }

    console.log(`[Maintenance] Cleaned up ${deletedCount} expired sessions`);
    return { deletedCount };
  },
});

/**
 * Clean up old rate limit records
 * Runs daily - removes rate limits older than 24 hours
 */
export const cleanupRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    let deletedCount = 0;

    // Get old rate limit records
    const oldRecords = await ctx.db
      .query("rateLimits")
      .filter((q) => q.lt(q.field("windowStart"), cutoff))
      .take(500);

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
      deletedCount++;
    }

    console.log(`[Maintenance] Cleaned up ${deletedCount} rate limit records`);
    return { deletedCount };
  },
});

/**
 * Clean up old subscription events
 * Runs monthly - keeps only last 90 days of events
 */
export const cleanupOldSubscriptionEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days ago
    let deletedCount = 0;

    // Get old events (batch of 500)
    const oldEvents = await ctx.db
      .query("subscriptionEvents")
      .filter((q) => q.lt(q.field("processedAt"), cutoff))
      .take(500);

    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
      deletedCount++;
    }

    console.log(`[Maintenance] Cleaned up ${deletedCount} subscription events`);
    return { deletedCount };
  },
});

/**
 * Clean up old audit logs
 * Runs monthly - keeps only last 365 days of logs
 */
export const cleanupOldAuditLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000; // 365 days ago
    let deletedCount = 0;

    // Get old logs (batch of 500)
    const oldLogs = await ctx.db
      .query("auditLog")
      .withIndex("by_date")
      .filter((q) => q.lt(q.field("performedAt"), cutoff))
      .take(500);

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    console.log(`[Maintenance] Cleaned up ${deletedCount} audit logs`);
    return { deletedCount };
  },
});

/**
 * Manual cleanup function - can be called from dashboard
 * Cleans up all old data in one go
 */
export const runAllCleanups = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      sessions: 0,
      rateLimits: 0,
      subscriptionEvents: 0,
      auditLogs: 0,
    };

    const now = Date.now();

    // Clean sessions
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(1000);
    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
      results.sessions++;
    }

    // Clean rate limits
    const rateLimitCutoff = now - 24 * 60 * 60 * 1000;
    const oldRateLimits = await ctx.db
      .query("rateLimits")
      .filter((q) => q.lt(q.field("windowStart"), rateLimitCutoff))
      .take(1000);
    for (const record of oldRateLimits) {
      await ctx.db.delete(record._id);
      results.rateLimits++;
    }

    // Clean subscription events
    const eventCutoff = now - 90 * 24 * 60 * 60 * 1000;
    const oldEvents = await ctx.db
      .query("subscriptionEvents")
      .filter((q) => q.lt(q.field("processedAt"), eventCutoff))
      .take(1000);
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
      results.subscriptionEvents++;
    }

    // Clean audit logs
    const auditCutoff = now - 365 * 24 * 60 * 60 * 1000;
    const oldLogs = await ctx.db
      .query("auditLog")
      .withIndex("by_date")
      .filter((q) => q.lt(q.field("performedAt"), auditCutoff))
      .take(1000);
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      results.auditLogs++;
    }

    console.log("[Maintenance] Manual cleanup completed:", results);
    return results;
  },
});
