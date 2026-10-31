import { useSearchParams } from "react-router-dom";
import InteractiveCatalog from "@/components/sections/InteractiveCatalog";
import PageHero from "@/components/PageHero";

export default function Catalog() {
  const [params] = useSearchParams();
  const initialCategory = params.get("category");

  return (
    <div className="bg-background">
      <PageHero
        pageKey="catalog"
        eyebrow="کاتالوگ پرده"
        title="مدل‌ها و نمای نصب"
        description="دسته‌ها را مرور کنید، مدل مورد نظر را انتخاب کنید و کد، رنگ و نمای نصب را ببینید."
      />

      <InteractiveCatalog initialCategory={initialCategory} />
    </div>
  );
}
