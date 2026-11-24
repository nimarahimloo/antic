import { tool, type ToolSet } from "ai";
import {
  catalogToolDescriptions,
  catalogToolSchemas,
  executeCatalogTool,
} from "./catalogToolRegistry.js";

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
      description: catalogToolDescriptions.list_categories,
      inputSchema: catalogToolSchemas.list_categories,
      execute: async (input) => executeCatalogTool("list_categories", input),
    }),
    search_models: tool({
      description: catalogToolDescriptions.search_models,
      inputSchema: catalogToolSchemas.search_models,
      execute: async (input) => executeCatalogTool("search_models", input),
    }),
    get_model: tool({
      description: catalogToolDescriptions.get_model,
      inputSchema: catalogToolSchemas.get_model,
      execute: async (input) => executeCatalogTool("get_model", input),
    }),
    list_projects: tool({
      description: catalogToolDescriptions.list_projects,
      inputSchema: catalogToolSchemas.list_projects,
      execute: async (input) => executeCatalogTool("list_projects", input),
    }),
  };
}
