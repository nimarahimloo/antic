import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

/**
 * VirtualWindow — صحنهٔ واقعی پنجره + اجرای «اختصاصی» هر سبک پرده مطابق فرم نصب واقعی:
 *
 * پلیسه دستی   → فقط داخل باکس شیشه (inside) نصب می‌شود
 * پلیسه زنجیری → بیرون فرم نصب + زنجیر مکانیزم در کنار
 * رومن         → طبقاتی جمع می‌شود و لایه‌لایه روی هم در بالا می‌نشیند
 * شید          → یک پارچهٔ صاف که با زنجیر بالا/پایین می‌رود (بیرون فرم)
 * دبل شید      → دو لایه: پارچهٔ زمینه + پارچهٔ رویهٔ آستر، هر دو بیرون فرم
 * کرکره (فلزی/چوبی) → بیرون فرم نصب، با لایه‌های عرضی
 * زبرا         → داخل فرم با کاست، نوار شفاف/مات
 * ترک پنل      → پنل‌های عمودی داخل فرم
 * اورسی        → موج‌های گشاد روی میله + حاشیهٔ طلایی
 * پارچه‌های کلاسیک → چین‌های عمودی نرم روی میله
 *
 * کل صحنه (رنگ دیوار، چهارچوب، میله، چشم‌انداز) از پنل مدیر قابل مدیریت است.
 */

// استایل بر اساس دسته + زیردسته (سبک هر دسته با زیردسته‌اش تعیین می‌شود)
function resolveStyle(fabric) {
  const cat = fabric?.category_slug;
  const sub = fabric?.subcategory;
  if (cat === "pleated") return sub === "chain" ? "pleated-chain" : "pleated-manual";
  if (cat === "pleated-mesh") return "pleated-manual";
  const map = {
    roman: "roman",
    shade: "shade",
    "double-shade": "double",
    roller: "roller",
    zebra: "zebra",
    printed: "drape",
    aurora: "wave",
    "turk-panel": "panel",
    cubism: "drape",
    sheer: "drape",
    silk: "drape",
    velvet: "drape",
    cotton: "drape",
    outdoor: "shade",
    motorized: "shade",
    accessories: "shade",
  };
  return map[cat] || "drape";
}

// پیکربندی هر سبک: فرم نصب، چین‌ها و جزئیات مکانیزم
const STYLE_CFG = {
  // پردهٔ کلاسیک — روی میله، چین‌های عمودی نرم
  drape: {
    mount: "rod",
    fold: "repeating-linear-gradient(90deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.10) 14px, rgba(0,0,0,0) 34px, rgba(255,255,255,0.09) 52px, rgba(255,255,255,0) 72px)",
  },
  // اورسی — موج‌های گشاد + حاشیهٔ طلایی پایین
  wave: {
    mount: "rod",
    fold: "repeating-linear-gradient(90deg, rgba(0,0,0,0.20) 0px, rgba(0,0,0,0.04) 40px, rgba(255,255,255,0.12) 90px, rgba(255,255,255,0) 130px)",
    hem: true,
  },
  // ترک پنل — پنل‌های عمودی داخل فرم
  panel: {
    mount: "inside",
    cassette: true,
    fold: "repeating-linear-gradient(90deg, transparent 0px, transparent calc(25% - 5px), rgba(0,0,0,0.50) calc(25% - 5px), rgba(0,0,0,0.50) calc(25% + 5px), transparent calc(25% + 5px))",
    bar: true,
  },
  // رومن — طبقاتی جمع‌شده در بالا
  roman: {
    mount: "inside",
    cassette: true,
    bodyBottom: "17%", // کمی بالا رفته تا شیشه از پایین پیدا باشد
    fold: "repeating-linear-gradient(180deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0) 12px, rgba(255,255,255,0.10) 16px, rgba(255,255,255,0) 24px)",
    stackTop: true,
  },
  // زبرا — داخل فرم، نوارهای شفاف/مات
  zebra: {
    mount: "inside",
    cassette: true,
    fold: "repeating-linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 14px, transparent 14px, transparent 34px)",
    bar: true,
  },
  // پلیسه دستی — فقط داخل باکس شیشه
  "pleated-manual": {
    mount: "inside",
    cassette: true,
    fold: "repeating-linear-gradient(180deg, rgba(0,0,0,0.30) 0px, rgba(0,0,0,0) 5px, rgba(255,255,255,0.20) 9px, rgba(255,255,255,0) 14px)",
  },
  // پلیسه زنجیری — بیرون فرم + زنجیر مکانیزم
  "pleated-chain": {
    mount: "box",
    fold: "repeating-linear-gradient(180deg, rgba(0,0,0,0.30) 0px, rgba(0,0,0,0) 5px, rgba(255,255,255,0.20) 9px, rgba(255,255,255,0) 14px)",
    chain: true,
  },
  // شید — یک پارچهٔ صاف، بیرون فرم، با زنجیر
  shade: {
    mount: "box",
    fold: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 20%)",
    bar: true,
    chain: true,
  },
  // دبل شید — دو پارچه: زمینه + رویهٔ آستر، بیرون فرم، با زنجیر
  double: {
    mount: "box",
    double: true,
    fold: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 20%)",
    bar: true,
    chain: true,
  },
  // کرکره (فلزی/چوبی) — بیرون فرم، لایه‌های عرضی
  roller: {
    mount: "box",
    fold: "repeating-linear-gradient(180deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 4px, rgba(0,0,0,0.28) 5px, rgba(0,0,0,0.28) 11px)",
    bar: true,
  },
};

