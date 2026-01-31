import { MutationCtx } from "../_generated/server";

// Rate limit configuration for different actions
const RATE_LIMITS = {
  signIn: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockMs: 30 * 60 * 1000, // 30 minute block
  },
  signUp: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockMs: 60 * 60 * 1000, // 1 hour block
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockMs: 60 * 60 * 1000, // 1 hour block
  },
  passwordResetVerify: {
    maxAttempts: 5,
    windowMs: 30 * 60 * 1000, // 30 minutes
    blockMs: 60 * 60 * 1000, // 1 hour block
  },
} as const;

type RateLimitAction = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  attemptsRemaining?: number;
}

/**
 * Check and update rate limit for an action
 * @param ctx - Convex mutation context
 * @param action - The action being rate limited (signIn, signUp, etc.)
 * @param identifier - Unique identifier (usually email or IP)
 * @returns Object indicating if action is allowed and retry time if blocked
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  action: RateLimitAction,
  identifier: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  const key = `${action}:${identifier.toLowerCase()}`;
  const now = Date.now();

  // Find existing rate limit record
  const record = await ctx.db
    .query("rateLimits")
    .withIndex("by_key_action", (q) => q.eq("key", key).eq("action", action))
    .first();

  // Check if currently blocked
  if (record?.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterMs: record.blockedUntil - now,
    };
  }

  // No record or window expired - start fresh
  if (!record || record.windowStart + config.windowMs < now) {
    if (record) {
      await ctx.db.patch(record._id, {
        count: 1,
        windowStart: now,
        blockedUntil: undefined,
      });
    } else {
      await ctx.db.insert("rateLimits", {
        key,
        action,
        count: 1,
        windowStart: now,
      });
    }
    return {
      allowed: true,
      attemptsRemaining: config.maxAttempts - 1,
    };
  }

  // Within window - check if limit reached
  if (record.count >= config.maxAttempts) {
    // Block the user
    const blockedUntil = now + config.blockMs;
    await ctx.db.patch(record._id, { blockedUntil });
    return {
      allowed: false,
      retryAfterMs: config.blockMs,
    };
  }

  // Increment attempt count
  await ctx.db.patch(record._id, { count: record.count + 1 });
  return {
    allowed: true,
    attemptsRemaining: config.maxAttempts - record.count - 1,
  };
}

/**
 * Reset rate limit for a specific action and identifier
 * Call this on successful authentication to clear failed attempts
 */
export async function resetRateLimit(
  ctx: MutationCtx,
  action: RateLimitAction,
  identifier: string
): Promise<void> {
  const key = `${action}:${identifier.toLowerCase()}`;

  const record = await ctx.db
    .query("rateLimits")
    .withIndex("by_key_action", (q) => q.eq("key", key).eq("action", action))
    .first();

  if (record) {
    await ctx.db.delete(record._id);
  }
}

/**
 * Format retry time for user-friendly message
 */
export function formatRetryTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}
