import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

/** Legacy full-page route — primary UX is the floating customer bot on all pages. */
export default function DesignConsultant() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-black text-foreground">دستیار طراحی آنتیک</h1>
      <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">
        مشاور هوشمند به‌صورت دکمهٔ شناور در گوشهٔ پایین همهٔ صفحات سایت در دسترس است.
        روی آیکون براق پایین صفحه بزن و دربارهٔ فضا، نور و سلیقه‌ت حرف بزن.
      </p>
      <Link to="/" className="btn-gold mt-8">
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
