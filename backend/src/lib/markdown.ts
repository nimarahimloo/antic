import { prisma } from "./prisma.js";

/** Media type agents request to receive markdown. */
export const MARKDOWN_MEDIA_TYPE = "text/markdown";

/**
 * Content-negotiation helper: true when the request asks for markdown.
 * Matches `Accept: text/markdown` and `Accept: text/markdown; charset=utf-8`.
 */
export function wantsMarkdown(req): boolean {
  const accept = req.headers.accept || "";
  return accept
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .includes(MARKDOWN_MEDIA_TYPE);
}

/** Rough token estimate (~4 characters per token). */
export function countTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

const BASE = (process.env.PUBLIC_BASE_URL || "https://pardehantic.ir").replace(
  /\/$/,
  ""
);

/** Escape a string for safe use inside markdown inline code / links. */
function md(text: string): string {
  return String(text ?? "").replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}

/** Static markdown for informational pages that don't depend on DB content. */
function staticMarkdown(path: string): string | null {
  const pages: Record<string, string> = {
    "/": "# پرده آنتیک\n\nخانه لوکس پرده و پارچه. طراحی، اجرا و فروش پرده‌های شید، زبرا، رومن، پلیسه، چوبی، کرکره‌ای، مخمل، تور، حریر و کتان همراه با کاتالوگ تعاملی.\n\n## صفحات اصلی\n- [كتالوگ پرده](" + BASE + "/catalog) — مدل‌ها و نمای نصب\n- [فروشگاه اکسسوری](" + BASE + "/shop) — محصولات فروشگاه\n- [درباره ما](" + BASE + "/about) — طراحی و اجرای پرده\n- [تماس با ما](" + BASE + "/contact) — ارتباط و مشاوره\n- [نمونه کارها](" + BASE + "/projects) — پروژه‌های اجرا شده\n",

    "/about": "# درباره پرده آنتیک\n\n## طراحی و اجرای پرده\nاز مشاوره تا نصب؛ با تمرکز روی کیفیت پارچه، دقت دوخت و اجرای مرتب در محل.\n\n## تجربه و دقت در اجرا\nپرده نقش مهمی در نور، حریم و ظاهر فضا دارد. مسیر انتخاب مدل، اندازه‌گیری، آماده‌سازی و نصب را شفاف نگه می‌داریم تا نتیجه نهایی با انتظار شما هم‌خوان باشد.\n\n## سه اصل همکاری با ما\n1. **کیفیت قابل اتکا** — انتخاب پارچه مناسب و دوخت استاندارد.\n2. **طراحی متناسب با فضا** — نور، ابعاد پنجره و سبک دکوراسیون را در نظر می‌گیریم.\n3. **اجرای منظم** — از اندازه‌گیری تا نصب، طبق زمان‌بندی توافق‌شده پیش می‌رود.\n\n## مسیر همکاری (چهار گام)\n1. مشاوره و بازدید\n2. انتخاب پارچه و مدل\n3. آماده‌سازی\n4. نصب و تحویل\n\n[درخواست مشاوره →](" + BASE + "/contact)\n",

    "/contact": "# تماس با ما\n\n## گفت‌وگو را آغاز کنیم\nبرای مشاوره، بازدید حضوری از شوروم یا سفارش طراحی اختصاصی با ما در تماس باشید.\n\n## اطلاعات تماس\n- **نشانی شوروم:** تهران، نمایشگاه دائمی پرده\n- **ساعات کاری:** شنبه تا پنجشنبه، ۹ تا ۱۸\n\n[درخواست مشاوره ثبت کنید](" + BASE + "/contact)\n",

    "/connect": "# اتصال سرور MCP\n\nبا افزودن آدرس سرور MCP این سایت به کلاینت‌هایی مانند Claude، ChatGPT یا Cursor می‌توانید داده‌های عمومی کاتالوگ و نمونه‌کارها را در همان محیط جستجو کنید.\n\n## آدرس سرور MCP\n\n\\`" + BASE + "/api/mcp\\`\n\nدسترسی عمومی و فقط‌خواندنی است؛ ورود لازم نیست.\n",

    "/projects": "# نمونه‌های اجرا شده\n\nنگاهی به پروژه‌های نصب‌شده در فضاهای مسکونی و اداری.\n\n[مشاهده کاتالوگ مدل‌ها →](" + BASE + "/catalog)\n",

    "/catalog": "# کاتالوگ پرده\n\n## مدل‌ها و نمای نصب\nدسته‌ها را مرور کنید، مدل مورد نظر را انتخاب کنید و کد، رنگ و نمای نصب را ببینید.\n",

    "/shop": "# فروشگاه اکسسوری\n\n## محصولات\nمحصولات فروشگاه — از یراق و اکسسوری تا مدل‌های آماده.\n",
  };
  return pages[path] ?? null;
}

