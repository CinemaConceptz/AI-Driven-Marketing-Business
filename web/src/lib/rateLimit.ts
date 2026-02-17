type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Default values
const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Rate limit by key with configurable limits
 * @param key - Unique identifier (e.g., "contact:192.168.1.1")
 * @param maxRequests - Maximum requests allowed in window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 */
export function rateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
}

/**
 * Extract client IP from request headers
 */
export function getRequestIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Clean up expired buckets (call periodically if needed)
 */
export function cleanupExpiredBuckets(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) {
      buckets.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}
