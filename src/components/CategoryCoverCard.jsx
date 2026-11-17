import { Link } from "react-router-dom";

/**
 * کارت کاور دسته — برای کاتالوگ، نمونه‌های اجرا، و هر جای سایت اصلی
 */
export default function CategoryCoverCard({
  name,
  image,
  description,
  to,
  className = "",
  aspect = "aspect-[4/3]",
}) {
  return (
    <Link
      to={to}
      className={`group relative block overflow-hidden rounded-2xl border border-secondary/60 bg-card transition-all duration-500 hover:border-primary ${
        aspect
      } ${className}`}
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/40">
          <span className="font-display text-lg font-bold text-muted-foreground">{name}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-right lg:p-5">
        <h3 className="font-display text-base font-bold text-foreground lg:text-lg">{name}</h3>
        {description ? (
          <p className="mt-1 line-clamp-2 font-body text-[11px] leading-5 text-muted-foreground lg:text-xs">
            {description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