/** Build a markdown representation of a public page path. Returns null for non-page routes. */
export async function pageMarkdown(path: string): Promise<string | null> {
  // Static informational pages
  const staticMd = staticMarkdown(path);
  if (staticMd) return staticMd;

  // Dynamic: product detail → /product/:slug
  const productMatch = path.match(/^\/product\/(.+)$/);
  if (productMatch) {
    const slug = decodeURIComponent(productMatch[1]);
    const row = await prisma.product
      .findUnique({
        where: { slug },
        select: { name: true, description: true, price: true, currency: true },
      })
      .catch(() => null);
    if (row) {
      return (
        "# " +
        md(row.name) +
        "\n\n" +
        (row.description || "") +
        "\n\nقیمت: " +
        Number(row.price || 0).toLocaleString("fa-IR") +
        " " +
        row.currency +
        "\n\n[مشاهده محصول](" +
        BASE +
        "/product/" +
        encodeURIComponent(slug) +
        ")\n"
      );
    }
    return null;
  }

  // Dynamic: curtain model detail → /curtain/:id
  const curtainMatch = path.match(/^\/curtain\/(.+)$/);
  if (curtainMatch) {
    const id = curtainMatch[1];
    const row = await prisma.curtainModel
      .findUnique({
        where: { id },
        select: {
          code: true,
          name: true,
          categorySlug: true,
          description: true,
          fabric: true,
          color: true,
          material: true,
        },
      })
      .catch(() => null);
    if (row) {
      return (
        "# مدل پرده: " +
        md(row.name) +
        "\n\nکد: \\`" +
        md(row.code) +
        "\\`\nدسته: " +
        md(row.categorySlug) +
        "\n" +
        (row.fabric ? "بافت: " + md(row.fabric) + "\n" : "") +
        (row.color ? "رنگ: " + md(row.color) + "\n" : "") +
        (row.material ? "ماده: " + md(row.material) + "\n" : "") +
        (row.description ? "\n" + md(row.description) + "\n" : "") +
        "\n[مشاهده مدل](" +
        BASE +
        "/curtain/" +
        id +
        ")\n"
      );
    }
    return null;
  }

  // Dynamic: portfolio category → /projects/category/:slug
  const catMatch = path.match(/^\/projects\/category\/([^/]+)(\/(.+))?$/);
  if (catMatch) {
    const slug = decodeURIComponent(catMatch[1]);
    const row = await prisma.portfolioCategory
      .findUnique({ where: { slug }, select: { name: true, description: true } })
      .catch(() => null);
    if (row) {
      return (
        "# دسته پروژه: " +
        md(row.name) +
        "\n\n" +
        (row.description || "") +
        "\n\n[مشاهده پروژه‌ها](" +
        BASE +
        "/projects/category/" +
        encodeURIComponent(slug) +
        ")\n"
      );
    }
    return null;
  }

  // Dynamic: project detail → /projects/:id (only when not a category slug above)
  const projMatch = path.match(/^\/projects\/(.+)$/);
  if (projMatch && !projMatch[1].startsWith("category/")) {
    const id = projMatch[1];
    const row = await prisma.project
      .findUnique({
        where: { id },
        select: { title: true, description: true, categorySlug: true },
      })
      .catch(() => null);
    if (row) {
      return (
        "# پروژه: " +
        md(row.title) +
        "\n\nدسته: " +
        md(row.categorySlug || "-") +
        "\n" +
        (row.description ? "\n" + md(row.description) + "\n" : "") +
        "\n[مشاهده پروژه](" +
        BASE +
        "/projects/" +
        id +
        ")\n"
      );
    }
    return null;
  }

  return null;
}
