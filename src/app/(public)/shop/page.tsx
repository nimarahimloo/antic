"use client";

import { Suspense } from "react";
import ShopPage from "@/components/ShopPage";
import { ShopPageSkeleton } from "@/components/Skeletons";

export default function ShopPageWrapper() {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <ShopPage />
    </Suspense>
  );
}
