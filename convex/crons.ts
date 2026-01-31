import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired sessions daily at 3 AM UTC
crons.daily(
  "cleanup expired sessions",
  { hourUTC: 3, minuteUTC: 0 },
  internal.maintenance.cleanupExpiredSessions
);

// Clean up old rate limit records daily at 4 AM UTC
crons.daily(
  "cleanup rate limits",
  { hourUTC: 4, minuteUTC: 0 },
  internal.maintenance.cleanupRateLimits
);

// Clean up old subscription events monthly (keep 90 days)
crons.monthly(
  "cleanup subscription events",
  { day: 1, hourUTC: 5, minuteUTC: 0 },
  internal.maintenance.cleanupOldSubscriptionEvents
);

// Clean up old audit logs monthly (keep 365 days)
crons.monthly(
  "cleanup audit logs",
  { day: 1, hourUTC: 6, minuteUTC: 0 },
  internal.maintenance.cleanupOldAuditLogs
);

export default crons;
