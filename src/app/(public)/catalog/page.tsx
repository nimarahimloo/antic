import { Suspense } from "react";
import ServerCatalog from "./ServerCatalog";
import { InteractiveCatalogSkeleton } from "@/components/sections/InteractiveCatalogSkeletons";

export const revalidate = 3600; // ISR: revalidate catalog every hour

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialCategory =
    typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : undefined;

  return (
    <Suspense fallback={<InteractiveCatalogSkeleton />}>
      <ServerCatalog initialCategory={initialCategory} />
    </Suspense>
  );
}
