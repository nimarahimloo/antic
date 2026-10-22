// منبع داده دسته‌بندی‌ها — برای افزودن دسته جدید، یک آبجکت اضافه کنید.
// برای افزودن زیردسته، به آرایه subcategories یک آبجکت اضافه کنید.

// ۱۰ دسته‌بندی اصلی نمایش‌داده‌شده در اسلایدر زیر هیرو
export const CATEGORIES = [
  {
    name: "رومن",
    slug: "roman",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/cf6b3783d_generated_image.png",
    order: 1,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
      { name: "بلک‌اوت", slug: "blackout" },
    ],
  },
  {
    name: "شید",
    slug: "shade",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/a47c8d6f2_generated_image.png",
    order: 2,
    subcategories: [
      { name: "بلک‌اوت", slug: "blackout" },
      { name: "اسکرین", slug: "screen" },
      { name: "هارمونی", slug: "harmony" },
      { name: "ساده", slug: "plain" },
    ],
  },
  {
    name: "دبل شید",
    slug: "double-shade",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/5e52b786a_generated_image.png",
    order: 3,
    subcategories: [
      { name: "روز/شب", slug: "day-night" },
      { name: "دو لایه", slug: "double-layer" },
    ],
  },
  {
    name: "پلیسه",
    slug: "pleated",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/a585df441_generated_image.png",
    order: 4,
    subcategories: [
      { name: "دستی", slug: "manual" },
      { name: "زنجیری", slug: "chain" },
    ],
  },
  {
    name: "کرکره‌ای",
    slug: "roller",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/1ceb84025_generated_image.png",
    order: 5,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "زبرا",
    slug: "zebra",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e69ba0d39_generated_image.png",
    order: 6,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "چاپی",
    slug: "printed",
    image: "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/54703cd90_generated_image.png",
    order: 7,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
      { name: "دیجیتال", slug: "digital" },
    ],
  },
  {
    name: "اورسی",
    slug: "aurora",
    image: "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/d6f6d9ef9_generated_image.png",
    order: 8,
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "دو لایه", slug: "double-layer" },
    ],
  },
  {
    name: "ترک پنل",
    slug: "turk-panel",
    image: "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/c6d00c248_generated_image.png",
    order: 9,
    subcategories: [
      { name: "افقی", slug: "horizontal" },
      { name: "عمودی", slug: "vertical" },
    ],
  },
  {
    name: "کوبیسم",
    slug: "cubism",
    image: "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/1ca0577bc_generated_image.png",
    order: 10,
    subcategories: [
      { name: "هندسی", slug: "geometric" },
      { name: "انتزاعی", slug: "abstract" },
    ],
  },
];

// مجموعه‌های ویژه — سکشن لوکس مجزا
export const PREMIUM_FEATURES = [
  {
    name: "پرده استخری",
    slug: "outdoor",
    image: "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/ab56b3eb8_generated_image.png",
    desc: "پرده‌های مقاوم و زیبا برای فضای باز، استخر و نما؛ پایدار در برابر آفتاب و رطوبت.",
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "کرکره‌ای", slug: "roller" },
    ],
  },
  {
    name: "پرده کنترلی",
    slug: "motorized",
    image: "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/675321637_generated_image.png",
    desc: "سیستم‌های موتوردار و هوشمند برای کنترل نور با یک لمس؛ شیک و بی‌صدا.",
    subcategories: [
      { name: "موتوردار", slug: "motor" },
      { name: "هوشمند", slug: "smart" },
    ],
  },
  {
    name: "اکسسوری",
    slug: "accessories",
    image: "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/0446284ac_generated_image.png",
    desc: "نیوار، حلقه و چوب پرده با طراحی طلایی؛ جزئیاتی که پرده را کامل می‌کند.",
    subcategories: [
      { name: "نیوار", slug: "tieback" },
      { name: "حلقه", slug: "ring" },
      { name: "چوب", slug: "rod" },
    ],
  },
  {
    name: "توری پلیسه",
    slug: "pleated-mesh",
    image: "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/74a24478c_generated_image.png",
    desc: "توری پلیسه با ساختار لانه زنبوری؛ ظرافت و نظم در کنار هم.",
    subcategories: [
      { name: "ثابت", slug: "fixed" },
      { name: "متحرک", slug: "movable" },
    ],
  },
];

// پارچه‌های فاخر — سکشن منحصربه‌فرد مجزا
export const FABRIC_COLLECTION = [
  {
    name: "تور",
    slug: "sheer",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/612f3961a_generated_image.png",
    desc: "بافت سبک و شفاف؛ نور را نرم می‌کند و فضا را دلباز نشان می‌دهد. انتخابی کلاسیک برای لایه رویین پرده.",
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "حریر",
    slug: "silk",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/dc534e002_generated_image.png",
    desc: "درخشش و نرمی حریر؛ لوکس‌ترین انتخاب برای فضاهای رسمی و پذیرایی‌های خاص.",
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "مخمل",
    slug: "velvet",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/4c8e23e61_generated_image.png",
    desc: "عمق رنگ و بافت مخمل؛ شکوه و گرمای بی‌نظیر برای پذیرایی و فضاهای رسمی.",
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
  {
    name: "کتان",
    slug: "cotton",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/882904d61_generated_image.png",
    desc: "زیبایی طبیعی کتان؛ هم‌خوان با سبک‌های مینیمال و کلاسیک، گزینه‌ای همه‌کاره.",
    subcategories: [
      { name: "ساده", slug: "plain" },
      { name: "طرح‌دار", slug: "patterned" },
    ],
  },
];

// همه دسته‌ها (برای کاتالوگ تعاملی)
export const ALL_CATEGORIES = [...CATEGORIES, ...PREMIUM_FEATURES, ...FABRIC_COLLECTION];