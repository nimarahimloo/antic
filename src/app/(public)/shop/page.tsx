import { Suspense } from "react";
import ShopPageComponent from "@/components/ShopPage";
import { ShopPageSkeleton } from "@/components/Skeletons";
import { getShopCategories, getShopProducts } from "@/lib/server-data";

export const revalidate = 3600; // ISR: revalidate shop every hour

export default async function ShopPageWrapper() {
  const [categories, products] = await Promise.all([
    getShopCategories(),
    getShopProducts({ limit: "24", visible: "true" }),
  ]);

  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <ShopPageComponent
        initialCategories={categories as Array<{ id: string; name: string; slug: string; image: string | null; description?: string; visible?: boolean; order?: number }>}
        initialProducts={products as Array<{ id: string; slug: string; name: string; description?: string; price: number; formattedPrice?: string; image?: string; categoryId?: string; visible?: boolean; inStock?: boolean; stock?: number; ribbon?: string; optionsJson?: string; variantsJson?: string; sortOrder?: number; createdAt?: string; updatedAt?: string }>}
      />
    </Suspense>
  );
}
