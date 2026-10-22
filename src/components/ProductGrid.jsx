import ProductCard from "@/components/ProductCard";

export default function ProductGrid({ products, loading, emptyMessage, emptyHint }) {
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
    </div>
  );
}