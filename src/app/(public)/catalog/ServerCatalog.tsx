import { Suspense } from "react";
import { getCurtainCategories, getCategoryCounts } from "@/actions/catalog";
import InteractiveCatalogClient from "./InteractiveCatalogClient";
import { InteractiveCatalogSkeleton } from "@/components/sections/InteractiveCatalogSkeletons";

interface ServerCatalogProps {
  initialCategory?: string;
}

export default async function ServerCatalog({ initialCategory }: ServerCatalogProps) {
  // Fetch initial data on the server
  const [categoriesData, categoryCounts] = await Promise.all([
    getCurtainCategories(true),
    getCategoryCounts(),
  ]);

  const categories = categoriesData?.items ?? [];

  return (
    <Suspense fallback={<InteractiveCatalogSkeleton />}>
      <InteractiveCatalogClient
        initialCategories={categories}
        initialCategory={initialCategory}
        initialCategoryCounts={categoryCounts}
      />
    </Suspense>
  );
}