/**
 * CurtainStyles — هستهٔ قدرتمند و هوشمند رندر پرده‌ها.
 *
 * هر سبک پرده با فرم دقیق و واقعیِ خود روی پنجره اجرا می‌شود:
 *   رومن     → چین‌های پلکانی افقی نرم + جمع‌شدگی بالا
 *   شید      → پارچۀ صاف روی غلتک + سایۀ لوله + ریل پایین
 *   دبل شید  → دو لایه: زمینۀ نازک + رویۀ آستر
 *   پلیسه    → چین‌های آکاردئونی تیز و منظم (لانه زنبوری)
 *   کرکره    → پره‌های افقی با عمق فلزی/چوبی
 *   زبرا     → نوارهای متناوب جامد/شیر که روی هم می‌لغزند
 *   ترک پنل  → پنل‌های عمودی متحرک روی ریل
 *   اورسی    → موج‌های گشاد + حاشیۀ طلایی
 *   کلاسیک   → چین‌های عمودی نرم روی میله
 *
 * تصویر پارچه به‌صورت «پوسته» اعمال می‌شود و چین‌ها/سایه‌های مخصوص هر سبک
 * با blend-mode (multiply / overlay) روی آن می‌نشینند — طرح و رنگ دقیق پارچه
 * حفظ می‌شود ولی فرم سه‌بعدی پرده کاملاً دیده می‌شود.
 */

import { makeSkin, hexToRgba } from "./curtainUtils";

// ─────────────────────────────────────────────
// رومن — چین‌های پلکانی افقی نرم + جمع‌شدگی بالا
// ─────────────────────────────────────────────
function RomanCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      {/* پوستۀ پارچه */}
      <div className="absolute inset-0" style={skin} />

      {/* خطوط افقی نرم — محل دَول‌ها (هر ~۵۰px یک چین) */}
      <div className="absolute inset-0" style={{
        backgroundImage: "repeating-linear-gradient(180deg, transparent 0px, transparent 48px, rgba(0,0,0,0.38) 48px, rgba(0,0,0,0.38) 51px, transparent 51px, transparent 96px)",
        mixBlendMode: "multiply",
      }} />
      {/* روشنایی نرم زیر هر خط چین */}
      <div className="absolute inset-0" style={{
        backgroundImage: "repeating-linear-gradient(180deg, transparent 0px, transparent 51px, rgba(255,255,255,0.22) 51px, rgba(255,255,255,0.22) 56px, transparent 56px, transparent 96px)",
        mixBlendMode: "overlay",
      }} />

      {/* جمع‌شدگی بالای پرده — پلکان‌های روی هم */}
      <div className="absolute inset-x-0 top-0 h-[28%]" style={{
        backgroundImage: "repeating-linear-gradient(180deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 4px, rgba(255,255,255,0.28) 8px, transparent 14px, rgba(0,0,0,0.22) 16px, transparent 22px)",
        mixBlendMode: "overlay",
      }} />
      <div className="absolute inset-x-0 top-0 h-[28%]" style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.4), transparent)",
        mixBlendMode: "multiply",
      }} />

      {/* عمق کناره‌ها */}
      <div className="absolute inset-y-0 left-0 w-10" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.42), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-y-0 right-0 w-10" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.42), transparent)", mixBlendMode: "multiply" }} />

      {/* لبهٔ پایین — حاشیۀ تمیز */}
      <div className="absolute inset-x-0 bottom-0 h-4" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.3))", mixBlendMode: "multiply" }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// زبرا — نوارهای متناوب جامد/شیر
// ─────────────────────────────────────────────
function ZebraCurtain({ skin, hasImage, color }) {
  const BANDS = 8;
  const bandPct = 100 / BANDS;
  const solidPct = bandPct * 0.55;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      {/* لایۀ شیر (نازک) زیرین — نیمه‌شفاف */}
      <div className="absolute inset-0" style={hasImage ? { ...skin, opacity: 0.2 } : { backgroundColor: hexToRgba(color, 0.14) }} />

      {/* نوارهای جامد پارچه — هر نوار تصویر پارچه را کامل نشان می‌دهد */}
      {Array.from({ length: BANDS }).map((_, i) => (
        <div key={i} className="absolute inset-x-0 overflow-hidden" style={{ top: `${i * bandPct + bandPct * 0.075}%`, height: `${solidPct}%`, ...skin }}>
          {/* سایۀ لبۀ بالای نوار */}
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />
          {/* سایۀ لبۀ پایین نوار */}
          <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />
          {/* روشنایی مرکز نوار */}
          <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2" style={{ background: "rgba(255,255,255,0.12)", mixBlendMode: "overlay" }} />
        </div>
      ))}

      {/* ریل پایین */}
      <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
    </div>
  );
}

// ─────────────────────────────────────────────
// پلیسه — چین‌های آکاردئونی تیز (لانه زنبوری)
// ─────────────────────────────────────────────
function PleatedCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0" style={skin} />

      {/* چین‌های آکاردئونی تیز — هر چین ~۱۶px: سایه + روشنایی + سایۀ ثانویه */}
      <div className="absolute inset-0" style={{
        backgroundImage: "repeating-linear-gradient(180deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 2px, transparent 2px, transparent 5px, rgba(255,255,255,0.38) 5px, rgba(255,255,255,0.38) 7px, transparent 7px, transparent 14px, rgba(0,0,0,0.18) 14px, rgba(0,0,0,0.18) 16px)",
        mixBlendMode: "overlay",
      }} />

      {/* عمق کناره‌ها */}
      <div className="absolute inset-y-0 left-0 w-8" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-y-0 right-0 w-8" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />

      {/* سایه‌های بالا و پایین */}
      <div className="absolute inset-x-0 top-0 h-6" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-x-0 bottom-0 h-6" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.35))", mixBlendMode: "multiply" }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// کرکره (رولر) — پره‌های افقی با عمق فلزی/چوبی
