interface RateLimitBucket {
  timestamps: number[];
}

const WINDOW_MS = 60_000; // 1 minute
const LIMIT = 10; // 10 requests per minute
const tracker = new Map<string, RateLimitBucket>();

/**
 * Checks if a given IP address is rate-limited.
 * Uses a sliding-window algorithm.
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let bucket = tracker.get(ip);
  if (!bucket) {
    bucket = { timestamps: [] };
    tracker.set(ip, bucket);
  }

  // Filter timestamps outside of the sliding window
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (bucket.timestamps.length >= LIMIT) {
    return true;
  }

  bucket.timestamps.push(now);
  return false;
}

// Clean up stale, empty buckets periodically to prevent memory leaks.
// Use unref() so that Jest or standard dev servers are not blocked from exiting.
const sweepInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of tracker.entries()) {
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < WINDOW_MS);
    if (bucket.timestamps.length === 0) {
      tracker.delete(ip);
    }
  }
}, WINDOW_MS);

if (sweepInterval && typeof sweepInterval.unref === 'function') {
  sweepInterval.unref();
}
