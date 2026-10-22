import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ImageIcon, Trash2, Share2 } from "lucide-react";

export default function SavedDesignsGallery({ limit = 8 }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.SavedDesign
      .filter({}, { sort: "-created_date", limit })
      .then((data) => setDesigns(data?.items || []))
      .catch(() => setDesigns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleShare = async (design) => {
    const shareUrl = design.image;
    const shareText = `طرح پرده ${design.title} — پرده آنتیک`;
    if (navigator.share) {
      try {
        await navigator.share({ title: design.title, text: shareText, url: shareUrl });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {}
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.SavedDesign.delete(id);
      load();
    } catch {}
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-secondary/40" />
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-secondary/60 py-12 text-center">
        <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="font-body text-sm text-muted-foreground">هنوز طرحی ذخیره نشده است.</p>
        <p className="mt-1 font-body text-xs text-muted-foreground/70">طرح خود را در استودیوی مجازی بسازید و ذخیره کنید.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {designs.map((d, i) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="group relative overflow-hidden rounded-2xl border border-secondary/60 bg-card"
        >
          <img src={d.image} alt={d.title} className="aspect-square w-full object-cover" />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/95 via-background/30 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <p className="font-display text-xs font-bold text-foreground">{d.title}</p>
            {d.curtain_model_code && (
              <p className="font-body text-[10px] text-muted-foreground">{d.curtain_model_code}</p>
            )}
            <div className="mt-1.5 flex gap-1.5">
              <button
                onClick={() => handleShare(d)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary hover:bg-primary/25"
                aria-label="اشتراک‌گذاری"
              >
                <Share2 className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleDelete(d.id)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25"
                aria-label="حذف"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}