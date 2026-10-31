import { useAuth } from "@/lib/AuthContext";

/**
 * هیرو عنوان صفحات داخلی
 * تصویر پس‌زمینه از تنظیمات ادمین: page_heroes[pageKey].image
 */
export default function PageHero({ pageKey, eyebrow, title, description, children, className = "" }) {
  const { appPublicSettings } = useAuth();
  const heroes =
    appPublicSettings?.public_settings?.page_heroes ||
    appPublicSettings?.public_settings?.pageHeroes ||
    {};
  const cfg = (heroes && heroes[pageKey]) || {};
  const image = String(cfg.image || "").trim();
  const eye = String(cfg.eyebrow || eyebrow || "").trim();
  const head = String(cfg.title || title || "").trim();
  const desc = String(cfg.description || description || "").trim();

  return (
    <section
      className={`relative overflow-hidden border-b border-secondary/50 ${
        image ? "" : "bg-card/40"
      } ${className}`}
    >
      {image ? (
        <div className="absolute inset-0" aria-hidden>
          <img src={image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-background via-background/85 to-background/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/20" />
        </div>
      ) : null}
      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
        {eye ? <span className="eyebrow mb-4 block">{eye}</span> : null}
        {head ? (
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-5xl">
            {head}
          </h1>
        ) : null}
        {desc ? (
          <p className="mt-5 max-w-2xl font-body text-sm leading-7 text-muted-foreground lg:text-base">
            {desc}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
