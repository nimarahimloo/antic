"use client";

import ProductCard from "@/components/ProductCard";

interface Product {
  id: string;
  slug: string;
  name: string;
  [key: string]: unknown;
}

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
  onLoadMore?: () => Promise<void>;
  loadingMore?: boolean;
}

export default function ProductGrid({
  products,
  loading,
  emptyMessage,
  emptyHint,
  onLoadMore,
  loadingMore,
}: ProductGridProps) {
  if (loading && !products?.length) {
    return (
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl border border-secondary/50 bg-card" />
        ))}
      </div>
    );
  }

  if (!products?.length) {
    return emptyMessage ? (
      <div className="rounded-2xl border border-secondary/60 bg-card p-12 text-center">
        <p className="font-display text-lg font-bold text-foreground">{emptyMessage}</p>
        <p className="mt-2 font-body text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    ) : null;
  }

  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      {onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="col-span-full flex items-center justify-center gap-2 rounded-2xl border border-secondary/60 bg-card py-4 transition-colors hover:border-primary/50 disabled:opacity-60"
        >
          {loadingMore ? (
            <>
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              در حال بارگذاری...
            </>
          ) : (
            "بارگذاری بیشتر"
          )}
        </button>
      )}
    </div>
  );
}