// ─────────────────────────────────────────────
function RollerCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0" style={skin} />

      {/* پره‌های افقی — خط روشنایی + سایه + فاصله */}
      <div className="absolute inset-0" style={{
        backgroundImage: "repeating-linear-gradient(180deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 2px, rgba(0,0,0,0.5) 3px, rgba(0,0,0,0.5) 10px, rgba(255,255,255,0.1) 11px, rgba(255,255,255,0.1) 24px)",
        mixBlendMode: "overlay",
      }} />

      {/* عمق کناره‌ها */}
      <div className="absolute inset-y-0 left-0 w-8" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-y-0 right-0 w-8" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.5), transparent)", mixBlendMode: "multiply" }} />

      {/* سایۀ پایین */}
      <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.3))", mixBlendMode: "multiply" }} />

      {/* ریل پایین */}
      <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
    </div>
  );
}

// ─────────────────────────────────────────────
// ترک پنل — پنل‌های عمودی متحرک روی ریل
// ─────────────────────────────────────────────
function PanelCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute top-0 bottom-0 overflow-hidden" style={{ left: `${i * 33.34}%`, width: "33.33%", ...skin, borderLeft: i > 0 ? "3px solid rgba(0,0,0,0.5)" : undefined }}>
          {/* چین عمودی نرم داخل هر پنل */}
          <div className="absolute inset-0" style={{
            background: "repeating-linear-gradient(90deg, rgba(0,0,0,0.22) 0px, transparent 12px, rgba(255,255,255,0.14) 24px, transparent 36px)",
            mixBlendMode: "overlay",
          }} />
          {/* عمق لبه‌های هر پنل */}
          <div className="absolute inset-y-0 left-0 w-5" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.4), transparent)", mixBlendMode: "multiply" }} />
          <div className="absolute inset-y-0 right-0 w-5" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.4), transparent)", mixBlendMode: "multiply" }} />
        </div>
      ))}
      {/* ریل پایین */}
      <div className="absolute inset-x-0 bottom-0 h-[9px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
    </div>
  );
}

// ─────────────────────────────────────────────
// شید — پارچۀ صاف روی غلتک + سایۀ لوله
// ─────────────────────────────────────────────
function ShadeCurtain({ skin }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0" style={skin} />

      {/* سایۀ غلتک بالا — منحنی و نازک */}
      <div className="absolute inset-x-0 top-0 h-20" style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.14) 50%, transparent 100%)",
        mixBlendMode: "multiply",
      }} />

      {/* عمق کناره‌ها */}
      <div className="absolute inset-y-0 left-0 w-10" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.35), transparent)", mixBlendMode: "multiply" }} />
      <div className="absolute inset-y-0 right-0 w-10" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.35), transparent)", mixBlendMode: "multiply" }} />

      {/* سایۀ پایین */}
      <div className="absolute inset-x-0 bottom-0 h-12" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.25))", mixBlendMode: "multiply" }} />

      {/* ریل پایین (hem bar) */}
      <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
    </div>
  );
}

// ─────────────────────────────────────────────
// کلاسیک / اورسی / چاپی / تور / حریر / مخمل / کتان — چین‌های عمودی نرم
// ─────────────────────────────────────────────
function DrapeCurtain({ skin, cfg, back }) {
  return (
    <>
      <div className="absolute inset-0 overflow-hidden" style={{ isolation: "isolate", ...skin, ...(back && { filter: "brightness(1.35) saturate(0.8)", opacity: 0.88 }) }}>
        {/* چین‌های عمودی برای کلاسیک/اورسی */}
        {cfg.fold && (
          <div className="absolute inset-0" style={{ backgroundImage: cfg.fold, mixBlendMode: "overlay", ...(back && { opacity: 0.45 }) }} />
        )}
        {/* شید: سایۀ نرم بالا از غلتک */}
        {!cfg.fold && (
          <div className="absolute inset-x-0 top-0 h-16" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35), transparent)", mixBlendMode: "multiply" }} />
        )}
        {/* افت نور کلی */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.35) 100%)",
          mixBlendMode: "multiply",
        }} />
        {/* عمق کناره‌ها */}
        <div className="absolute inset-y-0 left-0 w-10" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.45), transparent)", mixBlendMode: "multiply" }} />
        <div className="absolute inset-y-0 right-0 w-10" style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.45), transparent)", mixBlendMode: "multiply" }} />
      </div>
      {/* ریل پایین */}
      {cfg.bar && !back && (
        <div className="absolute inset-x-0 bottom-0 h-[10px] rounded-[2px] bg-[linear-gradient(180deg,#3a3a3a,#141414)] shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
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

  // شید — پارچۀ صاف روی غلتک (تک‌لایه، بدون چین عمودی)
  if (style === "shade" && !cfg.fold) return <ShadeCurtain {...props} />;

  // کلاسیک / اورسی / دبل شید / چاپی / تور / حریر / مخمل / کتان — چین‌های عمودی
  return <DrapeCurtain {...props} />;
}