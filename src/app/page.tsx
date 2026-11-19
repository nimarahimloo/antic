import Layout from "@/components/Layout";
import HeroSlider from "@/components/sections/HeroSlider";
import CategoryCarousel from "@/components/sections/CategoryCarousel";
import PremiumShowcase from "@/components/sections/PremiumShowcase";
import FabricLibrary from "@/components/sections/FabricLibrary";
import ProductSlider from "@/components/sections/ProductSlider";
import CatalogTeaser from "@/components/sections/CatalogTeaser";
import ContactCTA from "@/components/sections/ContactCTA";

export default function HomePage() {
  return (
    <Layout>
      <div className="bg-background">
        <HeroSlider />
        <CategoryCarousel />
        <PremiumShowcase />
        <FabricLibrary />
        <ProductSlider />
        <CatalogTeaser />
        <ContactCTA />
      </div>
    </Layout>
  );
}