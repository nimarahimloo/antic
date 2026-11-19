/**
 * Convert an ApiError (or any thrown value) into a user-facing message in Persian.
 */
export function apiErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const error = err as { isNetworkError?: boolean; status?: number; message?: string };
    if (error.isNetworkError) {
      return "اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت را بررسی کنید.";
    }
    if (error.status === 401) {
      return "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";
    }
    if (error.status === 403) {
      return "شما دسترسی به این عملیات را ندارید.";
    }
    if (error.status === 404) {
      return "موارد مورد نظر یافت نشد.";
    }
    if (error.status === 409) {
      return "این مورد قبلاً ثبت شده است (تکراری).";
    }
    if (error.status === 422) {
      return "داده‌های ارسالی نامعتبر است.";
    }
    if (error.status && error.status >= 500) {
      return "خطای سرور. لطفاً بعداً دوباره سعی کنید.";
    }
    if (typeof error.message === "string") {
      return error.message;
    }
  }
  if (typeof err === "string") return err;
  return "خطای نامرزی رخ داد.";
}