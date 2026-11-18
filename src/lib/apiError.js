/**
 * Convert an ApiError (or any thrown value) into a user-facing message in Persian.
 */
export function apiErrorMessage(err) {
  if (err && typeof err === "object") {
    if (err.isNetworkError) {
      return "اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت را بررسی کنید.";
    }
    if (err.status === 401) {
      return "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";
    }
    if (err.status === 403) {
      return "شما دسترسی به این عملیات را ندارید.";
    }
    if (err.status === 404) {
      return "موارد مورد نظر یافت نشد.";
    }
    if (err.status === 409) {
      return "این مورد قبلاً ثبت شده است (تکراری).";
    }
    if (err.status === 422) {
      return "داده‌های ارسالی نامعتبر است.";
    }
    if (err.status && err.status >= 500) {
      return "خطای سرور. لطفاً بعداً دوباره سعی کنید.";
    }
    if (typeof err.message === "string") {
      return err.message;
    }
  }
  if (typeof err === "string") return err;
  return "خطای نامرزی رخ داد.";
}
