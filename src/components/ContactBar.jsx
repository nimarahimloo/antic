import { Phone } from "lucide-react";

const PHONE = "02112345678";

export default function ContactBar() {
  return (
    <a
      href={`tel:${PHONE}`}
      className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-7 py-3.5 font-display text-sm font-bold text-primary-foreground shadow-[0_10px_40px_-10px_rgba(201,162,39,0.7)] transition-all duration-300 hover:bg-accent hover:shadow-[0_14px_50px_-8px_rgba(232,197,71,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F8F5F0] md:bottom-7"
      style={{ minHeight: 48 }}
      aria-label="تماس بگیرید"
    >
      <Phone className="h-4 w-4" />
      تماس بگیرید
    </a>
  );
}