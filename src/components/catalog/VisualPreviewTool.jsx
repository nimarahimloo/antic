import { useMemo, useState, useCallback } from "react";
import VirtualWindow from "@/components/catalog/VirtualWindow";
import { DEFAULT_SETTINGS } from "@/components/catalog/windowStyles";
import { RotateCcw } from "lucide-react";

const WALL_PRESETS = [
  { name: "سفید", color: "#F0EDE5" },
  { name: "کرم", color: "#E8DCC8" },
  { name: "بژ", color: "#D4C5A9" },
  { name: "طوسی روشن", color: "#BFBFBF" },
  { name: "طوسی تیره", color: "#6B6B6B" },
  { name: "آبی نفتی", color: "#4A6670" },
  { name: "سبز زیتونی", color: "#6B7B5A" },
  { name: "قهوه‌ای", color: "#A0826D" },
  { name: "مشکی", color: "#2A2A2A" },
];

const FRAME_PRESETS = [
  { name: "سفید", color: "#EDEDED" },
  { name: "چوب روشن", color: "#C4A777" },
  { name: "چوب تیره", color: "#6B4F35" },
  { name: "مشکی", color: "#2A2A2A" },
  { name: "طلایی", color: "#C9A227" },
  { name: "نقره‌ای", color: "#B8B8B8" },
  { name: "برنزی", color: "#8C6A3F" },
];

const RAIL_PRESETS = [
  { name: "طلایی", color: "#C9A227" },
  { name: "مشکی", color: "#2A2A2A" },
  { name: "نقره‌ای", color: "#B8B8B8" },
  { name: "برنزی", color: "#8C6A3F" },
  { name: "سفید", color: "#EDEDED" },
];

function ColorControl({ label, value, onChange, presets }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-muted-foreground">{label}</p>
        <span className="font-mono text-[10px] text-muted-foreground/70" dir="ltr">
          {value.toUpperCase()}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 flex-none cursor-pointer rounded-lg border border-secondary/60 bg-transparent p-0"
          aria-label={label}
        />
        <div className="flex flex-1 flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.color}
              type="button"
              onClick={() => onChange(p.color)}
              title={p.name}
              aria-label={`${label}: ${p.name}`}
              className={`h-7 w-7 rounded-lg border transition-all ${
                value.toLowerCase() === p.color.toLowerCase()
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-secondary/60 hover:border-primary/60"
              }`}
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VisualPreviewTool({ fabric }) {
  const [wallColor, setWallColor] = useState(DEFAULT_SETTINGS.wall_color);
  const [frameColor, setFrameColor] = useState(DEFAULT_SETTINGS.frame_color);
  const [railColor, setRailColor] = useState(DEFAULT_SETTINGS.rail_color);
  const [open, setOpen] = useState(0.3);

  const settings = useMemo(
    () => ({
      wall_color: wallColor,
      frame_color: frameColor,
      rail_color: railColor,
    }),
    [wallColor, frameColor, railColor]
  );

  const onOpenChange = useCallback((v) => setOpen(v), []);

  const reset = () => {
    setWallColor(DEFAULT_SETTINGS.wall_color);
    setFrameColor(DEFAULT_SETTINGS.frame_color);
    setRailColor(DEFAULT_SETTINGS.rail_color);
    setOpen(0.3);
  };

  const isZebra = fabric?.category_slug === "zebra";

  return (
    <div className="rounded-3xl border border-secondary/60 bg-card p-5 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow mb-2 block">پیش‌نمایش تعاملی</span>
          <h3 className="font-display text-lg font-bold text-foreground lg:text-xl">
            پرده را در <span className="text-gold-gradient">فضای خانه خود</span> ببینید
          </h3>
          <p className="mt-1.5 font-body text-xs leading-6 text-muted-foreground">
            روی پرده بکشید تا باز یا بالا شود؛ رنگ دیوار و چارچوب را تنظیم کنید.
          </p>
        </div>
        <button
          onClick={reset}
          className="flex flex-none items-center gap-1.5 rounded-full border border-secondary/60 px-3 py-2 font-body text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" /> پیش‌فرض
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5 lg:gap-6">
        <div className="lg:col-span-3">
          <VirtualWindow fabric={fabric} settings={settings} open={open} scale={0.7} onOpenChange={onOpenChange} />
          <div className="mt-4 rounded-xl border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <label className="font-body text-xs text-muted-foreground">
                {isZebra ? "بالا / پایین نوارها" : "میزان بازشدن / جمع شدن"}
              </label>
              <span className="font-mono text-[10px] text-primary" dir="ltr">
                {Math.round(open * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.9"
              step="0.01"
              value={open}
              onChange={(e) => setOpen(Number(e.target.value))}
              className="mt-3 block w-full accent-primary"
              aria-label="میزان بازشدن پرده"
            />
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <ColorControl label="رنگ دیوار" value={wallColor} onChange={setWallColor} presets={WALL_PRESETS} />
          <ColorControl
            label="رنگ چارچوب پنجره"
            value={frameColor}
            onChange={setFrameColor}
            presets={FRAME_PRESETS}
          />
          <ColorControl label="رنگ ریل و میله" value={railColor} onChange={setRailColor} presets={RAIL_PRESETS} />
        </div>
      </div>
    </div>
  );
}
