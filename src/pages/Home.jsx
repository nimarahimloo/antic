import HeroSlider from "@/components/sections/HeroSlider";
import CategoryCarousel from "@/components/sections/CategoryCarousel";
import PremiumShowcase from "@/components/sections/PremiumShowcase";
import FabricLibrary from "@/components/sections/FabricLibrary";
import FabricCollection from "@/components/sections/FabricCollection";
import ProductSlider from "@/components/sections/ProductSlider";
import CatalogTeaser from "@/components/sections/CatalogTeaser";
import ContactCTA from "@/components/sections/ContactCTA";

export default function Home() {
  return (
    <div className="bg-background">
      <HeroSlider />
      <CategoryCarousel />
      <PremiumShowcase />
      <FabricLibrary />
      <ProductSlider />
      <FabricCollection />
      <CatalogTeaser />
      <ContactCTA />
    </div>
  );
}
