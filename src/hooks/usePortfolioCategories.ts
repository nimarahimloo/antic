/**
 * نمونه‌های اجرا و کاتالوگ از یک جدول مادر می‌خوانند: CurtainCategory
 * این hook فقط alias روی useCurtainCategories است تا صفحات پروژه نشکند.
 */
export {
  useCurtainCategories as usePortfolioCategories,
  normalizeCategory as normalizePortfolioCategory,
  refreshCurtainCategories as refreshPortfolioCategories,
} from "./useCurtainCategories";
