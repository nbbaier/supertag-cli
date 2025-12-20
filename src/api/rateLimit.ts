/**
 * Rate Limiter
 * Ensures API calls respect Tana's 1 call per second rate limit
 */

/**
 * Rate Limiter class
 * Enforces minimum time between API calls
 */
export class RateLimiter {
  private lastCall: number = 0;
  private interval: number;

  /**
   * Create a rate limiter
   * @param intervalMs Minimum milliseconds between calls (default: 1000 for Tana API)
   */
  constructor(intervalMs: number = 1000) {
    this.interval = intervalMs;
  }

  /**
   * Wait until it's safe to make the next API call
   * Automatically enforces rate limit
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;

    if (timeSinceLastCall < this.interval) {
      const waitTime = this.interval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCall = Date.now();
  }

  /**
   * Reset the rate limiter
   * Useful for testing or when switching API contexts
   */
  reset(): void {
    this.lastCall = 0;
  }

  /**
   * Get time until next call is allowed
   * @returns Milliseconds until next call (0 if ready now)
   */
  getTimeUntilNextCall(): number {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    const timeRemaining = this.interval - timeSinceLastCall;
    return Math.max(0, timeRemaining);
  }

  /**
   * Check if a call can be made immediately
   * @returns true if ready for next call
   */
  isReady(): boolean {
    return this.getTimeUntilNextCall() === 0;
  }
}

/**
 * Global rate limiter instance for Tana API
 * Singleton to ensure rate limiting across all API calls
 */
let globalRateLimiter: RateLimiter | null = null;

/**
 * Get the global rate limiter instance
 * @param intervalMs Interval in milliseconds (only used on first call)
 * @returns Global RateLimiter instance
 */
export function getGlobalRateLimiter(intervalMs: number = 1000): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(intervalMs);
  }
  return globalRateLimiter;
}

/**
 * Reset the global rate limiter
 */
export function resetGlobalRateLimiter(): void {
  if (globalRateLimiter) {
    globalRateLimiter.reset();
  }
}
