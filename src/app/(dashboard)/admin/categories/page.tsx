"use client";

import { useEffect, useMemo, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { useCurtainCategories, allCategorySelectOptions } from "@/hooks/useCurtainCategories";
import { api } from "@/api/client";
import { parseSubs, collectSubSlugs } from "@/lib/categoryTree";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  subcategories: string | Array<{ name: string; slug: string }>;
};

/** Build a map: categoryId → parentSlug (empty string for roots). */
function buildParentSlugMap(categories: AdminCategory[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const cat of categories) map.set(cat.id, "");
  for (const parent of categories) {
    for (const sub of parseSubs(parent.subcategories)) {
      const child = categories.find((c) => c.slug === sub.slug);
      if (child) map.set(child.id, parent.slug);
    }
  }
  return map;
}

/** Collect every descendant *id* of a category (excludes self). */
function collectDescendantIdsFor(categories: AdminCategory[], startId: string): Set<string> {
  const found = new Set<string>();
  const queue: string[] = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (found.has(id)) continue;
    found.add(id);
    const cat = categories.find((c) => c.id === id);
    if (!cat) continue;
    for (const sub of parseSubs(cat.subcategories)) {
      const child = categories.find((c) => c.slug === sub.slug);
      if (child && !found.has(child.id)) queue.push(child.id);
    }
  }
  found.delete(startId);
  return found;
}

export default function AdminCategoriesPage() {
  const { categories } = useCurtainCategories();
  const [collectionOptions, setCollectionOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    api.entities.Collection.list("order", 500)
      .then((data) => setCollectionOptions(
        (data as Array<{ id: string; title: string }> || []).map((c) => ({ value: c.id, label: c.title }))
      ))
      .catch(console.error);
  }, []);

  const parentSlugMap = useMemo(() => buildParentSlugMap(categories), [categories]);

  const descendantIdsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const cat of categories) {
      map.set(cat.id, collectDescendantIdsFor(categories, cat.id));
    }
    return map;
  }, [categories]);

  // Convert descendant IDs to descendant slugs for cycle prevention in tree selector
  const descendantSlugsById = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const slugById = new Map(categories.map((c) => [c.id, c.slug]));
    for (const [id, descendantIds] of descendantIdsMap.entries()) {
      const slugs = new Set<string>();
      for (const did of descendantIds) {
        const s = slugById.get(did);
        if (s) slugs.add(s);
      }
      map.set(id, slugs);
    }
    return map;
  }, [descendantIdsMap, categories]);

  // Hierarchical tree options with level for indentation
  const treeOptions = useMemo(() => {
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    const result: Array<{ value: string; label: string; parentSlug?: string | null; level?: number }> = [];

    function walk(slug: string, level: number, parentSlug: string | null) {
      const cat = bySlug.get(slug);
      if (!cat) return;
      result.push({ value: cat.slug, label: cat.name, parentSlug, level });
      for (const sub of parseSubs(cat.subcategories)) {
        walk(sub.slug, level + 1, cat.slug);
      }
    }

    const subSlugs = collectSubSlugs(categories);
    for (const cat of categories) {
      if (!subSlugs.has(cat.slug)) walk(cat.slug, 0, null);
    }
    return result;
  }, [categories]);

  const fields = [
    { key: "name", label: "نام دسته", required: true, placeholder: "مثلاً: شید" },
    {
      key: "slug",
      label: "شناسه انگلیسی",
      required: true,
      placeholder: "shade",
    },
    {
      key: "parentSlug",
      label: "دسته والد",
      type: "tree",
      placeholder: "انتخاب دسته والد…",
      getInitialValue: (record: Record<string, unknown>) => String(parentSlugMap.get(record.id as string) || ""),
      treeOptions,
    },
    {
      key: "mechanism",
      label: "دسته بندی",
      type: "select",
    },
    { key: "order", label: "ترتیب", type: "number", placeholder: "1" },
    {
      key: "in_catalog",
      label: "کاتالوگ دارد",
      type: "boolean",
      default: true,
    },
    { key: "image", label: "کاور", type: "image" },
    { key: "description", label: "توضیح کوتاه", type: "textarea" },
    {
      key: "collectionIds",
      label: "مجموعه‌ها",
      type: "multiselect",
      placeholder: "مجموعه‌ها را انتخاب کنید",
      options: collectionOptions,
    },
  ];

  const columns = [
    {
      key: "image",
      label: "کاور",
      render: (v: unknown) =>
        v ? <img src={String(v)} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    {
      key: "name",
      label: "نام وسلسله‌مراتب",
      render: (_v: unknown, record: Record<string, unknown>) => {
        const cat = categories.find((c) => c.id === record.id);
        if (!cat) return String(record.name);
        const parentSlug = parentSlugMap.get(cat.id) || "";
        const parentName = parentSlug ? categories.find((c) => c.slug === parentSlug)?.name : null;
        const descendantCount = descendantIdsMap.get(cat.id)?.size || 0;
        return (
          <div className="text-right">
            <span className="font-display font-bold text-foreground block">
              {parentSlug ? `↳ ` : ""}{String(record.name)}
            </span>
            {parentName && (
              <span className="font-body text-xs text-muted-foreground block">
                والد: {parentName}
              </span>
            )}
            {descendantCount > 0 && (
              <span className="font-body text-[10px] text-muted-foreground block">
                {descendantCount} زیردسته
              </span>
            )}
          </div>
        );
      },
    },
    { key: "slug", label: "شناسه" },
    {
      key: "mechanism",
      label: "دسته بندی",
      render: (v: unknown) => {
        if (!v) return "—";
        const cat = categories.find((c) => c.slug === String(v).toLowerCase());
        return cat?.name || String(v);
      },
    },
    {
      key: "in_catalog",
      label: "کاتالوگ",
      render: (v: unknown) =>
        v === false || v === 0 || v === "false" ? (
          <span className="text-muted-foreground">خیر</span>
        ) : (
          <span className="font-bold text-primary">بله</span>
        ),
    },
    { key: "order", label: "ترتیب" },
  ];

  return (
    <AdminEntityPage
      title="دسته‌بندی"
      entity="CurtainCategory"
      fields={fields}
      columns={columns}
      sortBy="order"
      options={{
        mechanism: allCategorySelectOptions(categories),
        collectionIds: collectionOptions,
        treeOptions,
      }}
      descendantSlugs={Object.fromEntries(descendantSlugsById) as Record<string, Set<string>>}
    />
  );
}
