import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Upload, Save, Share2, ImageIcon, Loader2, X, SlidersHorizontal } from "lucide-react";
import CurtainOverlay from "@/components/studio/CurtainOverlay";
import { compositeDesign } from "@/lib/compositeDesign";
import { resolveStyle } from "@/components/catalog/windowStyles";
import { compressImage } from "@/lib/compressImage";

const STUDIO_STYLES = [
  { slug: "drape", name: "کلاسیک" },
  { slug: "roman", name: "رومن" },
  { slug: "roller", name: "کرکره‌ای" },
  { slug: "zebra", name: "زبرا" },
  { slug: "pleated-manual", name: "پلیسه" },
  { slug: "panel", name: "ترک پنل" },
  { slug: "wave", name: "اورسی" },
  { slug: "shade", name: "شید" },
];

const COLOR_PRESETS = [
  "#C9A227", "#8B4513", "#2A2A2A", "#6B4F35",
  "#4A6670", "#6B7B5A", "#B8B8B8", "#E8DCC8",
  "#8C6A3F", "#3B352C", "#D4C5A9", "#F0EDE5",
];

function motionLabel(style) {
  if (style === "zebra") return "بالا/پایین نوارها (زنجیر)";
  if (["shade", "double", "roman", "roller", "pleated-manual", "pleated-chain", "pleated-sheer"].includes(style))
    return "بالا / پایین کردن پرده";
  return "باز / بسته کردن پرده";
}

/**
 * فقط برای عکس پنجرهٔ مشتری — جایگزین پیش‌نمایش کاتالوگ نیست.
 */
