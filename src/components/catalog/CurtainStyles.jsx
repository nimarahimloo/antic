/**
 * CurtainStyles — هستهٔ قدرتمند و هوشمند رندر پرده‌ها.
 *
 * هر سبک پرده با فرم دقیق و واقعیِ خود روی پنجره اجرا می‌شود.
 * تصویر پارچه به‌صورت «پوسته» اعمال می‌شود و چین‌ها/سایه‌های مخصوص هر سبک
 * با blend-mode روی آن می‌نشینند — طرح و رنگ دقیق پارچه حفظ می‌شود.
 *
 * تفاوت‌های کلیدی هر سبک (بر اساس نصب واقعی):
 *   شید      → کاملاً صاف و نرم، بدون چین، فقط لوله + ریل + زنجیر
 *   رومن     → چین‌های افقی نرم (دَول) + جمع‌شدگی پلکانی در بالا
 *   پلیسه    → چین‌های آکاردئونی تیز و ساختاریافته (بسیار متمایز از رومن)
 *   زبرا     → نوارهای متناوب جامد/شیر که روی هم می‌لغزند
 *   کرکره    → پره‌های افقی مثل کرکره (مثل بلایندز)
 *   ترک پنل  → پنل‌های عمودی مجزا با فاصله
 *   کلاسیک   → چین‌های عمودی نرم روی میله
 *   اورسی    → موج‌های گشاد + حاشیۀ طلایی
 *   دبل شید  → دو لایۀ صاف: زمینۀ نازک + رویۀ آستر
 */

import { makeSkin, hexToRgba } from "./curtainUtils";

// ─────────────────────────────────────────────
// شید — کاملاً صاف و نرم (بدون چین)
// نصب: بیرون فرم، لولۀ غلتک بالا، ریل پایین، زنجیر کناری
// ─────────────────────────────────────────────
function ShadeCurtain({ skin, back }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      {/* پوستۀ پارچه — کاملاً صاف */}
      <div
        className="absolute inset-0"
        style={{ ...skin, ...(back && { filter: "brightness(1.4) saturate(0.75)", opacity: 0.72 }) }}
      />

      {/* سایۀ غلتک بالا — منحنی و نازک */}
      <div
        className="absolute inset-x-0 top-0 h-14"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.16) 55%, transparent 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* عمق کناره‌ها — بسیار ملایم */}
      <div className="absolute inset-y-0 left-0 w-8" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.3), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-y-0 right-0 w-8" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.3), transparent)", mixBlendMode: "multiply" }} />

      {/* ریل پایین (hem bar) — میلۀ فلزی صاف */}
      {!back && (
        <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-[2px] bg-[linear-gradient(180deg,#4a4a4a,#1a1a1a)] shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// رومن — چین‌های افقی نرم (دَول) + جمع‌شدگی پلکانی در بالا
// نصب: داخل فرم، هدرریل بالا، چین‌های افقی نرم
// ─────────────────────────────────────────────
function RomanCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      {/* پوستۀ پارچه */}
      <div className="absolute inset-0" style={skin} />

      {/* خطوط افقی نرم — محل دَول‌ها (هر ~۵۰px یک چین) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0px, transparent 46px, rgba(0,0,0,0.42) 46px, rgba(0,0,0,0.42) 49px, transparent 49px, transparent 92px)",
          mixBlendMode: "multiply",
        }}
      />
      {/* روشنایی نرم زیر هر خط چین */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0px, transparent 49px, rgba(255,255,255,0.28) 49px, rgba(255,255,255,0.28) 55px, transparent 55px, transparent 92px)",
          mixBlendMode: "overlay",
        }}
      />

      {/* جمع‌شدگی بالای پرده — پلکان‌های روی هم (۲۸٪ ارتفاع) */}
      <div
        className="absolute inset-x-0 top-0 h-[28%]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 5px, rgba(255,255,255,0.32) 11px, transparent 18px, rgba(0,0,0,0.28) 20px, transparent 26px)",
          mixBlendMode: "overlay",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[28%]"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }}
      />

      {/* عمق کناره‌ها */}
      <div className="absolute inset-y-0 left-0 w-10" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.42), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-y-0 right-0 w-10" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.42), transparent)", mixBlendMode: "multiply" }} />

      {/* لبهٔ پایین — حاشیۀ تمیز */}
      <div className="absolute inset-x-0 bottom-0 h-4" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.3))", mixBlendMode: "multiply" }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// پلیسه — چین‌های آکاردئونی تیز و ساختاریافته
