/**
 * Simple in-memory rate limiter
 * In production, use Redis or similar
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

/**
 * Check if request is rate limited
 */
export function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return false;
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  return false;
}

/**
 * Get remaining requests for user
 */
export function getRemainingRequests(userId: string): number {
  const entry = rateLimitStore.get(userId);
  const now = Date.now();

  if (!entry || now > entry.resetTime) {
    return RATE_LIMIT_MAX_REQUESTS;
  }

  return Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count);
}

/**
 * Reset rate limit for user
 */
export function resetRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}

/**
 * Cleanup old entries (run periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [userId, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(userId);
    }
  }
}

// Cleanup every 5 minutes
if (typeof globalThis !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
