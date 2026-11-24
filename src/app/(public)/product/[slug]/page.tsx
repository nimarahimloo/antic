"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ProductDetailPage from "@/components/ProductDetailPage";
import { ProductDetailPageSkeleton } from "@/components/Skeletons";

export default function ProductDetailPageWrapper() {
  const params = useParams();
  const slug = params.slug as string;
  return (
    <Suspense fallback={<ProductDetailPageSkeleton />}>
      <ProductDetailPage slug={slug} />
    </Suspense>
  );
}
