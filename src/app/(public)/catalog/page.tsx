"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InteractiveCatalog from "@/components/sections/InteractiveCatalog";
import PageLoading from "@/components/PageLoading";

function CatalogContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || undefined;
  return <InteractiveCatalog initialCategory={initialCategory} />;
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CatalogContent />
    </Suspense>
  );
}
