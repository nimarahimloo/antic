import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DEFAULT_SETTINGS } from "@/components/catalog/windowStyles";
import CurtainCanvas from "@/components/catalog/CurtainCanvas";
import { useFabricAnalysis } from "@/hooks/useFabricAnalysis";

export default function VirtualWindow({
  fabric,
  settings: override,
  open = 0.3,
  scale = 0.65,
  onOpenChange,
}) {
  const [stored, setStored] = useState(null);
  const analysis = useFabricAnalysis(fabric?.image);

  useEffect(() => {
    if (override) return;
    base44.entities.VirtualWindowSetting.list("-created_date", 1)
      .then((rows) => setStored(Array.isArray(rows) ? rows[0] : rows?.[0] || null))
      .catch(() => setStored(null));
  }, [override]);

  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(override || stored || {}) }),
    [override, stored]
  );

  const fabricWithColor = useMemo(() => {
    if (!fabric || fabric.color_code) return fabric;
    if (analysis?.colorHex) return { ...fabric, color_code: analysis.colorHex };
    return fabric;
  }, [fabric, analysis]);

  return (
    <CurtainCanvas
      fabric={fabricWithColor}
      settings={settings}
      open={open}
      scale={scale}
      onOpenChange={onOpenChange}
    />
  );
}
