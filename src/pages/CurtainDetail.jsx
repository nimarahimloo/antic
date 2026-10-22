import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import VisualPreviewTool from "@/components/catalog/VisualPreviewTool";
import FabricSwatch from "@/components/catalog/FabricSwatch";

export default function CurtainDetail() {
  const { id } = useParams();
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    setModel(null);
    base44.entities.CurtainModel.get(id)
      .then((m) => {
        if (m) setModel(m);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-black text-foreground">محصول پیدا نشد</h1>
        <Link to="/catalog" className="btn-gold mt-6">
          بازگشت به کاتالوگ
        </Link>
      </div>
    );
  }

  const hasApprovedInstall =
    model.install_status === "approved" && Boolean(model.install_image);

  return (
    <div className="bg-background pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <nav className="flex items-center gap-2 font-body text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-primary">
            خانه
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link to="/catalog" className="transition-colors hover:text-primary">
            کاتالوگ
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{model.code}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <CurtainPreview fabric={model} />

            {hasApprovedInstall && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-card">
                <div className="flex items-center gap-2 border-b border-secondary/50 px-4 py-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <p className="font-display text-xs font-bold text-foreground">نمونه نصب تأییدشده</p>
                </div>
                <img
                  src={model.install_image}
                  alt={`نصب ${model.code}`}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-4">
              <p className="mb-3 font-display text-xs font-bold text-foreground">
                تکهٔ پارچه از کاتالوگ فیزیکی
              </p>
              <div className="overflow-hidden rounded-xl">
                <FabricSwatch fabric={model} className="aspect-[4/3] w-full" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-body text-[10px]">
                {model.color_code && (
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span
                      className="h-3 w-3 rounded border border-secondary/40"
                      style={{ backgroundColor: model.color_code }}
                    />
                    {model.color || model.color_code}
                  </span>
                )}
                {model.fabric && <span className="text-muted-foreground">{model.fabric}</span>}
                {model.texture && <span className="text-muted-foreground">{model.texture}</span>}
                {model.material && <span className="text-muted-foreground">{model.material}</span>}
              </div>
              {!model.image && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  عکس ورق کاتالوگ هنوز آپلود نشده — فقط شبیه‌سازی رنگی نمایش داده می‌شود.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-bold text-primary">{model.code}</p>
                  <h1 className="mt-1 font-display text-2xl font-black leading-snug text-foreground">
                    {model.name}
                  </h1>
                </div>
                {model.color_code && (
                  <span
                    className="h-12 w-12 shrink-0 rounded-xl border border-secondary/60"
                    style={{ backgroundColor: model.color_code }}
                    title={model.color || ""}
                  />
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {model.fabric && <Spec label="نوع پارچه" value={model.fabric} />}
                {model.color && <Spec label="رنگ" value={model.color} />}
                {model.texture && <Spec label="بافت" value={model.texture} />}
                {model.material && <Spec label="ترکیب جنس" value={model.material} />}
                {model.category_slug && <Spec label="دسته / سازوکار" value={model.category_slug} />}
                {model.subcategory && <Spec label="زیر‌دسته" value={model.subcategory} />}
              </div>

              {model.description && (
                <p className="mt-6 font-body text-sm leading-8 text-muted-foreground">
                  {model.description}
                </p>
              )}

              <a href="tel:02112345678" className="btn-gold mt-8 w-full justify-center">
                <Phone className="h-4 w-4" /> مشاوره و سفارش
              </a>
              <Link to="/catalog" className="btn-ghost-gold mt-3 w-full justify-center">
                بازگشت به کاتالوگ
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 lg:mt-14">
          <VisualPreviewTool fabric={model} />
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <div className="rounded-lg bg-background/50 px-4 py-3">
      <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
