import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { shade } from "./curtainUtils";
import { renderCurtain } from "./CurtainStyles";

/**
 * VirtualWindow — صحنهٔ واقعی پنجره (عمودی و بلند) + اجرای اختصاصی هر سبک پرده.
 *
 * هر دسته با فرم نصب واقعی خود روی پنجره نمایش داده می‌شود:
 *   رومن     → داخل فرم، پلکانی با چین‌های افقی نرم
 *   شید      → بیرون فرم، غلتک بالا + پارچهٔ صاف + زنجیر
 *   دبل شید  → دو لایه: زمینهٔ نازک + رویهٔ آستر
 *   پلیسه    → داخل/بیرون فرم، چین‌های آکاردئونی تیز
 *   کرکره    → بیرون فرم، لایه‌های افقی (پره‌های فلزی/چوبی)
 *   زبرا     → داخل فرم، نوارهای متناوب شفاف/مات
 *   ترک پنل  → داخل فرم، پنل‌های عمودی متحرک
 *   اورسی    → روی میله، موج‌های گشاد + حاشیهٔ طلایی
 *   کلاسیک   → روی میله، چین‌های عمودی نرم
 */

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
    accessories: "drape",
  };
  return map[cat] || "drape";
}

const STYLE_CFG = {
  drape: {
    mount: "rod",
    fold: "repeating-linear-gradient(90deg, rgba(0,0,0,0.32) 0px, rgba(0,0,0,0.12) 18px, rgba(0,0,0,0) 42px, rgba(255,255,255,0.10) 62px, rgba(255,255,255,0) 86px)",
  },
  wave: {
    mount: "rod",
    fold: "repeating-linear-gradient(90deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.05) 48px, rgba(255,255,255,0.14) 106px, rgba(255,255,255,0) 156px)",
    hem: true,
  },
  panel: {
    mount: "inside",
    cassette: true,
    bar: true,
    panels: true,
  },
  roman: {
    mount: "inside",
    cassette: true,
    bodyBottom: "13%",
    stackTop: true,
  },
  zebra: {
    mount: "inside",
    cassette: true,
    bar: true,
    chain: true,
    zebra: true,
  },
  "pleated-manual": {
    mount: "inside",
    cassette: true,
    pleated: true,
  },
  "pleated-chain": {
    mount: "box",
    pleated: true,
    chain: true,
  },
  shade: {
    mount: "box",
    bar: true,
    chain: true,
  },
  double: {
    mount: "box",
    double: true,
    bar: true,
    chain: true,
  },
  roller: {
    mount: "box",
    bar: true,
    roller: true,
  },
};

