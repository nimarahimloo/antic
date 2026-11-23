"use client";

import { motion } from "framer-motion";

/**
 * Skeleton loader for CatalogCard - matches the actual card dimensions
 */
export function CatalogCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-secondary/50 bg-card shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary/30 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-secondary/40 to-secondary/20 animate-[shimmer_1.5s_infinite]" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-secondary/40" />
        <div className="h-2 w-1/2 animate-pulse rounded bg-secondary/30" />
        <div className="mt-0.5 flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-secondary/40" />
          <div className="h-2 w-1/3 animate-pulse rounded bg-secondary/30" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Skeleton loader for ProjectCard - matches the project card dimensions
 */
export function ProjectCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group relative flex aspect-[4/3] flex-col overflow-hidden rounded-3xl border border-secondary/50 bg-card shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)]"
    >
      <div className="absolute inset-0 animate-pulse bg-secondary/30">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-secondary/40 to-secondary/20 animate-[shimmer_1.5s_infinite]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-90" />
      <div className="relative mt-auto flex flex-1 flex-col justify-end p-6">
        <div className="h-2 w-1/3 animate-pulse rounded bg-primary/30" />
        <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-secondary/40" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-secondary/30" />
      </div>
    </motion.div>
  );
}

/**
 * Skeleton loader for CurtainPreview - matches the preview panel dimensions
 */
export function CurtainPreviewSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-secondary/60 bg-card p-5 lg:p-6"
    >
      <div className="aspect-square rounded-2xl overflow-hidden bg-secondary/30 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-secondary/40 to-secondary/20 animate-[shimmer_1.5s_infinite]" />
      </div>
      <div className="mt-5 flex items-start justify-between gap-3">
        <div className="animate-pulse">
          <div className="h-3 w-24 rounded bg-secondary/40" />
          <div className="mt-1 h-6 w-40 rounded bg-secondary/30" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-lg border border-secondary/30 bg-secondary/20" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 * i }} className="animate-pulse">
            <div className="h-2 w-1/3 rounded bg-secondary/40" />
            <div className="mt-1 h-4 w-3/4 rounded bg-secondary/30" />
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 animate-pulse h-4 w-3/4 rounded bg-secondary/30"
      />
      <div className="mt-4 flex gap-2">
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="btn-ghost-gold flex-1 justify-center text-xs animate-pulse"
        >
          <div className="h-5 w-full animate-pulse rounded bg-secondary/40" />
        </motion.button>
        <motion.a
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="btn-gold flex-1 justify-center animate-pulse"
        >
          <div className="h-5 w-full animate-pulse rounded bg-primary/30" />
        </motion.a>
      </div>
    </motion.div>
  );
}

/**
 * Skeleton loader for the category scroller items
 */
export function CategoryScrollerSkeleton() {
  return (
    <div className="flex cursor-grab gap-3 overflow-x-auto no-scrollbar pb-1 lg:gap-4">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 * i }}
          className="h-28 w-28 shrink-0 animate-pulse rounded-2xl bg-secondary/30"
        />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for subcategory filter pills
 */
export function SubcategoryFilterSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1"
    >
      {[...Array(4)].map((_, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 * i }}
          className="shrink-0 rounded-full border border-secondary/60 px-3 py-1.5 animate-pulse bg-secondary/20"
        >
          <div className="h-3 w-12 animate-pulse rounded bg-secondary/40" />
        </motion.button>
      ))}
    </motion.div>
  );
}

/**
 * Main section skeleton - for the entire catalog section
 */
export function InteractiveCatalogSkeleton() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-background pb-16 pt-4 lg:pb-24"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <motion.span className="eyebrow mb-3 block animate-pulse">
              <div className="h-4 w-24 animate-pulse rounded bg-secondary/40" />
            </motion.span>
            <motion.h2 className="animate-pulse font-display text-3xl font-bold leading-tight lg:text-4xl">
              <div className="h-10 w-48 animate-pulse rounded bg-secondary/40" />
            </motion.h2>
          </div>
          <motion.p className="animate-pulse max-w-md font-body text-sm leading-7">
            <div className="h-5 w-full animate-pulse rounded bg-secondary/30" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-secondary/30" />
          </motion.p>
        </motion.div>

        {/* Category Scroller */}
        <CategoryScrollerSkeleton />

        {/* Subcategory Filter */}
        <SubcategoryFilterSkeleton />

        {/* Main Content Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid gap-8 lg:grid-cols-5"
        >
          {/* Right Panel - Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="lg:col-span-3"
          >
            <CurtainPreviewSkeleton />
          </motion.div>

          {/* Middle Panel - Grid */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-3 flex items-center justify-between"
            >
              <motion.h2 className="animate-pulse font-display text-sm font-bold">
                <div className="h-5 w-24 animate-pulse rounded bg-secondary/40" />
              </motion.h2>
              <motion.span className="animate-pulse font-body text-[11px]">
                <div className="h-4 w-20 animate-pulse rounded bg-secondary/30" />
              </motion.span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="max-h-[560px] overflow-y-auto rounded-2xl border border-secondary/60 bg-card/50 p-3"
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <CatalogCardSkeleton key={i} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}