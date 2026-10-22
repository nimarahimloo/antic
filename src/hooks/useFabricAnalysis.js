import { useEffect, useState } from "react";
import { analyzeFabric } from "@/components/catalog/photo/fabricAnalyzer";

export function useFabricAnalysis(url) {
  const [analysis, setAnalysis] = useState(null);
  useEffect(() => {
    if (!url) { setAnalysis(null); return; }
    let alive = true;
    analyzeFabric(url).then((a) => alive && setAnalysis(a));
    return () => { alive = false; };
  }, [url]);
  return analysis;
}