const DEFAULT_SETTINGS = {
  wall_color: "#75634f",
  frame_color: "#3b352c",
  rail_color: "#C9A227",
  view_image: "",
};

// روشن‌سازی (amt مثبت) یا تیره‌سازی (amt منفی) رنگ برای جزئیات سه‌بعدی
function shade(hex, amt) {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return "#3b352c";
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const nums = h.match(/../g).map((x) => parseInt(x, 16));
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return (
    "#" +
    nums.map((v) => Math.round((t - v) * p + v).toString(16).padStart(2, "0")).join("")
  );
}

export default function VirtualWindow({ fabric, settings: override }) {
  const [dbSettings, setDbSettings] = useState(null);

  useEffect(() => {
    base44.entities.VirtualWindowSetting
      .list("-created_date", 1)
      .then((data) => setDbSettings(data?.[0] || null))
      .catch(() => setDbSettings(null));
  }, []);

  const s = { ...DEFAULT_SETTINGS, ...(override || dbSettings || {}) };
  const hasFabric = !!fabric;
  const style = resolveStyle(fabric);
  const cfg = STYLE_CFG[style];

  const rodGradient = `linear-gradient(180deg, ${shade(s.rail_color, 0.45)}, ${s.rail_color} 45%, ${shade(s.rail_color, -0.4)})`;
  const isRod = cfg.mount === "rod";
  const isInside = cfg.mount === "inside";
  const isBox = cfg.mount === "box";

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-secondary/60 lg:aspect-[16/9]">
      {/* دیوار گچی + نور محیط */}
      <div className="absolute inset-0" style={{ backgroundColor: s.wall_color }} />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 28%, rgba(255,255,255,0.10), transparent 55%)" }}
      />
      {/* هالهٔ روزنِ پنجره روی دیوار */}
      <div
        className="absolute"
        style={{
          left: "6%", right: "6%", top: "4%", bottom: "9%",
          background: "radial-gradient(ellipse at center, rgba(255,222,150,0.16), transparent 62%)",
        }}
      />

      {/* پنجره — چهارچوب سه‌بعدی + شیشه و چشم‌انداز */}
      <div
        className="absolute overflow-hidden rounded-md"
        style={{
          left: "9%", right: "9%", top: "7%", bottom: "13%",
          border: `12px solid ${s.frame_color}`,
          backgroundColor: s.frame_color,
          boxShadow: `0 22px 55px rgba(0,0,0,0.55), inset 0 0 0 1px ${shade(s.frame_color, 0.25)}`,
        }}
      >
        {/* چشم‌انداز پشت شیشه (از پنل قابل تغییر) */}
        <div
          className="absolute inset-0"
          style={
            s.view_image
              ? { backgroundImage: `url("${s.view_image}")`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(180deg,#33465c 0%,#58718c 45%,#243447 100%)" }
          }
        />
        {/* درخشش خورشید در افق */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 30% 24%, rgba(255,236,180,0.30), transparent 55%)" }}
        />
        {/* قاب میانی (کرسی‌پنجره) */}
        <div className="absolute left-1/2 top-0 h-full w-[5px] -translate-x-1/2" style={{ backgroundColor: shade(s.frame_color, -0.15) }} />
        <div className="absolute left-0 top-1/2 h-[5px] w-full -translate-y-1/2" style={{ backgroundColor: shade(s.frame_color, -0.15) }} />
        {/* انعکاس و ته‌رنگ شیشه */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12)_0%,transparent_35%,transparent_70%,rgba(255,255,255,0.06)_100%)]" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: "rgba(160,190,215,0.05)", boxShadow: "inset 0 0 28px rgba(0,0,0,0.45)" }}
        />
      </div>

      {/* طاقچه (سِیل) زیر پنجره */}
      <div
        className="absolute rounded-[4px]"
        style={{
          left: "7.2%", right: "7.2%", top: "86.4%", height: "3.2%",
          background: `linear-gradient(180deg, ${shade(s.frame_color, 0.25)}, ${shade(s.frame_color, -0.15)})`,
          boxShadow: "0 7px 16px rgba(0,0,0,0.45)",
        }}
      />

      {/* قرنیز پایین دیوار */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "2.6%",
          backgroundColor: shade(s.wall_color, -0.55),
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      />

      {/* لایهٔ اعمال پرده — تنها بخش متحرک صحنه */}
      <AnimatePresence mode="wait">
        {hasFabric && (
          <motion.div
            key={fabric.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30"
          >
            {isRod && (
              <>
                {/* میلهٔ پرده با سرریل‌های طلایی */}
                <div
                  className="absolute rounded-full"
                  style={{ left: "6.5%", right: "6.5%", top: "4.9%", height: 8, background: rodGradient, boxShadow: "0 3px 6px rgba(0,0,0,0.45)" }}
                />
                <div className="absolute rounded-full" style={{ left: "5.4%", top: "4.3%", width: 17, height: 17, background: rodGradient, boxShadow: "0 2px 5px rgba(0,0,0,0.4)" }} />
                <div className="absolute rounded-full" style={{ right: "5.4%", top: "4.3%", width: 17, height: 17, background: rodGradient, boxShadow: "0 2px 5px rgba(0,0,0,0.4)" }} />

                {/* بدنهٔ پردهٔ کلاسیک — از میله تا پایین طاقچه */}
                <div className="absolute overflow-hidden" style={{ left: "7.5%", right: "7.5%", top: "6.1%", bottom: "9.5%" }}>
                  <FabricLayer fabric={fabric} cfg={cfg} />
                </div>
              </>
            )}

            {isBox && (
              <>
                {/* کاست بیرونی بالای فرم با لبهٔ طلایی */}
                <div
                  className="absolute overflow-hidden rounded-b-md"
                  style={{
                    left: "6.8%", right: "6.8%", top: "5.2%", height: "4.4%",
                    backgroundColor: shade(s.frame_color, -0.35),
                    boxShadow: "0 5px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                    borderBottom: `2px solid ${s.rail_color}`,
                  }}
                />

                {/* زنجیر مکانیزم در کنار */}
                {cfg.chain && (
                  <div
                    className="absolute z-10"
                    style={{
                      left: "6.1%", top: "9.6%", width: 4, height: "44%", borderRadius: 3,
                      background:
                        "repeating-linear-gradient(180deg, rgba(240,235,215,0.85) 0px, rgba(240,235,215,0.85) 3px, rgba(90,74,20,0.9) 5px, rgba(90,74,20,0.9) 7px)",
                      boxShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                    }}
                  />
                )}

                {cfg.double ? (
                  <>
                    {/* لایهٔ زمینهٔ دبل‌شید — پارچهٔ روشن‌تر پشت */}
                    <div className="absolute overflow-hidden" style={{ left: "7.3%", right: "7.3%", top: "9.6%", bottom: "9.5%" }}>
                      <FabricLayer fabric={fabric} cfg={cfg} back />
                    </div>
                    {/* لایهٔ رویهٔ آستر — کمی بالا رفته تا زمینه دیده شود */}
                    <div className="absolute overflow-hidden" style={{ left: "7.3%", right: "7.3%", top: "9.6%", bottom: "36%" }}>
                      <FabricLayer fabric={fabric} cfg={cfg} />
                    </div>
                  </>
                ) : (
                  <div className="absolute overflow-hidden" style={{ left: "7.3%", right: "7.3%", top: "9.6%", bottom: "9.5%" }}>
                    <FabricLayer fabric={fabric} cfg={cfg} />
                  </div>
                )}
              </>
            )}

            {isInside && (
              <>
                {/* کاست داخلی داخل فرم با لبهٔ طلایی */}
                {cfg.cassette && (
                  <div
                    className="absolute overflow-hidden rounded-b-md"
                    style={{
                      left: "10.2%", right: "10.2%", top: "8.2%", height: "3.9%",
                      backgroundColor: shade(s.frame_color, -0.35),
                      boxShadow: "0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                      borderBottom: `2px solid ${s.rail_color}`,
                    }}
                  />
                )}

                {/* بدنهٔ پرده — داخل چهارچوب */}
                <div className="absolute overflow-hidden" style={{ left: "10.2%", right: "10.2%", top: "12.1%", bottom: cfg.bodyBottom || "14.2%" }}>
                  <FabricLayer fabric={fabric} cfg={cfg} />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* سایهٔ داخلی صحنه */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]" />

      {/* حالت بدون انتخاب */}
      {!hasFabric && (
        <div className="absolute inset-0 z-40 flex items-center justify-center">
          <span className="rounded-full bg-background/70 px-5 py-2 font-body text-xs text-muted-foreground backdrop-blur-md">
            برای مشاهده روی پنجره، یک پارچه انتخاب کنید…
          </span>
        </div>
      )}
    </div>
  );
}

/** یک لایهٔ پارچه — بافت/رنگ دقیق مدل + چین‌ها و جزئیات مخصوص همان سبک */
function FabricLayer({ fabric, cfg, back }) {
  const base = fabric.image
    ? { backgroundImage: `url("${fabric.image}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: back ? shade(fabric.color_code || "#C9A227", 0.5) : fabric.color_code || "#C9A227" };

  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          ...base,
          ...(back && { filter: "brightness(1.3) saturate(0.85)", opacity: 0.88 }),
        }}
      >
        {/* چین‌ها / نوارها / لایه‌های عرضی بر اساس سبک */}
        <div
          className="absolute inset-0"
          style={{ backgroundImage: cfg.fold, ...(back && { opacity: 0.45 }) }}
        />

        {/* جمع‌شدگی طبقاتی رومن — لایه‌لایه روی هم در بالا */}
        {cfg.stackTop && (
          <div
            className="absolute inset-x-0 top-0 h-[38%]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, rgba(0,0,0,0.38) 0px, rgba(0,0,0,0.38) 3px, rgba(255,255,255,0.14) 7px, rgba(255,255,255,0) 13px)",
              boxShadow: "inset 0 -8px 16px rgba(0,0,0,0.35)",
            }}
          />
        )}

        {/* افت نور از بالا به پایین */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,transparent_30%,transparent_70%,rgba(0,0,0,0.40)_100%)]" />
        {/* سایهٔ کناره‌ها برای عمق پرسپکتیو */}
        <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/45 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/45 to-transparent" />
      </div>

      {/* ریل پایین پارچه */}
      {cfg.bar && !back && (
        <div className="absolute inset-x-0 bottom-0 h-[9px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
      )}
      {/* حاشیهٔ طلایی پایین — امضای پردهٔ اورسی */}
      {cfg.hem && (
        <div className="absolute inset-x-0 bottom-0 h-[7px] bg-[linear-gradient(90deg,#A67C00,#E8C547,#A67C00)] shadow-[0_-1px_6px_rgba(0,0,0,0.4)]" />
      )}
    </>
  );
}