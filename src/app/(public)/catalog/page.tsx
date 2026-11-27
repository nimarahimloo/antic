"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ServerCatalog from "./ServerCatalog";
import { InteractiveCatalogSkeleton } from "@/components/sections/InteractiveCatalogSkeletons";

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || undefined;

  return (
    <Suspense fallback={<InteractiveCatalogSkeleton />}>
      <ServerCatalog initialCategory={initialCategory} />
    </Suspense>
  );
}
