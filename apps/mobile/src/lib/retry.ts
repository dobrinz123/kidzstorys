/**
 * Retry utility with exponential backoff
 * Use for network operations that may fail transiently
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Whether to use exponential backoff (default: true) */
  exponential?: boolean;
  /** Callback when retrying */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
  /** Function to determine if error is retryable (default: all errors are retryable) */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Execute an async function with retry logic
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    exponential = true,
    onRetry,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // Check if we've exhausted retries
      if (attempt >= maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = exponential
        ? Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs)
        : initialDelayMs;

      // Notify about retry
      if (onRetry) {
        onRetry(lastError, attempt + 1, delay);
      }

      // Wait before retrying
      await sleep(delay);
      attempt++;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default retry options for RevenueCat operations
 */
export const revenueCatRetryOptions: RetryOptions = {
  maxRetries: 2,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  exponential: true,
  shouldRetry: (error) => {
    // Don't retry user cancellations
    if ((error as any).userCancelled) {
      return false;
    }
    // Don't retry validation errors
    const message = error.message?.toLowerCase() || "";
    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("not found")
    ) {
      return false;
    }
    // Retry network and server errors
    return true;
  },
  onRetry: (error, attempt, delay) => {
    console.log(
      `[RevenueCat] Retry attempt ${attempt} after ${delay}ms:`,
      error.message
    );
  },
};

/**
 * Default retry options for Convex operations
 */
export const convexRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  exponential: true,
  shouldRetry: (error) => {
    const message = error.message?.toLowerCase() || "";
    // Don't retry validation or auth errors
    if (
      message.includes("validation") ||
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("not found")
    ) {
      return false;
    }
    return true;
  },
  onRetry: (error, attempt, delay) => {
    console.log(
      `[Convex] Retry attempt ${attempt} after ${delay}ms:`,
      error.message
    );
  },
};
