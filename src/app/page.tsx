import { Suspense } from "react";
import Layout from "@/components/Layout";
import HeroSlider from "@/components/sections/HeroSlider";
import CategoryCarousel from "@/components/sections/CategoryCarousel";
import PremiumShowcase from "@/components/sections/PremiumShowcase";
import FabricLibrary from "@/components/sections/FabricLibrary";
import ProductSlider from "@/components/sections/ProductSlider";
import CatalogTeaser from "@/components/sections/CatalogTeaser";
import ContactCTA from "@/components/sections/ContactCTA";
import CollectionsSection from "@/components/sections/CollectionsSection";
import {
  HeroSliderSkeleton,
  CategoryCarouselSkeleton,
  PremiumShowcaseSkeleton,
  FabricLibrarySkeleton,
  ProductSliderSkeleton,
  CatalogTeaserSkeleton,
  ContactCTASkeleton,
} from "@/components/Skeletons";
import { getCollections } from "@/lib/server-data";

export default async function HomePage() {
  let collections: Array<{ id: string; title: string; slug: string; description: string; coverImage: string | null; order: number; active: boolean }> = [];

  try {
    collections = await getCollections(true);
  } catch {
    collections = [];
  }

  return (
    <Layout>
      <div className="bg-background">
        <Suspense fallback={<HeroSliderSkeleton />}>
          <HeroSlider />
        </Suspense>
        <Suspense fallback={<CategoryCarouselSkeleton />}>
          <CategoryCarousel />
        </Suspense>
        <Suspense fallback={<PremiumShowcaseSkeleton />}>
          <PremiumShowcase />
        </Suspense>
        <Suspense fallback={<FabricLibrarySkeleton />}>
          <FabricLibrary />
        </Suspense>
        <Suspense fallback={<ProductSliderSkeleton />}>
          <ProductSlider />
        </Suspense>
        <Suspense fallback={<CatalogTeaserSkeleton />}>
          <CatalogTeaser />
        </Suspense>
        <Suspense fallback={<ContactCTASkeleton />}>
          <ContactCTA />
        </Suspense>
        <CollectionsSection collections={collections} />
      </div>
    </Layout>
  );
}