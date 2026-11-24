import { Suspense } from "react";
import Layout from "@/components/Layout";
import HeroSlider from "@/components/sections/HeroSlider";
import CategoryCarousel from "@/components/sections/CategoryCarousel";
import PremiumShowcase from "@/components/sections/PremiumShowcase";
import FabricLibrary from "@/components/sections/FabricLibrary";
import ProductSlider from "@/components/sections/ProductSlider";
import CatalogTeaser from "@/components/sections/CatalogTeaser";
import ContactCTA from "@/components/sections/ContactCTA";
import {
  HeroSliderSkeleton,
  CategoryCarouselSkeleton,
  PremiumShowcaseSkeleton,
  FabricLibrarySkeleton,
  ProductSliderSkeleton,
  CatalogTeaserSkeleton,
  ContactCTASkeleton,
} from "@/components/Skeletons";

export default function HomePage() {
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
      </div>
    </Layout>
  );
}