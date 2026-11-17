import { STYLE_CFG, shade } from "@/components/catalog/windowStyles";

/**
 * CurtainOverlay — رندر CSS-based پرده روی عکس پنجره کاربر.
 * لایه‌ها: بافت پارچه → سایه‌های چین → نورپردازی → سایه لبه‌ها.
 * اگر fabricImage داده شود، بافت عکس پارچه به‌جای رنگ ساده اعمال می‌شود.
 */
export default function CurtainOverlay({
  style = "drape",
  color = "#C9A227",
  openness = 0.3,
  width = 80,
  height = 85,
  x = 10,
  y = 4,
  fabricImage = null,
}) {
  const cfg = STYLE_CFG[style] || STYLE_CFG.drape;
  const darkColor = shade(color, -0.25);
  const lightColor = shade(color, 0.15);

  const curtainHeight = 100 - openness * 35;
  const opacity = cfg.sheerAlpha || 1;
  const panelCount = cfg.panelCount || 1;

  // لایه‌های سایه چین — روی بافت پارچه اعمال می‌شوند
  const foldLayers = [];
  if (cfg.folds) {
    cfg.folds.forEach((f) => foldLayers.push(f.background));
  } else if (cfg.slats) {
    foldLayers.push(
      `repeating-linear-gradient(0deg, ${darkColor} 0px, ${darkColor} 2px, ${color} 2px, ${color} 18px, ${lightColor} 18px, ${lightColor} 20px)`
    );
  } else if (cfg.bands) {
    foldLayers.push(
      `repeating-linear-gradient(90deg, ${color} 0px, ${color} 30px, rgba(0,0,0,0.4) 30px, rgba(0,0,0,0.4) 60px)`
    );
  } else if (cfg.stack) {
    foldLayers.push(
      `repeating-linear-gradient(0deg, ${darkColor} 0px, ${darkColor} 4px, ${color} 4px, ${color} 40px, ${lightColor} 40px, ${lightColor} 44px)`
    );
  } else if (cfg.smooth) {
    foldLayers.push(
      `linear-gradient(90deg, ${shade(color, -0.15)} 0%, ${color} 30%, ${shade(color, 0.1)} 50%, ${color} 70%, ${shade(color, -0.15)} 100%)`
    );
  }

  // نورپردازی: گرادیان روشنایی از مرکز به لبه‌ها
  const lightingLayer =
    `linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.04) 8%, transparent 20%, transparent 80%, rgba(0,0,0,0.04) 92%, rgba(0,0,0,0.18) 100%)`;

  // سایه بالای پرده (زیر میله/کاست)
  const topShadow =
    `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.08) 8%, transparent 16%)`;

  // سایه پایین پرده (حاشیه)
  const bottomShadow =
    `linear-gradient(0deg, rgba(0,0,0,0.2) 0%, transparent 12%)`;

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
    >
      {/* میله / ریل بالا */}
      {cfg.mount === "rod" && (
        <div
          className="absolute -top-2 left-0 right-0 h-1.5 rounded-full"
          style={{ background: "linear-gradient(180deg, #E8C547, #A67C00)", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
        />
      )}
      {cfg.mount === "rod" && (
        <>
          <div className="absolute -top-3 right-0 h-3 w-3 rounded-full" style={{ background: "#A67C00" }} />
          <div className="absolute -top-3 left-0 h-3 w-3 rounded-full" style={{ background: "#A67C00" }} />
        </>
      )}

      {/* کاست بالا */}
      {cfg.cassette && (
        <div
          className="absolute -top-1 left-0 right-0 h-2 rounded-sm"
          style={{ background: shade(color, -0.4) }}
        />
      )}

      {/* بدنه پرده */}
      <div
        className="absolute inset-0 overflow-hidden rounded-b-md"
        style={{
          opacity,
          height: `${curtainHeight}%`,
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.3), 0 6px 20px rgba(0,0,0,0.25)",
          backgroundColor: color,
        }}
      >
        {/* لایه ۱: بافت پارچه (پایه) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: fabricImage ? `url("${fabricImage}")` : undefined,
            backgroundColor: color,
            backgroundSize: fabricImage ? (cfg.tile || "38% auto") : "100% 100%",
            backgroundRepeat: fabricImage ? "repeat" : "no-repeat",
            filter: fabricImage ? "brightness(0.95) contrast(1.05)" : "none",
          }}
        />

        {/* لایه ۲: سایه‌های چین و تاخوردگی */}
        {foldLayers.length > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: foldLayers.join(", "),
              backgroundSize: foldLayers.map(() => "100% 100%").join(", "),
              mixBlendMode: fabricImage ? "multiply" : "normal",
              opacity: fabricImage ? 0.55 : 0.7,
            }}
          />
        )}

        {/* لایه ۳: نورپردازی جانبی */}
        <div
          className="absolute inset-0"
          style={{ backgroundImage: lightingLayer, mixBlendMode: "soft-light" }}
        />

        {/* لایه ۴: سایه بالای پرده */}
        <div className="absolute inset-0" style={{ backgroundImage: topShadow }} />

        {/* لایه ۵: سایه پایین پرده */}
        <div className="absolute inset-x-0 bottom-0 h-1/4" style={{ backgroundImage: bottomShadow }} />

        {/* جداکننده پنل‌ها */}
        {panelCount > 1 &&
          [...Array(panelCount - 1)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${((i + 1) * 100) / panelCount}%`,
                background: "rgba(0,0,0,0.3)",
                boxShadow: "1px 0 3px rgba(0,0,0,0.2)",
              }}
            />
          ))}

        {/* حاشیه پایین */}
        {cfg.hem && (
          <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: shade(color, -0.1) }} />
        )}
      </div>

      {/* زنجیر کناری */}
      {cfg.chain && (
        <div
          className="absolute bottom-0 right-1 w-0.5 rounded"
          style={{ height: `${curtainHeight * 0.7}%`, background: "#C9A227", opacity: 0.6 }}
        />
      )}
    </div>
  );
}