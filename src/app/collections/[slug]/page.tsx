import { Suspense } from "react";
import Link from "next/link";
import { getCollections, getCollectionCategories, getCurtainCategories } from "@/lib/server-data";
import { CollectionPageContent } from "./CollectionPageContent";
import { CollectionPageSkeleton } from "@/components/Skeletons";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

interface Category {
  subcategories: unknown;
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string;
}

export async function generateStaticParams() {
  const collections = await getCollections(true);
  return collections.map((c: { slug: string }) => ({ slug: c.slug }));
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const [collections, categories, curtainCategories] = await Promise.all([
    getCollections(true),
    getCollectionCategories(slug),
    getCurtainCategories(true),
  ]);

  const collection = collections.find((c: { slug: string }) => c.slug === slug);

  if (!collection) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Collection not found</h1>
        <Link href="/collections" className="btn-gold mt-6 inline-block">
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <Suspense fallback={<CollectionPageSkeleton />}>
      <CollectionPageContent
        collection={collection}
        categories={categories as unknown as Category[]}
        curtainCategories={curtainCategories}
        slug={slug}
      />
    </Suspense>
  );
}