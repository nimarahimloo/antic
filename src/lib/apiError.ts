/**
 * Convert an ApiError (or any thrown value) into a user-facing message in Persian.
 * Also returns a structured error descriptor for consistent UI display.
 */

export interface ErrorInfo {
  /** Stable machine-readable code from the backend (e.g. VALIDATION_ERROR) */
  code: string;
  /** HTTP status code */
  status: number;
  /** User-facing Persian message */
  message: string;
  /** Whether this is a network connectivity failure */
  isNetworkError: boolean;
  /** Whether this is an auth error (401/403) */
  isAuthError: boolean;
  /** Backend request ID for support tracing */
  requestId: string | null;
  /** Whether the error is retryable */
  isRetryable: boolean;
}

/** Codes that indicate a transient failure worth retrying. */
const RETRYABLE_CODES = new Set([
  "NETWORK_ERROR",
  "EXTERNAL_SERVICE_ERROR",
  "DATABASE_ERROR",
  "INTERNAL_ERROR",
]);

/** Map backend status -> whether retryable. */
function statusIsRetryable(status: number): boolean {
  return status >= 500 || status === 429;
}

/** Default Persian messages per status when no code/message is present. */
const DEFAULT_MESSAGES: Record<number, string> = {
  400: "درخواست نامعتبر است.",
  401: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
  403: "شما دسترسی به این عملیات را ندارید.",
  404: "موارد مورد نظر یافت نشد.",
  409: "این مورد قبلاً ثبت شده است (تکراری).",
  422: "داده‌های ارسالی نامعتبر است.",
  429: "درخواست‌های بیش از حد. لطفاً بعداً سعی کنید.",
  502: "خطا در اتصال به سرویس خارجی. دوباره تلاش کنید.",
  503: "درگاه پرداخت پیکربندی نشده است.",
  504: "سرور در دسترسی پاسخ نداد. بعداً سعی کنید.",
};

/**
 * Parse a backend error response body into a stable code.
 * Backend now returns { error, code, requestId }.
 */
function _parseCode(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "code" in body && typeof (body as Record<string, unknown>).code === "string") {
    return (body as Record<string, unknown>).code as string;
  }
  return fallback;
}

export function errorInfo(err: unknown): ErrorInfo {
  // Network error (fetch threw)
  if (err && typeof err === "object") {
    const e = err as { isNetworkError?: boolean; status?: number; message?: string; code?: string; data?: unknown; requestId?: string };
    if (e.isNetworkError) {
      return {
        code: e.code ?? "NETWORK_ERROR",
        status: 0,
        message: "اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت را بررسی کنید.",
        isNetworkError: true,
        isAuthError: false,
        requestId: e.requestId ?? null,
        isRetryable: true,
      };
    }

    // Structured ApiError from the client
    if (e.status !== undefined || e.code !== undefined || e.message !== undefined) {
      const status = e.status ?? 0;
      const code = e.code ?? codeForStatus(status);
      const message =
        typeof e.message === "string" && e.message.length > 0
          ? e.message
          : DEFAULT_MESSAGES[status] ?? "خطای نامرزی رخ داد.";
      return {
        code,
        status,
        message,
        isNetworkError: false,
        isAuthError: status === 401 || status === 403,
        requestId: e.requestId ?? null,
        isRetryable: statusIsRetryable(status) || RETRYABLE_CODES.has(code),
      };
    }
  }

  // Raw string error
  if (typeof err === "string") {
    return {
      code: ErrorCodeFromMessage(err),
      status: 0,
      message: err,
      isNetworkError: false,
      isAuthError: false,
      requestId: null,
      isRetryable: false,
    };
  }

  // Fallback
  return {
    code: "INTERNAL_ERROR",
    status: 0,
    message: "خطای نامرزی رخ داد.",
    isNetworkError: false,
    isAuthError: false,
    requestId: null,
    isRetryable: false,
  };
}

/** Keep the old string-returning signature for call sites that still use it. */
export function apiErrorMessage(err: unknown): string {
  return errorInfo(err).message;
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400: return "VALIDATION_ERROR";
    case 401: return "AUTH_REQUIRED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "VALIDATION_ERROR";
    case 502: return "EXTERNAL_SERVICE_ERROR";
    case 503: return "SERVICE_UNAVAILABLE";
    default: return "INTERNAL_ERROR";
  }
}

function ErrorCodeFromMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("شبکه") || m.includes("network")) return "NETWORK_ERROR";
  if (m.includes("ورود") || m.includes("auth")) return "AUTH_REQUIRED";
  if (m.includes("دسترسی") || m.includes("forbidden")) return "FORBIDDEN";
  if (m.includes("یافت نشد") || m.includes("not found")) return "NOT_FOUND";
  if (m.includes("تکراری") || m.includes("conflict")) return "CONFLICT";
  if (m.includes("بارگذاری") || m.includes("upload")) return "UPLOAD_ERROR";
  return "INTERNAL_ERROR";
}
