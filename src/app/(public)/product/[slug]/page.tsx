import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getShopProduct } from "@/lib/server-data";
import ProductDetailPage from "@/components/ProductDetailPage";
import { ProductDetailPageSkeleton } from "@/components/Skeletons";

export const revalidate = 3600; // ISR: revalidate product every hour

export default async function ProductDetailPageWrapper({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getShopProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <Suspense fallback={<ProductDetailPageSkeleton />}>
      <ProductDetailPage product={product as Record<string, unknown>} />
    </Suspense>
  );
}