export default function WindowCurtainStudio() {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("drape");
  const [color, setColor] = useState("#C9A227");
  const [openness, setOpenness] = useState(0.3);
  const [width, setWidth] = useState(82);
  const [height, setHeight] = useState(88);
  const [posX, setPosX] = useState(9);
  const [posY, setPosY] = useState(4);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    base44.entities.CurtainModel.list("-created_date", 48)
      .then((data) => setModels(Array.isArray(data) ? data : data?.items || []))
      .catch(() => setModels([]));
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSavedMsg(null);
    try {
      const compressed = await compressImage(file, { maxDim: 1280, quality: 0.82, maxBytes: 3_500_000 });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: compressed });
      setPhotoUrl(file_url);
    } catch {
      try {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        setPhotoUrl(file_url);
      } catch {
        setPhotoUrl(URL.createObjectURL(file));
        setSavedMsg({
          type: "error",
          text: "آپلود سرور ناموفق بود؛ پیش‌نمایش موقت محلی فعال شد.",
        });
        setTimeout(() => setSavedMsg(null), 5000);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    if (model.color_code) setColor(model.color_code);
    setSelectedStyle(resolveStyle(model));
  };

  const handleSave = async () => {
    if (!photoUrl) return;
    setSaving(true);
    try {
      const dataUrl = await compositeDesign(photoUrl, {
        style: selectedStyle,
        color,
        openness,
        width,
        height,
        x: posX,
        y: posY,
        fabricImage: selectedModel?.image || null,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `design-${Date.now()}.png`, { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });

      const title = selectedModel?.code
        ? `طرح ${selectedModel.code}`
        : `طرح پرده ${STUDIO_STYLES.find((s) => s.slug === selectedStyle)?.name || ""}`;

      await base44.entities.SavedDesign.create({
        title,
        image: file_url,
        curtain_style: selectedStyle,
        curtain_model_id: selectedModel?.id || "",
        curtain_model_code: selectedModel?.code || "",
        color,
      });

      setSavedMsg({ type: "success", text: "طرح شما در گالری ذخیره شد." });
    } catch {
      setSavedMsg({ type: "error", text: "ذخیره طرح ناموفق بود." });
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 4000);
    }
  };

  const handleShare = async () => {
    if (!photoUrl) return;
    try {
      const dataUrl = await compositeDesign(photoUrl, {
        style: selectedStyle,
        color,
        openness,
        width,
        height,
        x: posX,
        y: posY,
        fabricImage: selectedModel?.image || null,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "curtain-design.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "طرح پرده من — پرده آنتیک",
          text: "این طرح پرده را در پرده آنتیک طراحی کردم!",
        });
        return;
      }
    } catch {
      /* fallback */
    }

    try {
      const shareUrl = window.location.origin + "/#studio";
      if (navigator.share) {
        await navigator.share({ title: "طرح پرده من در پرده آنتیک", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setSavedMsg({ type: "success", text: "لینک در حافظه کپی شد." });
        setTimeout(() => setSavedMsg(null), 4000);
      }
    } catch {
      setSavedMsg({ type: "error", text: "اشتراک‌گذاری ناموفق بود." });
      setTimeout(() => setSavedMsg(null), 4000);
    }
  };

  const modelMode = !!selectedModel;

  return (
    <div className="rounded-3xl border border-secondary/60 bg-card p-4 lg:p-8">
      <div className="mb-5">
        <p className="mb-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 font-body text-[11px] leading-5 text-muted-foreground">
          <strong className="text-primary">توجه:</strong> اینجا برای آپلود عکس پنجرهٔ منزل شماست. برای دیدن
          مدل‌های کاتالوگ و نمونه نصب، از بخش بالای همین صفحه استفاده کنید.
        </p>
        <span className="eyebrow mb-2 block">استودیوی پنجره شخصی</span>
        <h3 className="font-display text-base font-bold text-foreground lg:text-xl">
          پرده را روی <span className="text-gold-gradient">عکس پنجره خودتان</span> ببینید
        </h3>
      </div>

      <div className="grid gap-5 lg:grid-cols-5 lg:gap-6">
        <div className="lg:col-span-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-background">
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  alt="پنجره شما"
                  className="absolute inset-0 h-full w-full object-cover"
                  crossOrigin="anonymous"
                />
                <CurtainOverlay
                  style={selectedStyle}
                  color={color}
                  openness={openness}
                  width={width}
                  height={height}
                  x={posX}
                  y={posY}
                  fabricImage={selectedModel?.image || null}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    setSelectedModel(null);
                  }}
                  className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-destructive"
                  aria-label="حذف عکس"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-secondary/30">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">
                        عکس پنجره منزل را آپلود کنید
                      </p>
                      <p className="mt-1 font-body text-xs text-muted-foreground">
                        JPG یا PNG — از دوربین گوشی هم می‌شود
                      </p>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {photoUrl && (
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={handleSave} disabled={saving} className="btn-gold flex-1 justify-center">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره در گالری
              </button>
              <button type="button" onClick={handleShare} className="btn-ghost-gold flex-1 justify-center">
                <Share2 className="h-4 w-4" />
                اشتراک‌گذاری
              </button>
            </div>
          )}

          {savedMsg && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-2 text-center text-xs font-bold ${
                savedMsg.type === "success" ? "text-primary" : "text-destructive"
              }`}
            >
              {savedMsg.text}
            </motion.p>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          {models.length > 0 && (
            <div>
              <p className="mb-2 font-body text-xs text-muted-foreground">انتخاب مدل از کاتالوگ (کد محصول)</p>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-secondary/60 bg-background/50 p-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {models.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => handleModelSelect(m)}
                      className={`rounded-lg border p-1.5 text-center transition-colors ${
                        selectedModel?.id === m.id
                          ? "border-primary bg-primary/10"
                          : "border-secondary/50 hover:border-primary/50"
                      }`}
                    >
                      {m.image ? (
                        <img src={m.image} alt={m.code} className="mb-1 h-10 w-full rounded object-cover" />
                      ) : (
                        <div className="mb-1 flex h-10 items-center justify-center rounded bg-secondary/40">
                          <ImageIcon className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="block font-body text-[9px] text-foreground">{m.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!modelMode && (
            <>
              <div>
                <p className="mb-2 font-body text-xs text-muted-foreground">سبک پرده</p>
                <div className="flex flex-wrap gap-1.5">
                  {STUDIO_STYLES.map((s) => (
                    <button
                      type="button"
                      key={s.slug}
                      onClick={() => setSelectedStyle(s.slug)}
                      className={`rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
                        selectedStyle === s.slug
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-secondary/60 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-body text-xs text-muted-foreground">رنگ پرده</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      title={c}
                      className={`h-7 w-7 rounded-lg border transition-all ${
                        color.toLowerCase() === c.toLowerCase()
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-secondary/60 hover:border-primary/60"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-7 w-9 cursor-pointer rounded-lg border border-secondary/60 bg-transparent p-0"
                    aria-label="رنگ دلخواه"
                  />
                </div>
              </div>
            </>
          )}

          <SliderControl
            label={motionLabel(selectedStyle)}
            value={Math.round(openness * 100)}
            suffix="%"
            min={0}
            max={90}
            onChange={(v) => setOpenness(v / 100)}
          />

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center gap-2 font-body text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            تنظیمات دقیق موقعیت
            <span className="mr-auto">{showAdvanced ? "▲" : "▼"}</span>
          </button>
          {showAdvanced && (
            <div className="space-y-3 rounded-xl border border-secondary/40 bg-background/30 p-3">
              <SliderControl label="عرض پرده" value={width} suffix="%" min={40} max={100} onChange={setWidth} />
              <SliderControl label="ارتفاع پرده" value={height} suffix="%" min={40} max={100} onChange={setHeight} />
              <SliderControl label="جابجایی افقی" value={posX} suffix="%" min={0} max={40} onChange={setPosX} />
              <SliderControl label="جابجایی عمودی" value={posY} suffix="%" min={0} max={30} onChange={setPosY} />
            </div>
          )}

          {modelMode && (
            <button
              type="button"
              onClick={() => {
                setSelectedModel(null);
                setSelectedStyle("drape");
                setColor("#C9A227");
              }}
              className="w-full rounded-lg border border-secondary/60 py-2 font-body text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              حذف انتخاب مدل — تنظیم دستی
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderControl({ label, value, suffix, min, max, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="font-body text-xs text-muted-foreground">{label}</label>
        <span className="font-mono text-[10px] text-primary" dir="ltr">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 block w-full accent-primary"
        aria-label={label}
      />
    </div>
  );
}
