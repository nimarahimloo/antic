"use client";

import { useParams } from "next/navigation";
import ProductDetailPage from "@/components/ProductDetailPage";

export default function ProductDetailPageWrapper() {
  const params = useParams();
  const slug = params.slug as string;
  return <ProductDetailPage slug={slug} />;
}
