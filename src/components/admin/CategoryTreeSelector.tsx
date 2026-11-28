"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, X, Circle } from "lucide-react";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentSlug?: string | null;
  level: number;
  children: CategoryNode[];
}

interface CategoryTreeSelectorProps {
  value: string;
  onChange: (slug: string) => void;
  options: Array<{ value: string; label: string; parentSlug?: string | null; level?: number }>;
  excludeSlug?: string | null; // current category being edited (prevent self-selection)
  descendantSlugs?: Set<string>; // slugs that would create a cycle
  placeholder?: string;
  className?: string;
}

/**
 * Searchable hierarchical tree selector for category parent picking.
 * Renders roots at level 0, children indented per level.
 * Excludes self and descendants to prevent cycles.
 * "بدون والد (ریشه)" option allows selecting no parent (root category).
 */
export default function CategoryTreeSelector({
  value,
  onChange,
  options,
  excludeSlug = null,
  descendantSlugs = new Set(),
  placeholder = "انتخاب دسته والد…",
  className = "",
}: CategoryTreeSelectorProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Build a map from slug to option for label lookup
  const _optionLabels = useMemo(
    () => new Map(options.map((o) => [o.value, o.label])),
    [options],
  );

  // Build tree: options are flat (slug → label). We need parent-child relationships.
  // Since options from allCategorySelectOptions are flat, we reconstruct hierarchy
  // by matching slugs. Each option's slug IS the category slug; parent-child links
  // come from the options themselves being roots or children.
  // To build a tree we need parent info. We derive it from the options list order
  // and the `excludeSlug`/`descendantSlugs` for cycle prevention.
  //
  // For a proper tree we need each node to know its parent. The options passed in
  // should already be pre-computed with `parentSlug` info. We support two shapes:
  // 1. { value, label } — flat list (all roots, no indentation)
  // 2. { value, label, parentSlug?, level? } — with hierarchy info

  const nodes = useMemo(() => {
    const bySlug = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    for (const o of options) {
      const node: CategoryNode = {
        id: o.value,
        name: o.label,
        slug: o.value,
        parentSlug: o.parentSlug ?? null,
        level: o.level ?? 0,
        children: [],
      };
      bySlug.set(o.value, node);
    }

    for (const node of bySlug.values()) {
      if (node.parentSlug && bySlug.has(node.parentSlug)) {
        bySlug.get(node.parentSlug)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return { bySlug, roots };
  }, [options]);

  // Filter nodes by search text
  const matchesSearch = useCallback(function matchNode(node: CategoryNode): boolean {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    if (node.name.toLowerCase().includes(q)) return true;
    return node.children.some(matchNode);
  }, [search]);

  const filteredRoots = useMemo(() => {
    if (!search.trim()) return nodes.roots;
    return nodes.roots.filter((r) => matchesSearch(r));
  }, [nodes.roots, matchesSearch, search]);

  const isDisabled = useCallback(
    (slug: string): boolean => {
      if (!slug) return false;
      if (slug === excludeSlug) return true;
      if (descendantSlugs.has(slug)) return true;
      return false;
    },
    [excludeSlug, descendantSlugs],
  );

  const isSelected = useCallback((slug: string) => slug === value, [value]);

  const toggleExpand = useCallback((slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const isExpanded = useCallback((slug: string) => expanded.has(slug), [expanded]);

  const renderNode = useCallback(
    (node: CategoryNode, showChildren: boolean): React.ReactNode => {
      const disabled = isDisabled(node.slug);
      const selected = isSelected(node.slug);
      const hasChildren = node.children.length > 0;
      const childrenVisible = showChildren && isExpanded(node.slug) && hasChildren;

      const _visibleChildren = childrenVisible
        ? node.children.filter((c) => matchesSearch(c))
        : [];

      return (
        <div
          key={node.slug}
          className="flex items-center gap-1.5 w-full"
          style={{ paddingLeft: node.level * 18 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.slug);
              }}
              className="flex h-6 w-6 items-center justify-center rounded text-[10px] text-muted-foreground hover:text-primary transition-colors"
              aria-label={isExpanded(node.slug) ? "بستن زیردسته‌ها" : "باز کردن زیردسته‌ها"}
            >
              {isExpanded(node.slug) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <div className="h-6 w-6" />
          )}
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              onChange(node.slug);
            }}
            className={`flex items-center gap-2 w-full rounded-lg border px-3 py-1.5 text-sm font-body transition-colors ${
              selected
                ? "border-primary bg-primary/10 text-primary"
                : disabled
                  ? "border-secondary/50 bg-secondary/20 text-muted-foreground cursor-not-allowed"
                  : "border-transparent bg-background/40 text-foreground hover:bg-secondary hover:text-primary"
            }`}
            disabled={disabled}
            title={disabled
              ? excludeSlug === node.slug
                ? "این دسته است (نمی‌تواند والد خود باشد)"
                : "انتخاب این دسته چکر چرخه ایجاد می‌کند"
              : undefined}
          >
            {selected && <Circle className="h-3 w-3 fill-primary" />}
            <span className={disabled ? "italic opacity-60" : ""}>{node.name}</span>
          </button>
        </div>
      );
    },
    [isDisabled, isSelected, toggleExpand, isExpanded, matchesSearch, onChange, excludeSlug],
  );

  return (
    <div className={`relative w-full ${className}`}>
      <div className="flex gap-2 mb-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={search ? "" : placeholder}
          className="w-full rounded-xl border border-secondary bg-background px-4 py-2 font-body text-sm outline-none focus:border-primary placeholder:text-muted-foreground/60"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="rounded-xl border border-secondary bg-secondary/5 px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary/60"
            aria-label="پاک کردن جستجو"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div
        className="max-h-60 overflow-y-auto border border-secondary rounded-xl bg-background/50 p-1.5"
        role="listbox"
      >
        {/* Root (no parent) option */}
        <button
          type="button"
          onClick={() => onChange("")}
          className={`flex items-center gap-2 w-full rounded-lg border px-3 py-1.5 text-sm font-body transition-colors ${
            value === ""
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent bg-background/40 text-foreground hover:bg-secondary hover:text-primary"
          }`}
        >
          <Circle className="h-3 w-3 fill-primary" />
          <span>بدون والد (ریشه)</span>
        </button>

        {filteredRoots.map((root) => (
          <div key={root.slug} className="mb-1">
            {renderNode(root, true)}
          </div>
        ))}

        {filteredRoots.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground text-center">
            نتیجه‌ای پیدا نشد
          </div>
        )}
      </div>
    </div>
  );
}
