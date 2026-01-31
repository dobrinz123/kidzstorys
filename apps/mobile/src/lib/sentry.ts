/**
 * Sentry Crash Reporting Setup
 *
 * To enable Sentry:
 * 1. Install: pnpm --filter mobile add @sentry/react-native
 * 2. Set EXPO_PUBLIC_SENTRY_DSN in your environment
 * 3. Call initSentry() in your app entry point (_layout.tsx)
 *
 * For EAS builds, also configure source maps upload in eas.json
 */

// Note: Uncomment the import once @sentry/react-native is installed
// import * as Sentry from "@sentry/react-native";

// Check if we're in development mode
const __DEV__ = process.env.NODE_ENV === "development";

interface SentryConfig {
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
  enableAutoSessionTracking?: boolean;
}

/**
 * Initialize Sentry for crash reporting
 * Call this early in your app entry point
 */
export function initSentry(config?: SentryConfig): void {
  const dsn = config?.dsn || process.env.EXPO_PUBLIC_SENTRY_DSN;

  // Skip in development or if no DSN
  if (__DEV__) {
    console.log("[Sentry] Skipping initialization in development mode");
    return;
  }

  if (!dsn) {
    console.warn("[Sentry] No DSN configured. Crash reporting disabled.");
    return;
  }

  // Uncomment once @sentry/react-native is installed:
  /*
  Sentry.init({
    dsn,
    environment: config?.environment || process.env.EXPO_PUBLIC_ENV || "production",
    tracesSampleRate: config?.tracesSampleRate ?? 0.2,
    enableAutoSessionTracking: config?.enableAutoSessionTracking ?? true,
    attachStacktrace: true,
    // Don't send PII
    sendDefaultPii: false,
    // Ignore common non-actionable errors
    ignoreErrors: [
      "Network request failed",
      "AbortError",
      "Load failed",
    ],
  });
  */

  console.log("[Sentry] Initialized (placeholder - install @sentry/react-native to enable)");
}

/**
 * Capture an exception with optional context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
): void {
  // Always log in development
  if (__DEV__) {
    console.error("[Sentry] Exception:", error, context);
    return;
  }

  // Uncomment once @sentry/react-native is installed:
  /*
  Sentry.captureException(error, {
    extra: context,
  });
  */

  console.error("[Sentry] Exception (not sent - install @sentry/react-native):", error.message);
}

/**
 * Capture a message with optional context
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>
): void {
  if (__DEV__) {
    console.log(`[Sentry] ${level}:`, message, context);
    return;
  }

  // Uncomment once @sentry/react-native is installed:
  /*
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
  */
}

/**
 * Set user context for error tracking
 */
export function setUser(user: {
  id: string;
  email?: string;
} | null): void {
  // Uncomment once @sentry/react-native is installed:
  /*
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
  */
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  // Uncomment once @sentry/react-native is installed:
  /*
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: "info",
  });
  */
}

/**
 * Wrap a component with Sentry error boundary
 * Use this for critical components that should report crashes
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.ComponentType<P> {
  // Uncomment once @sentry/react-native is installed:
  /*
  return Sentry.withErrorBoundary(Component, {
    fallback: fallback || <Text>Something went wrong</Text>,
  });
  */

  // Return component as-is until Sentry is installed
  return Component;
}
