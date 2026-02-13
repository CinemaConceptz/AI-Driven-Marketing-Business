type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 10;

export function rateLimit(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  if (bucket.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true, remaining: MAX_REQUESTS - bucket.count, resetAt: bucket.resetAt };
}

export function getRequestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}
