"use client";

import { motion } from "framer-motion";

/**
 * Base skeleton utilities - uses regular div with CSS animation for compatibility
 */
export function SkeletonBox({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-shimmer rounded ${className}`}
      style={{ backgroundSize: "200% 100%", ...style }}
    />
  );
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <SkeletonBox key={i} className="h-4 w-full" style={{ width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <SkeletonBox className={`rounded-full ${className}`} style={{ width: size, height: size }} />;
}

/**
 * Hero Slider Skeleton
 */
export function HeroSliderSkeleton() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative h-[100svh] min-h-[600px] w-full overflow-hidden bg-background"
    >
      <div className="absolute inset-0 animate-shimmer bg-secondary/30" style={{ backgroundSize: "200% 100%" }} />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <div className="max-w-2xl animate-fade-up">
          <SkeletonBox className="h-12 w-48 mx-auto mb-6 rounded-full" style={{ maxWidth: "300px" }} />
          <SkeletonText lines={2} className="mx-auto max-w-md" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2"
        >
          <SkeletonBox className="h-11 w-40 rounded-full" />
        </motion.div>
      </div>
    </motion.section>
  );
}

/**
 * Category Carousel Skeleton
 */
export function CategoryCarouselSkeleton() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-secondary/40 bg-background py-10 lg:py-14"
    >
      <div className="mx-auto mb-6 flex max-w-7xl items-center justify-between px-5 lg:mb-8 lg:px-10">
        <div>
          <SkeletonBox className="eyebrow mb-2 block h-4 w-20" />
          <SkeletonBox className="h-8 w-40" />
        </div>
      </div>
      <div className="flex cursor-grab gap-5 overflow-x-auto no-scrollbar px-5 lg:gap-6 lg:px-10">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="h-44 w-44 shrink-0 animate-pulse rounded-2xl bg-secondary/30"
          />
        ))}
      </div>
    </motion.section>
  );
}

/**
 * Premium Showcase Skeleton
 */
export function PremiumShowcaseSkeleton() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border-t border-secondary/40 bg-background py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-12 text-center">
          <SkeletonBox className="eyebrow mb-4 inline-block h-4 w-24" />
          <SkeletonBox className="h-10 w-64 mx-auto mb-6" style={{ maxWidth: "400px" }} />
          <SkeletonText lines={2} className="mx-auto max-w-2xl" />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative aspect-[4/3] rounded-3xl overflow-hidden"
          >
            <SkeletonBox className="absolute inset-0" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center gap-6"
          >
            <SkeletonText lines={3} />
            <SkeletonBox className="h-12 w-40 rounded-full" />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

/**
 * Fabric Library Skeleton
 */
export function FabricLibrarySkeleton() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border-t border-secondary/40 bg-background py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-12 text-center">
          <SkeletonBox className="eyebrow mb-4 inline-block h-4 w-28" />
          <SkeletonBox className="h-10 w-72 mx-auto mb-6" style={{ maxWidth: "450px" }} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-card border border-secondary/50"
            >
              <SkeletonBox className="absolute inset-0" />
              <div className="relative z-10 p-4">
                <SkeletonBox className="h-6 w-24 mb-2" />
                <SkeletonBox className="h-4 w-32" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/**
 * Product Slider Skeleton
 */
export function ProductSliderSkeleton() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border-t border-secondary/40 bg-background py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <SkeletonBox className="eyebrow mb-2 block h-4 w-20" />
            <SkeletonBox className="h-10 w-56" />
          </div>
          <SkeletonBox className="h-11 w-11 rounded-full border border-secondary/50" />
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="shrink-0 w-72"
            >
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-card border border-secondary/50">
                <SkeletonBox className="absolute inset-0" />
              </div>
              <div className="mt-4">
                <SkeletonBox className="h-4 w-20 mb-1" />
                <SkeletonBox className="h-3 w-24" />
                <SkeletonBox className="mt-2 h-5 w-20 rounded-full" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/**
 * Catalog Teaser Skeleton
 */
export function CatalogTeaserSkeleton() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border-t border-secondary/40 bg-background py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-12 text-center">
          <SkeletonBox className="eyebrow mb-4 inline-block h-4 w-24" />
          <SkeletonBox className="h-10 w-64 mx-auto mb-6" style={{ maxWidth: "400px" }} />
          <SkeletonBox className="h-12 w-40 mx-auto rounded-full" />
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-card border border-secondary/50"
            >
              <SkeletonBox className="absolute inset-0" />
              <div className="relative z-10 p-6">
                <SkeletonBox className="h-5 w-28 mb-2" />
                <SkeletonBox className="h-8 w-36" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/**
 * Contact CTA Skeleton
 */
export function ContactCTASkeleton() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border-t border-secondary/40 bg-background py-24 lg:py-32"
    >
      <div className="mx-auto max-w-5xl px-5 text-center lg:px-10">
        <SkeletonBox className="eyebrow mb-4 inline-block h-4 w-20" />
        <SkeletonBox className="h-12 w-72 mx-auto mb-6" style={{ maxWidth: "450px" }} />
        <SkeletonText lines={2} className="mx-auto max-w-xl" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          <SkeletonBox className="h-12 w-40 rounded-full" />
          <SkeletonBox className="h-12 w-40 rounded-full border border-secondary/50 bg-transparent" />
        </motion.div>
      </div>
    </motion.section>
  );
}

/**
 * Shop Page Skeleton
 */
export function ShopPageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background"
    >
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-20 z-30 border-b border-secondary/50 bg-background/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 lg:px-10">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-0.5">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border animate-pulse bg-secondary/20"
              >
                <SkeletonBox className="h-8 w-8 rounded-xl mb-2" />
                <SkeletonBox className="h-3 w-16" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16"
      >
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="aspect-[4/5] animate-pulse rounded-2xl border border-secondary/50 bg-card"
            />
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}

/**
 * Projects Page Skeleton
 */
export function ProjectsPageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background"
    >
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16"
      >
        <div className="mb-8 flex flex-wrap gap-2">
          <SkeletonBox className="h-10 w-20 rounded-full border border-secondary/50" />
          {[...Array(4)].map((_, i) => (
            <SkeletonBox key={i} className="h-10 w-24 rounded-full border border-secondary/50" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="relative aspect-[4/3] min-h-[180px] rounded-3xl overflow-hidden bg-card border border-secondary/50"
            >
              <SkeletonBox className="absolute inset-0" />
              <div className="relative z-10 p-6">
                <SkeletonBox className="h-4 w-20 mb-2" />
                <SkeletonBox className="h-7 w-36" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}

/**
 * Contact Page Skeleton
 */
export function ContactPageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background"
    >
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden border-t border-secondary/40 bg-background py-24 lg:py-32"
      >
        <div className="relative mx-auto max-w-5xl px-5 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <SkeletonBox className="h-10 w-56 mb-6" style={{ maxWidth: "350px" }} />
              <SkeletonText lines={3} />
              <div className="mt-10 space-y-6">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-4"
                  >
                    <SkeletonBox className="h-12 w-12 shrink-0 rounded-2xl border border-secondary/50" />
                    <div>
                      <SkeletonBox className="h-3 w-20 mb-1" />
                      <SkeletonBox className="h-6 w-32" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
                <SkeletonBox className="h-6 w-40 mb-6" />
                <form className="space-y-5">
                  <div>
                    <SkeletonBox className="h-3 w-32 mb-1.5" />
                    <SkeletonBox className="w-full h-12 rounded-xl border border-secondary" />
                  </div>
                  <div>
                    <SkeletonBox className="h-3 w-24 mb-1.5" />
                    <SkeletonBox className="w-full h-12 rounded-xl border border-secondary" />
                  </div>
                  <div>
                    <SkeletonBox className="h-3 w-20 mb-1.5" />
                    <SkeletonBox className="w-full h-28 rounded-xl border border-secondary" />
                  </div>
                  <SkeletonBox className="h-12 w-full rounded-full" />
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

/**
 * About Page Skeleton
 */
export function AboutPageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background"
    >
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24"
      >
        <div className="grid gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <SkeletonBox className="h-10 w-48 mb-8" style={{ maxWidth: "300px" }} />
            <SkeletonText lines={5} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-secondary/60 bg-card/50 p-8 lg:p-12">
              <SkeletonBox className="h-6 w-40 mb-6" />
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-start gap-3"
                  >
                    <SkeletonCircle size={24} className="border border-primary/40" />
                    <SkeletonBox className="h-6 w-56" />
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="rounded-3xl border border-secondary/60 bg-card/50 p-6"
                >
                  <div className="flex items-center gap-3">
                    <SkeletonBox className="h-12 w-12 rounded-2xl" />
                    <div>
                      <SkeletonBox className="h-8 w-20 mb-1" />
                      <SkeletonBox className="h-4 w-28" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  );
}

/**
 * Product Detail Page Skeleton
 */
export function ProductDetailPageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background pb-24"
    >
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <div className="mb-6 flex items-center gap-2">
          <SkeletonBox className="h-4 w-12" />
          <SkeletonBox className="h-3 w-3" />
          <SkeletonBox className="h-4 w-12" />
          <SkeletonBox className="h-3 w-3" />
          <SkeletonBox className="h-4 w-24" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
          {/* Gallery - Right side (col-span-3) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 lg:sticky lg:top-28 lg:self-start order-2 lg:order-1"
          >
            <div className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-secondary/60 bg-card">
              <SkeletonBox className="absolute inset-0" />
            </div>
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {[...Array(4)].map((_, i) => (
                <SkeletonBox key={i} className="aspect-square w-16 shrink-0 rounded-xl border border-secondary/50" />
              ))}
            </div>
          </motion.div>

          {/* Details - Left side (col-span-2) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 order-1 lg:order-2"
          >
            <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
              <div className="flex items-center gap-2">
                <SkeletonBox className="h-4 w-4" />
                <SkeletonBox className="h-4 w-36" />
              </div>
              <SkeletonBox className="mt-3 h-8 w-3/4" />
              <SkeletonBox className="mt-6 h-5 w-20 rounded-2xl border border-secondary/50" />
              <SkeletonText lines={3} className="mt-6" />
              <div className="mt-7 space-y-5">
                {[...Array(2)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <SkeletonBox className="h-5 w-28 mb-3" />
                    <div className="flex flex-wrap gap-3">
                      {[...Array(3)].map((_, j) => (
                        <SkeletonBox key={j} className="h-10 w-24 rounded-full border border-secondary/50" />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
              <SkeletonBox className="mt-8 w-full h-12 rounded-full" />
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-secondary/60 pt-6">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <SkeletonBox className="h-11 w-11 rounded-full border border-secondary/50" />
                    <SkeletonBox className="h-3 w-20" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Description & Specs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-14 grid gap-8 lg:grid-cols-3"
        >
          <motion.div className="lg:col-span-2">
            <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <SkeletonBox className="h-7 w-36" />
                <SkeletonBox className="h-1 w-16 my-5 bg-primary" />
              </div>
              <SkeletonText lines={4} />
            </div>
          </motion.div>
          <motion.div className="lg:col-span-1">
            <div className="rounded-3xl border border-secondary/60 bg-card">
              <div className="border-b border-secondary/60 p-6">
                <SkeletonBox className="h-5 w-32" />
              </div>
              <div className="p-6">
                <table className="w-full">
                  <tbody>
                    {[...Array(6)].map((_, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-background/40" : ""}>
                        <td className="w-1/3 border-b border-secondary/40 p-4">
                          <SkeletonBox className="h-3 w-24" />
                        </td>
                        <td className="border-b border-secondary/40 p-4">
                          <SkeletonBox className="h-3 w-32" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Curtain Detail Page Skeleton
 */
export function CurtainDetailPageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background pb-16 pt-4 lg:pb-24"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-6 relative">
          <SkeletonBox className="h-10 w-full rounded-2xl border border-secondary" />
        </div>

        <div className="flex cursor-grab gap-3 overflow-x-auto no-scrollbar pb-1 lg:gap-4">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="h-28 w-28 shrink-0 animate-pulse rounded-2xl border border-secondary/50 bg-secondary/30"
            />
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 order-2 lg:order-1"
          >
            <div className="rounded-3xl border border-secondary/60 bg-card p-5 lg:p-6">
              <SkeletonBox className="aspect-square rounded-2xl overflow-hidden" />
              <div className="mt-5 flex items-start justify-between gap-3">
                <div>
                  <SkeletonBox className="h-5 w-24" />
                  <SkeletonBox className="mt-1 h-6 w-32" />
                </div>
                <SkeletonBox className="h-9 w-9 rounded-lg border border-secondary/50" />
              </div>
              <SkeletonBox className="mt-4 grid grid-cols-2 gap-3 h-20" />
              <SkeletonBox className="mt-4 h-4 w-3/4" />
              <SkeletonBox className="mt-4 w-full h-10 rounded-full border border-primary/50" />
              <SkeletonBox className="mt-3 w-full h-12 rounded-full bg-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 order-1 lg:order-2"
          >
            <div className="mb-3 flex items-center justify-between">
              <SkeletonBox className="h-5 w-28" />
              <SkeletonBox className="h-4 w-20" />
            </div>
            <div className="max-h-[560px] overflow-y-auto rounded-2xl border border-secondary/60 bg-card/50 p-3">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="animate-pulse group relative flex flex-col overflow-hidden rounded-xl border border-secondary/50 bg-card"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary/30">
                      <SkeletonBox className="absolute inset-0" />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 p-2">
                      <SkeletonBox className="h-3 w-3/4" />
                      <SkeletonBox className="h-2 w-1/2" />
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <SkeletonBox className="h-2.5 w-2.5 rounded-full" />
                        <SkeletonBox className="h-2 w-1/3" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Auth Pages Skeleton (Login, Register, Forgot Password, Reset Password)
 */
export function AuthPageSkeleton({ title = "ورود" }: { title?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center bg-background px-4"
    >
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <SkeletonBox className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4 mx-auto" />
          <SkeletonBox className="h-8 w-40 mx-auto mb-2" />
          <SkeletonBox className="h-4 w-48 mx-auto" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-sm border border-border p-8"
        >
          <form className="space-y-5">
            <div>
              <SkeletonBox className="h-3 w-24 mb-1.5" />
              <SkeletonBox className="w-full h-12 rounded-xl border border-secondary" />
            </div>
            <div>
              <SkeletonBox className="h-3 w-20 mb-1.5" />
              <SkeletonBox className="w-full h-12 rounded-xl border border-secondary" />
            </div>
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-4 w-20" />
            </div>
            <SkeletonBox className="h-12 w-full rounded-full bg-primary" />
          </form>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            <SkeletonBox className="h-4 w-60 mx-auto" />
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}