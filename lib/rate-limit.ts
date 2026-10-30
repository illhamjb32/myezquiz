type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type Entry = { timestamps: number[] };

/** Sliding-window limiter kept in-process; serverless instances each enforce their own window. */
export function createRateLimiter(options: RateLimitOptions, now: () => number = Date.now) {
  const entries = new Map<string, Entry>();

  function check(key: string): RateLimitResult {
    const current = now();
    const cutoff = current - options.windowMs;
    const entry = entries.get(key) ?? { timestamps: [] };
    entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > cutoff);
    const allowed = entry.timestamps.length < options.limit;
    if (allowed) entry.timestamps.push(current);
    if (entry.timestamps.length === 0) entries.delete(key);
    else entries.set(key, entry);
    const oldest = entry.timestamps[0];
    return {
      allowed,
      remaining: Math.max(0, options.limit - entry.timestamps.length),
      retryAfterMs: allowed || oldest === undefined ? 0 : Math.max(0, oldest + options.windowMs - current),
    };
  }

  return {
    check,
    reset: () => entries.clear(),
  };
}

export type { RateLimitOptions, RateLimitResult };
