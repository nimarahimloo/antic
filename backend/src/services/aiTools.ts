import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  getCurtainModel,
  listCurtainCategories,
  listCurtainProjects,
  searchCurtainModels,
} from "./aiCatalog.js";

export const AI_SYSTEM_PROMPT = `شما «دستیار فضای کاری هوش مصنوعی پرده آنتیک» هستید و فقط برای مدیران احراز هویت‌شدهٔ آنتیک کار می‌کنید.

اصول مهم:
- پاسخ‌ها به فارسی، دقیق، کوتاه و عملی باشند.
- برای هر ادعای مربوط به کاتالوگ، مدل پرده، دسته‌بندی یا پروژه‌های اجراشده، حتماً از ابزارهای داخلی استفاده کنید؛ اطلاعات کاتالوگ را حدس نزنید.
- ابزار list_categories برای دسته‌های کاتالوگ پرده، search_models برای جست‌وجوی مدل‌ها، get_model برای جزئیات یک مدل و list_projects برای نمونه‌کارهای اجراشده است.
- اگر ابزار نتیجه‌ای برنگرداند، صریح بگویید موردی در دادهٔ فعلی پیدا نشد.
- میان کاتالوگ پرده و فروشگاه اکسسوری تفاوت قائل شوید؛ این ابزارها فقط کاتالوگ پرده را پوشش می‌دهند.
- در پاسخ‌ها اطلاعات محرمانه، کلید API، مسیر فایل سرور یا دادهٔ کاربران را افشا نکنید.
- اگر کاربر درخواست تولید یا ویرایش تصویر دارد، توضیح دهید که این کار از بخش «استودیوی تصویر» انجام می‌شود.`;

export function createAITools(): ToolSet {
  return {
    list_categories: tool({
      description:
        "لیست دسته‌بندی‌های واقعی کاتالوگ پرده همراه با slug، مکانیزم و زیردسته‌ها را برمی‌گرداند.",
      inputSchema: z.object({}).strict(),
      execute: async () => listCurtainCategories(),
    }),
    search_models: tool({
      description:
        "مدل‌های پرده را بر اساس متن، کد، پارچه، رنگ یا slug دسته جست‌وجو می‌کند.",
      inputSchema: z.object({
        query: z.string().optional().describe("عبارت جست‌وجو؛ اختیاری"),
        category_slug: z.string().optional().describe("slug دقیق دستهٔ پرده؛ اختیاری"),
        limit: z.number().int().min(1).max(50).optional().describe("حداکثر تعداد نتیجه"),
      }),
      execute: async (input) => searchCurtainModels(input),
    }),
    get_model: tool({
      description: "جزئیات کامل یک مدل پرده را با شناسهٔ id برمی‌گرداند.",
      inputSchema: z.object({
        id: z.string().min(1).describe("شناسهٔ مدل پرده"),
      }),
      execute: async (input) => getCurtainModel(input),
    }),
    list_projects: tool({
      description: "نمونه‌کارهای واقعی و پروژه‌های اجراشدهٔ پرده آنتیک را برمی‌گرداند.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async (input) => listCurtainProjects(input),
    }),
  };
}
