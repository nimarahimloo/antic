"use client";

import { useEffect, useState } from "react";
import { analyzeFabric } from "@/components/catalog/photo/fabricAnalyzer";

interface FabricAnalysis {
  dominantColor: string;
  isDark: boolean;
  luminance: number;
  [key: string]: unknown;
}

export function useFabricAnalysis(url: string | undefined | null): FabricAnalysis | null {
  const [analysis, setAnalysis] = useState<FabricAnalysis | null>(() => null);
  useEffect(() => {
    if (!url) {
      setAnalysis(null);
      return;
    }
    let alive = true;
    analyzeFabric(url).then((a) => {
      if (!alive || !a) return;
      setAnalysis({
        dominantColor: a.color,
        isDark: a.avgLuminance < 128,
        luminance: a.avgLuminance,
        ...a,
      });
    });
    return () => {
      alive = false;
    };
  }, [url]);
  return analysis;
}