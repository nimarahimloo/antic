import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_SETTINGS } from '@/components/catalog/windowStyles';
import CurtainCanvas from '@/components/catalog/CurtainCanvas';
import { useFabricAnalysis } from '@/hooks/useFabricAnalysis';

export default function VirtualWindow({ fabric, settings: override, open = .30, scale = .65 }) {
  const [stored, setStored] = useState(null);
  const analysis = useFabricAnalysis(fabric?.image);
  useEffect(() => {
    if (override) return;
    base44.entities.VirtualWindowSetting.list('-created_date', 1).then(rows => setStored(rows?.[0] || null));
  }, [override]);
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(override || stored || {}) }), [override, stored]);
  // اگر color_code موجود نیست، رنگ غالب از تحلیل تصویر استخراج می‌شود
  const fabricWithColor = useMemo(() => {
    if (!fabric || fabric.color_code) return fabric;
    if (analysis?.colorHex) return { ...fabric, color_code: analysis.colorHex };
    return fabric;
  }, [fabric, analysis]);
  return <CurtainCanvas fabric={fabricWithColor} settings={settings} open={open} scale={scale} />;
}