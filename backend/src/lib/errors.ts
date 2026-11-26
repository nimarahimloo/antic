import type { Response } from "express";
import crypto from "crypto";

export class HttpError extends Error {
  status: number;
  code: string;
  data?: unknown;

  constructor(
    status: number,
    codeOrMessage: string,
    maybeMessageOrData?: string | unknown,
    maybeData?: unknown,
  ) {
    super(codeOrMessage);
    this.name = "HttpError";
    this.status = status;

    // Backward compatibility: new HttpError(400, "some message")
    // If the second arg looks like a stable code, use it; otherwise auto-generate from status.
    if (Object.values(ErrorCode as Record<string, string>).includes(codeOrMessage)) {
      this.code = codeOrMessage;
      this.message = String(maybeMessageOrData ?? codeOrMessage);
      this.data = maybeData;
    } else {
      this.code = codeForStatus(status);
      this.message = codeOrMessage;
      this.data = maybeMessageOrData;
    }
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400: return ErrorCode.VALIDATION;
    case 401: return ErrorCode.AUTH_REQUIRED;
    case 403: return ErrorCode.FORBIDDEN;
    case 404: return ErrorCode.NOT_FOUND;
    case 409: return ErrorCode.CONFLICT;
    case 422: return ErrorCode.VALIDATION;
    case 502: return ErrorCode.EXTERNAL;
    case 503: return ErrorCode.PAYMENT;
    default: return ErrorCode.INTERNAL;
  }
}

function prismaCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: string }).code);
  }
  return undefined;
}

function resourceMetadataUrl(): string {
  const base = process.env.PUBLIC_BASE_URL || "https://pardehantic.ir";
  return base.replace(/\/$/, "") + "/.well-known/oauth-protected-resource";
}

/** Stable machine-readable error codes shared with the frontend. */
export const ErrorCode = {
  VALIDATION: "VALIDATION_ERROR",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID: "AUTH_INVALID_TOKEN",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  BAD_REFERENCE: "BAD_REFERENCE",
  DATABASE: "DATABASE_ERROR",
  EXTERNAL: "EXTERNAL_SERVICE_ERROR",
  INTERNAL: "INTERNAL_ERROR",
  NETWORK: "NETWORK_ERROR",
  UPLOAD: "UPLOAD_ERROR",
  PAYMENT: "PAYMENT_ERROR",
} as const;

/** Human-readable Persian messages for stable codes. */
const PERSIAN_MESSAGES: Record<string, string> = {
  [ErrorCode.VALIDATION]: "دادهٔ ارسالی نامعتبر است.",
  [ErrorCode.AUTH_REQUIRED]: "برای این عملیات وارد سیستم شوید.",
  [ErrorCode.AUTH_INVALID]: "توکن احراز هویت نامعتبر یا منقضی شده است.",
  [ErrorCode.FORBIDDEN]: "شما دسترسی به این عملیات را ندارید.",
  [ErrorCode.NOT_FOUND]: "موارد مورد نظر یافت نشد.",
  [ErrorCode.CONFLICT]: "این مورد قبلاً ثبت شده است (تکراری).",
  [ErrorCode.BAD_REFERENCE]: "ارجاع نامعتبر به رکورد دیگر.",
  [ErrorCode.DATABASE]: "خطا در دسترسی به دیتابیس.",
  [ErrorCode.EXTERNAL]: "خطا در سرویس خارجی.",
  [ErrorCode.INTERNAL]: "خطای داخلی سرور.",
  [ErrorCode.NETWORK]: "خطا در برقراری ارتباط شبکه.",
  [ErrorCode.UPLOAD]: "بارگذاری فایل ناموفق بود.",
  [ErrorCode.PAYMENT]: "خطا در پردازش پرداخت.",
};

function persianMessage(code: string, fallback: string): string {
  return PERSIAN_MESSAGES[code] || fallback;
}

function generateRequestId(): string {
  return crypto.randomUUID();
}

function safeLogDetails(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== "object") return {};
  const e = err as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof e.name === "string") out.name = e.name;
  if (typeof e.code === "string") out.code = e.code;
  if (typeof e.message === "string") out.message = e.message;
  if (typeof e.status === "number") out.status = e.status;
  return out;
}

export function sendError(res: Response, err: unknown) {
  const requestId = generateRequestId();
  res.set("X-Request-Id", requestId);

  // ---- HttpError (explicit application errors) ----
  if (err instanceof HttpError) {
    if (err.status === 401) {
      res.set(
        "WWW-Authenticate",
        `Bearer realm="pardehantic", resource_metadata="${resourceMetadataUrl()}"`
      );
    }
    const body: Record<string, unknown> = {
      error: persianMessage(err.code, err.message),
      code: err.code,
      requestId,
    };
    if (err.data !== undefined) body.extra_data = err.data;
    return res.status(err.status).json(body);
  }

  // ---- Prisma unique constraint ----
  const code = prismaCode(err);
  if (code === "P2002") {
    return res.status(409).json({
      error: persianMessage(ErrorCode.CONFLICT, "رکورد تکراری است (unique constraint)."),
      code: ErrorCode.CONFLICT,
      requestId,
    });
  }
  if (code === "P2025") {
    return res.status(404).json({
      error: persianMessage(ErrorCode.NOT_FOUND, "رکورد پیدا نشد."),
      code: ErrorCode.NOT_FOUND,
      requestId,
    });
  }
  if (code === "P2003") {
    return res.status(400).json({
      error: persianMessage(ErrorCode.BAD_REFERENCE, "ارجاع نامعتبر به رکورد دیگر."),
      code: ErrorCode.BAD_REFERENCE,
      requestId,
    });
  }

  // ---- Prisma validation error ----
  if (err && typeof err === "object" && "name" in err) {
    const name = String((err as { name: string }).name);
    if (name === "PrismaClientValidationError") {
      console.error("Prisma validation error", {
        requestId,
        ...safeLogDetails(err),
      });
      return res.status(400).json({
        error: persianMessage(ErrorCode.VALIDATION, "دادهٔ ارسالی با مدل دیتابیس سازگار نیست."),
        code: ErrorCode.VALIDATION,
        requestId,
      });
    }
  }

  // ---- Unknown internal error ----
  console.error("Internal server error", {
    requestId,
    ...safeLogDetails(err),
  });
  return res.status(500).json({
    error: persianMessage(ErrorCode.INTERNAL, "Internal server error"),
    code: ErrorCode.INTERNAL,
    requestId,
  });
}
