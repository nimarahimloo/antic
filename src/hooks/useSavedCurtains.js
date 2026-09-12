import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "artindecor_saved_curtains";

/**
 * useSavedCurtains — ذخیرۀ محلی ترکیب‌های موردعلاقه (مدل + رنگ)
 * برای مرور بعدی یا مشاوره نهایی.
 */
export function useSavedCurtains() {
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((items) => {
    setSaved(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, []);

  const isSaved = useCallback(
    (modelId, colorCode) =>
      saved.some((s) => s.model_id === modelId && s.color_code === (colorCode || "")),
    [saved]
  );

  const toggleSave = useCallback(
    (model, colorOverride) => {
      const colorCode = colorOverride || model.color_code || "";
      const id = `${model.id}_${colorCode}`;
      const existing = saved.find((s) => s.id === id);
      if (existing) {
        persist(saved.filter((s) => s.id !== id));
      } else {
        persist([
          {
            id,
            model_id: model.id,
            code: model.code,
            name: model.name,
            color: colorOverride ? "رنگ انتخابی" : model.color || "",
            color_code: colorCode,
            image: model.image || "",
            saved_date: new Date().toISOString(),
          },
          ...saved,
        ]);
      }
    },
    [saved, persist]
  );

  const remove = useCallback((id) => {
    persist(saved.filter((s) => s.id !== id));
  }, [saved, persist]);

  const clear = useCallback(() => persist([]), [persist]);

  return { saved, isSaved, toggleSave, remove, clear };
}