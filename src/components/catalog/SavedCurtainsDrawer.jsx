import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Phone, Bookmark, RotateCcw, Eye } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * SavedCurtainsDrawer — پنل کناری برای مرور ترکیب‌های ذخیره‌شده.
 * هر آیتم قابل نمایش مجدد روی پنجره یا حذف است.
 */
export default function SavedCurtainsDrawer({ open, onClose, saved, onRemove, onClear, onSelect }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col border-r border-secondary/60 bg-card shadow-2xl"
          >
            {/* هدر */}
            <div className="flex items-center justify-between border-b border-secondary/50 p-5">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-primary" />
                <h3 className="font-display text-base font-black text-foreground">پرده‌های ذخیره‌شده</h3>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-bold text-primary">
                  {saved.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* لیست */}
            <div className="flex-1 overflow-y-auto p-5">
              {saved.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Bookmark className="mb-3 h-12 w-12 text-secondary" />
                  <p className="font-body text-sm text-muted-foreground">هنوز پرده‌ای ذخیره نکرده‌اید.</p>
                  <p className="mt-1 font-body text-xs text-muted-foreground">
                    مدل موردعلاقه را با دکمۀ قلب ذخیره کنید.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {saved.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-secondary/60 bg-background/50 p-3"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-secondary/60">
                        {item.image ? (
                          <img src={item.image} alt={item.code} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full" style={{ backgroundColor: item.color_code || "#C9A227" }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold text-primary">{item.code}</p>
                        <p className="truncate font-body text-xs text-muted-foreground">{item.name}</p>
                        {item.color_code && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className="h-3 w-3 rounded-full border border-secondary/60"
                              style={{ backgroundColor: item.color_code }}
                            />
                            <span className="font-body text-[10px] text-muted-foreground">
                              {item.color || "رنگ انتخابی"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <button
                          onClick={() => {
                            onSelect(item);
                            onClose();
                          }}
                          className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-body text-[10px] font-bold text-primary transition-colors hover:bg-primary/20"
                        >
                          <Eye className="h-3 w-3" /> نمایش
                        </button>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* فوتر */}
            {saved.length > 0 && (
              <div className="border-t border-secondary/50 p-5">
                <Link to="/#contact" onClick={onClose} className="btn-gold w-full justify-center">
                  <Phone className="h-4 w-4" /> درخواست مشاوره با این انتخاب‌ها
                </Link>
                <button
                  onClick={onClear}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 font-body text-xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  <RotateCcw className="h-3 w-3" /> پاک کردن همه
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}