// نصب: داخل فرم، هدرریل بالا، چین‌های تیزِ هر ~۱۶px
// بسیار متمایز از رومن: تیز‌تر، ریزتر، هندسی‌تر
// ─────────────────────────────────────────────
function PleatedCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0" style={skin} />

      {/* چین‌های آکاردئونی تیز — هر چین ~۱۶px */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(0,0,0,0.65) 0px, rgba(0,0,0,0.65) 2px, transparent 2px, transparent 5px, rgba(255,255,255,0.45) 5px, rgba(255,255,255,0.45) 7px, transparent 7px, transparent 14px, rgba(0,0,0,0.22) 14px, rgba(0,0,0,0.22) 16px)",
          mixBlendMode: "overlay",
        }}
      />

      {/* عمق کناره‌ها */}
      <div className="absolute inset-y-0 left-0 w-8" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-y-0 right-0 w-8" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />

      {/* سایه‌های بالا و پایین */}
      <div className="absolute inset-x-0 top-0 h-6" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-x-0 bottom-0 h-6" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.4))", mixBlendMode: "multiply" }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// زبرا — نوارهای متناوب جامد/شیر
// نصب: داخل/بیرون فرم، کاست بالا، نوارهای افقی متناوب
// ─────────────────────────────────────────────
function ZebraCurtain({ skin, hasImage, color }) {
  const BANDS = 9;
  const bandPct = 100 / BANDS;
  const solidPct = bandPct * 0.55;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      {/* لایۀ شیر (نازک) زیرین — نیمه‌شفاف */}
      <div
        className="absolute inset-0"
        style={hasImage ? { ...skin, opacity: 0.22 } : { backgroundColor: hexToRgba(color, 0.16) }}
      />

      {/* نوارهای جامد پارچه — هر نوار تصویر پارچه را کامل نشان می‌دهد */}
      {Array.from({ length: BANDS }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-x-0 overflow-hidden"
          style={{ top: `${i * bandPct + bandPct * 0.075}%`, height: `${solidPct}%`, ...skin }}
        >
          {/* سایۀ لبۀ بالای نوار */}
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55), transparent)", mixBlendMode: "multiply" }} />
          {/* سایۀ لبۀ پایین نوار */}
          <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.55), transparent)", mixBlendMode: "multiply" }} />
          {/* روشنایی مرکز نوار */}
          <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2" style={{ background: "rgba(255,255,255,0.15)", mixBlendMode: "overlay" }} />
        </div>
      ))}

      {/* ریل پایین */}
      <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
    </div>
  );
}

// ─────────────────────────────────────────────
// کرکره — پره‌های افقی مثل بلایندز
// نصب: بیرون فرم، باکس بالا، پره‌های افقی با عمق
// ─────────────────────────────────────────────
function RollerCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0" style={skin} />

      {/* پره‌های افقی — مثل کرکره (هر ~۲۴px) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.32) 0px, rgba(255,255,255,0.32) 2px, rgba(0,0,0,0.6) 3px, rgba(0,0,0,0.6) 11px, rgba(255,255,255,0.14) 12px, rgba(255,255,255,0.14) 24px)",
          mixBlendMode: "overlay",
        }}
      />

      {/* عمق کناره‌ها */}
      <div className="absolute inset-y-0 left-0 w-8" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-y-0 right-0 w-8" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />

      {/* سایۀ پایین */}
      <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.3))", mixBlendMode: "multiply" }} />

      {/* ریل پایین */}
      <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
    </div>
  );
}

