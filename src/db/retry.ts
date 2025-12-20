/**
 * Database Retry Utilities
 *
 * Provides retry logic with exponential backoff for SQLite database operations
 * that may fail due to database locks during concurrent access.
 */

/**
 * Retry configuration for database operations
 */
export const DB_RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 100,
  maxDelayMs: 2000,
};

/**
 * Check if an error is a database lock error
 */
export function isDbLockError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("database is locked") || msg.includes("busy");
  }
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a database operation with retry on lock errors
 *
 * Uses exponential backoff with jitter to handle concurrent database access.
 * Retries up to 5 times with delays: 100ms → 200ms → 400ms → 800ms → 1600ms
 *
 * @param operation - The database operation to execute
 * @param context - Optional context string for debugging (not currently used)
 * @returns The result of the operation
 * @throws The last error if all retries fail, or immediately for non-lock errors
 */
export async function withDbRetry<T>(
  operation: () => T,
  context?: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < DB_RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return operation();
    } catch (error) {
      if (isDbLockError(error)) {
        lastError = error;
        // Exponential backoff with jitter
        const delay = Math.min(
          DB_RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
          DB_RETRY_CONFIG.maxDelayMs
        );
        if (attempt < DB_RETRY_CONFIG.maxRetries - 1) {
          await sleep(delay);
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError;
}

/**
 * Synchronous version of withDbRetry for operations that can't be async
 *
 * Uses busy-wait retry which is less efficient but works in sync contexts.
 * Prefer withDbRetry when possible.
 */
export function withDbRetrySync<T>(
  operation: () => T,
  context?: string
): T {
  let lastError: unknown;

  for (let attempt = 0; attempt < DB_RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return operation();
    } catch (error) {
      if (isDbLockError(error)) {
        lastError = error;
        if (attempt < DB_RETRY_CONFIG.maxRetries - 1) {
          // Busy-wait for sync context (not ideal but necessary)
          const delay = Math.min(
            DB_RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
            DB_RETRY_CONFIG.maxDelayMs
          );
          const start = Date.now();
          while (Date.now() - start < delay) {
            // Busy wait
          }
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError;
}
