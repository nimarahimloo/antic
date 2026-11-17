import { useCart } from "@/context/CartContext";

export default function CartButton() {
  const { itemCount, setIsOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      aria-label={itemCount ? `سبد خرید، ${itemCount} کالا` : "سبد خرید"}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent p-0 text-current transition-colors"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -left-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-[5px] text-[11px] font-semibold text-primary-foreground">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}
