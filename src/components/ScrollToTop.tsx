"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getHashId(hash: string) {
  const rawId = hash.slice(1);
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}

export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hash = searchParams?.get("hash") || "";

  useEffect(() => {
    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}