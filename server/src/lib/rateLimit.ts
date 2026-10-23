// Rate limits for the API. Starting a review costs a GitHub fetch plus a Gemini call over
// the whole diff (with model fallbacks), so one account, or one script, could otherwise use
// up the free Gemini quota and the GitHub token's hourly allowance for everybody.
//
//   - ipLimiter:     a coarse brake on everything under /api, per client address. It runs
//                    before sign-in is checked, so it also covers requests with no token.
//   - reviewLimiters: tighter limits on starting or retrying a review, per signed-in user
//                    (the id requireUser sets), so people behind one address don't share.
//
// Counts live in this process's memory: fine for the single Render instance, but they reset
// on restart and would not be shared if the API were scaled to several instances.
import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit, type RateLimitInfo } from "express-rate-limit";

type LimitOptions = {
  windowMs: number;
  limit: number;
  message: string; // shown to the person: what was limited and roughly how long to wait
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function createLimiter({ windowMs, limit, message }: LimitOptions, key: (req: Request) => string): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7", // RateLimit and Retry-After headers
    legacyHeaders: false,
    keyGenerator: key,
    handler: (req, res, _next, options) => {
      const resetTime = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit?.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(windowMs / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      res.status(options.statusCode).json({ error: message, code: "rate_limited", retryAfterSeconds });
    },
  });
}

// ipKeyGenerator groups IPv6 addresses by their /56, so one person can't dodge the limit by
// rotating through addresses in their own range.
const byIp = (req: Request) => ipKeyGenerator(req.ip ?? "unknown");

// Falls back to the address if a route was mounted before requireUser (a mistake, but it
// should still be limited rather than crash).
const byUser = (req: Request) => (req.userId ? `user:${req.userId}` : `ip:${byIp(req)}`);

export const limits = {
  // 300 a minute per address: generous, because the review page polls while a review runs.
  perIp: { windowMs: MINUTE, limit: 300, message: "Too many requests. Slow down and try again in a minute." },
  // Starting a review. Retries count too, so a failing review can't be retried in a loop.
  reviewsPerHour: { windowMs: HOUR, limit: 8, message: "You've started a lot of reviews in the last hour. Try again later." },
  reviewsPerDay: { windowMs: DAY, limit: 25, message: "You've reached today's limit of 25 reviews. Try again tomorrow." },
} satisfies Record<string, LimitOptions>;

export const ipLimiter = createLimiter(limits.perIp, byIp);

export const reviewLimiters: RequestHandler[] = [
  createLimiter(limits.reviewsPerHour, byUser),
  createLimiter(limits.reviewsPerDay, byUser),
];