// ─────────────────────────────────────────────
// ترک پنل — پنل‌های عمودی مجزا با فاصله
// نصب: سقف/دیوار، ریل بالا، پنل‌های عمودی متحرک
// ─────────────────────────────────────────────
function PanelCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 overflow-hidden"
          style={{
            left: `${i * 33.34}%`,
            width: "33.33%",
            ...skin,
            borderLeft: i > 0 ? "3px solid rgba(0,0,0,0.5)" : undefined,
          }}
        >
          {/* چین عمودی نرم داخل هر پنل */}
          <div
            className="absolute inset-0"
            style={{
              background: "repeating-linear-gradient(90deg, rgba(0,0,0,0.22) 0px, transparent 12px, rgba(255,255,255,0.14) 24px, transparent 36px)",
              mixBlendMode: "overlay",
            }}
          />
          {/* عمق لبه‌های هر پنل */}
          <div className="absolute inset-y-0 left-0 w-5" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.4), transparent)", mixBlendMode: "multiply" }} />
          <div className="absolute inset-y-0 right-0 w-5" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.4), transparent)", mixBlendMode: "multiply" }} />
        </div>
      ))}
      {/* ریل پایین */}
      <div className="absolute inset-x-0 bottom-0 h-[9px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
    </div>
  );
}

// ─────────────────────────────────────────────
// کلاسیک / اورسی / چاپی / تور / حریر / مخمل / کتان — چین‌های عمودی نرم
// نصب: روی میله، چین‌های عمودی نرم
// ─────────────────────────────────────────────
function DrapeCurtain({ skin, cfg, back }) {
  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ isolation: "isolate", ...skin, ...(back && { filter: "brightness(1.35) saturate(0.8)", opacity: 0.88 }) }}
      >
        {/* چین‌های عمودی برای کلاسیک/اورسی */}
        {cfg.fold && (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: cfg.fold, mixBlendMode: "overlay", ...(back && { opacity: 0.45 }) }}
          />
        )}
        {/* افت نور کلی */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.35) 100%)",
            mixBlendMode: "multiply",
          }}
        />
        {/* عمق کناره‌ها */}
        <div className="absolute inset-y-0 left-0 w-10" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.45), transparent)", mixBlendMode: "multiply" }} />
        <div className="absolute inset-y-0 right-0 w-10" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.45), transparent)", mixBlendMode: "multiply" }} />
      </div>
      {/* ریل پایین */}
      {cfg.bar && !back && (
        <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
      )}
      {/* حاشیۀ طلایی — امضای اورسی */}
      {cfg.hem && (
        <div className="absolute inset-x-0 bottom-0 h-[8px] bg-[linear-gradient(90deg,#A67C00,#E8C547,#A67C00)] shadow-[0_-1px_6px_rgba(0,0,0,0.4)]" />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// هستهٔ هوشمند — تصمیم می‌گیرد هر پرده چطور روی پنجره اجرا شود
// ─────────────────────────────────────────────
export function renderCurtain({ fabric, style, cfg, back }) {
  const skin = makeSkin(fabric, back);
  const hasImage = !!fabric?.image;
  const color = fabric?.color_code || "#C9A227";
  const props = { skin, hasImage, color, cfg, back };

  // زبرا — نوارهای متناوب
  if (cfg.zebra) return <ZebraCurtain {...props} />;

  // رومن — چین‌های پلکانی
  if (style === "roman") return <RomanCurtain {...props} />;

  // پلیسه — آکاردئونی
  if (cfg.pleated) return <PleatedCurtain {...props} />;

  // کرکره — پره‌های افقی
  if (cfg.roller) return <RollerCurtain {...props} />;

  // ترک پنل — پنل‌های عمودی
  if (cfg.panels) return <PanelCurtain {...props} />;

  // دبل شید — دو لایۀ صاف (شید)
  if (cfg.double) return <ShadeCurtain {...props} />;

  // شید — کاملاً صاف
  if (style === "shade") return <ShadeCurtain {...props} />;

  // کلاسیک / اورسی / چاپی / تور / حریر / مخمل / کتان — چین‌های عمودی
  return <DrapeCurtain {...props} />;
}