import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { HttpError } from "./errors.js";
import type { Request } from "express";
import crypto from "crypto";

/**
 * Create a rate limiter with consistent configuration.
 * Uses trust proxy setting from Express app for correct client IP detection.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  code: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  /** Optional custom key generator (e.g., for account-level throttling) */
  customKeyGenerator?: (req: Request) => string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    keyGenerator: (req: Request) => {
      // Use custom key generator if provided (e.g., for account-level rate limiting)
      if (options.customKeyGenerator) {
        return options.customKeyGenerator(req);
      }
      // Use express-rate-limit's ipKeyGenerator for proper IPv6 handling
      // It expects the IP address string (req.ip), not the Request object.
      // It respects the trust proxy setting configured in app.ts.
      return ipKeyGenerator(req.ip || "");
    },
    handler: (_req, res) => {
      throw new HttpError(429, options.code, options.message);
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? false,
    // Disable rate limiting in tests
    skip: (req) => process.env.NODE_ENV === "test",
  });
}

/**
 * Rate limiter for login attempts.
 * - 10 requests per 15 minutes per IP
 * - Does not count successful logins toward the limit (only failed attempts)
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً ۱۵ دقیقه صبر کنید.",
  code: "RATE_LIMIT_LOGIN",
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for registration attempts.
 * - 5 requests per 15 minutes per IP
 */
export const registerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "تعداد تلاش‌های ثبت‌نام بیش از حد مجاز است. لطفاً ۱۵ دقیقه صبر کنید.",
  code: "RATE_LIMIT_REGISTER",
});

/**
 * Rate limiter for password reset requests (forgot-password).
 * - 3 requests per hour per IP
 * - This endpoint always returns the same response to prevent user enumeration
 */
export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: "تعداد درخواست‌های بازیابی رمز عبور بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
  code: "RATE_LIMIT_FORGOT_PASSWORD",
});

/**
 * Account-level rate limiter for password reset requests (forgot-password).
 * Uses a salted SHA-256 hash of the normalized email as the key.
 * - 1 request per 15 minutes per account
 * - Prevents attackers from exhausting another user's reset quota
 * - Does not store raw email addresses in rate-limit keys or logs
 * - Combined with IP-level limit for defense in depth
 */
export const forgotPasswordAccountRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1,
  message: "تعداد درخواست‌های بازیابی رمز عبور برای این حساب بیش از حد مجاز است. لطفاً بعداً تلاش کنید.",
  code: "RATE_LIMIT_FORGOT_PASSWORD_ACCOUNT",
  customKeyGenerator: (req: Request) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    // Use a salted hash to avoid storing raw email in rate-limit keys
    const salt = process.env.RATE_LIMIT_SALT || "antic-rate-limit-salt";
    return "pwd-reset:" + crypto.createHash("sha256").update(salt + ":" + email).digest("hex").slice(0, 32);
  },
});

/**
 * Rate limiter for password reset completion (reset-password).
 * - 5 requests per 15 minutes per IP
 */
export const resetPasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "تعداد تلاش‌های تغییر رمز عبور بیش از حد مجاز است. لطفاً ۱۵ دقیقه صبر کنید.",
  code: "RATE_LIMIT_RESET_PASSWORD",
});