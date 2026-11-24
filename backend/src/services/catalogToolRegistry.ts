import { z } from "zod";
import {
  getCurtainModel,
  listCurtainCategories,
  listCurtainProjects,
  searchCurtainModels,
} from "./aiCatalog.js";

/**
 * Single source of truth for catalog tools exposed by the admin Workspace
 * and by the external MCP Worker bridge. The Workspace executes these
 * handlers in-process; the Worker reaches the same handlers through the
 * authenticated HTTP bridge.
 */
export const catalogToolSchemas = {
  list_categories: z.object({}).strict(),
  search_models: z.object({
    query: z.string().max(160).optional(),
    category_slug: z.string().max(100).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }).strict(),
  get_model: z.object({
    id: z.string().trim().min(1).max(128),
  }).strict(),
  list_projects: z.object({
    limit: z.number().int().min(1).max(50).optional(),
  }).strict(),
};

export const catalogToolDescriptions = {
  list_categories:
    "لیست دسته‌بندی‌های واقعی کاتالوگ پرده همراه با slug، مکانیزم و زیردسته‌ها را برمی‌گرداند.",
  search_models:
    "مدل‌های پرده را بر اساس متن، کد، پارچه، رنگ یا slug دسته جست‌وجو می‌کند.",
  get_model: "جزئیات کامل یک مدل پرده را با شناسهٔ id برمی‌گرداند.",
  list_projects: "نمونه‌کارهای واقعی و پروژه‌های اجراشدهٔ پرده آنتیک را برمی‌گرداند.",
};

export type CatalogToolName = keyof typeof catalogToolSchemas;

export async function executeCatalogTool(
  name: CatalogToolName,
  input: unknown,
): Promise<unknown> {
  switch (name) {
    case "list_categories":
      catalogToolSchemas.list_categories.parse(input);
      return listCurtainCategories();
    case "search_models":
      return searchCurtainModels(catalogToolSchemas.search_models.parse(input));
    case "get_model":
      return getCurtainModel(catalogToolSchemas.get_model.parse(input));
    case "list_projects":
      return listCurtainProjects(catalogToolSchemas.list_projects.parse(input));
  }
}