const DEFAULT_SETTINGS = {
  wall_color: "#75634f",
  frame_color: "#3b352c",
  rail_color: "#C9A227",
  view_image: "",
};

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
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-secondary/60 sm:aspect-[4/5]">
      {/* دیوار گچی + نور محیط */}
      <div className="absolute inset-0" style={{ backgroundColor: s.wall_color }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 22%, rgba(255,255,255,0.10), transparent 58%)" }} />
      {/* هالهٔ نورِ پنجره روی دیوار */}
      <div
        className="absolute"
        style={{
          left: "5%", right: "5%", top: "3%", bottom: "8%",
          background: "radial-gradient(ellipse at center, rgba(255,222,150,0.18), transparent 64%)",
        }}
      />

      {/* پنجره — چهارچوب سه‌بعدی عمودی + شیشه و چشم‌انداز */}
      <div
        className="absolute overflow-hidden rounded-md"
        style={{
          left: "13%", right: "13%", top: "5%", bottom: "9%",
          border: `11px solid ${s.frame_color}`,
          backgroundColor: s.frame_color,
          boxShadow: `0 24px 60px rgba(0,0,0,0.55), inset 0 0 0 1px ${shade(s.frame_color, 0.25)}`,
        }}
      >
        {/* چشم‌انداز پشت شیشه */}
        <div
          className="absolute inset-0"
          style={
            s.view_image
              ? { backgroundImage: `url("${s.view_image}")`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(180deg,#3a4f66 0%,#6a8499 42%,#2a3a4d 100%)" }
          }
        />
        {/* درخشش خورشید */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 28% 18%, rgba(255,236,180,0.32), transparent 52%)" }} />
        {/* کرسی‌پنجره — تقسیم‌بندی واقعی */}
        <div className="absolute left-1/2 top-0 h-full w-[4px] -translate-x-1/2" style={{ backgroundColor: shade(s.frame_color, -0.12) }} />
        <div className="absolute left-0 top-1/2 h-[4px] w-full -translate-y-1/2" style={{ backgroundColor: shade(s.frame_color, -0.12) }} />
        {/* انعکاس شیشه */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.14)_0%,transparent_32%,transparent_68%,rgba(255,255,255,0.07)_100%)]" />
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: "rgba(160,190,215,0.05)", boxShadow: "inset 0 0 32px rgba(0,0,0,0.45)" }} />
      </div>

      {/* طاقچه (سِیل) زیر پنجره */}
      <div
        className="absolute rounded-[4px]"
        style={{
          left: "11%", right: "11%", top: "91%", height: "2.8%",
          background: `linear-gradient(180deg, ${shade(s.frame_color, 0.25)}, ${shade(s.frame_color, -0.15)})`,
          boxShadow: "0 7px 16px rgba(0,0,0,0.45)",
        }}
      />
      {/* قرنیز پایین دیوار */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: "2.4%", backgroundColor: shade(s.wall_color, -0.55), boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)" }} />

      {/* لایهٔ اعمال پرده */}
      <AnimatePresence mode="wait">
        {hasFabric && (
          <motion.div
            key={fabric.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30"
          >
            {isRod && (
              <>
                {/* میلهٔ پرده + سرریل‌های طلایی */}
                <div className="absolute rounded-full" style={{ left: "6%", right: "6%", top: "3.4%", height: 7, background: rodGradient, boxShadow: "0 3px 6px rgba(0,0,0,0.45)" }} />
                <div className="absolute rounded-full" style={{ left: "4.6%", top: "2.8%", width: 16, height: 16, background: rodGradient, boxShadow: "0 2px 5px rgba(0,0,0,0.4)" }} />
                <div className="absolute rounded-full" style={{ right: "4.6%", top: "2.8%", width: 16, height: 16, background: rodGradient, boxShadow: "0 2px 5px rgba(0,0,0,0.4)" }} />
                {/* بدنهٔ پرده */}
                <div className="absolute overflow-hidden" style={{ left: "7%", right: "7%", top: "4.6%", bottom: "10%" }}>
                  {renderCurtain({ fabric, cfg, style })}
                </div>
              </>
            )}

            {isBox && (
              <>
                {/* کاست بیرونی بالای فرم */}
                <div
                  className="absolute overflow-hidden rounded-b-md"
                  style={{
                    left: "7.5%", right: "7.5%", top: "3.8%", height: "4.2%",
                    backgroundColor: shade(s.frame_color, -0.35),
                    boxShadow: "0 5px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                    borderBottom: `2px solid ${s.rail_color}`,
                  }}
                />
                {/* زنجیر مکانیزم */}
                {cfg.chain && (
                  <div
                    className="absolute z-10"
                    style={{
                      left: "6.8%", top: "8%", width: 4, height: "42%", borderRadius: 3,
                      background: "repeating-linear-gradient(180deg, rgba(240,235,215,0.85) 0px, rgba(240,235,215,0.85) 3px, rgba(90,74,20,0.9) 5px, rgba(90,74,20,0.9) 7px)",
                      boxShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                    }}
                  />
                )}
                {cfg.double ? (
                  <>
                    <div className="absolute overflow-hidden" style={{ left: "8%", right: "8%", top: "8%", bottom: "10%" }}>
                      {renderCurtain({ fabric, cfg, style, back: true })}
                    </div>
                    <div className="absolute overflow-hidden" style={{ left: "8%", right: "8%", top: "8%", bottom: "38%" }}>
                      {renderCurtain({ fabric, cfg, style })}
                    </div>
                  </>
                ) : (
                  <div className="absolute overflow-hidden" style={{ left: "8%", right: "8%", top: "8%", bottom: "10%" }}>
                    {renderCurtain({ fabric, cfg, style })}
                  </div>
                )}
              </>
            )}

            {isInside && (
              <>
                {cfg.cassette && (
                  <div
                    className="absolute overflow-hidden rounded-b-md"
                    style={{
                      left: "14.5%", right: "14.5%", top: "6%", height: "3.6%",
                      backgroundColor: shade(s.frame_color, -0.35),
                      boxShadow: "0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                      borderBottom: `2px solid ${s.rail_color}`,
                    }}
                  />
                )}
                {cfg.chain && (
                  <div
                    className="absolute z-10"
                    style={{
                      left: "13.5%", top: "9.6%", width: 4, height: "38%", borderRadius: 3,
                      background: "repeating-linear-gradient(180deg, rgba(240,235,215,0.85) 0px, rgba(240,235,215,0.85) 3px, rgba(90,74,20,0.9) 5px, rgba(90,74,20,0.9) 7px)",
                      boxShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                    }}
                  />
                )}
                <div className="absolute overflow-hidden" style={{ left: "14.5%", right: "14.5%", top: "9.6%", bottom: cfg.bodyBottom || "11%" }}>
                  {renderCurtain({ fabric, cfg, style })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* سایهٔ داخلی صحنه */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]" />

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