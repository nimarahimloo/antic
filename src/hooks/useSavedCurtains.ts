"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "artindecor_saved_curtains";

interface SavedCurtain {
  id: string;
  model_id: string;
  code: string;
  name: string;
  color: string;
  color_code: string;
  image: string;
  saved_date: string;
}

/**
 * useSavedCurtains — ذخیرۀ محلی ترکیب‌های موردعلاقه (مدل + رنگ)
 * برای مرور بعدی یا مشاوره نهایی.
 */
export function useSavedCurtains() {
  const [saved, setSaved] = useState<SavedCurtain[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) (async () => {
        setSaved(JSON.parse(raw));
      })();
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((items: SavedCurtain[]) => {
    setSaved(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, []);

  const isSaved = useCallback(
    (modelId: string, colorCode: string) =>
      saved.some((s) => s.model_id === modelId && s.color_code === (colorCode || "")),
    [saved]
  );

  const toggleSave = useCallback(
    (model: { id: string; code: string; name: string; color?: string; color_code?: string; image?: string }, colorOverride?: string) => {
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

  const remove = useCallback(
    (id: string) => {
      persist(saved.filter((s) => s.id !== id));
    },
    [saved, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { saved, isSaved, toggleSave, remove, clear };
}