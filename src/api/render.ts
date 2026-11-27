import { request } from "./core";

export const renderApi = {
  categoriesCoverage() {
    return request("/render/categories-coverage");
  },
  templateFromCategory(category_slug: string, mechanism: string) {
    return request("/render/template/from-category", {
      method: "POST",
      body: { category_slug, mechanism },
    });
  },
  templateAllCategories() {
    return request("/render/template/all-categories", { method: "POST", body: {} });
  },
  stats() {
    return request("/render/stats");
  },
  styles() {
    return request("/render/styles", { auth: false });
  },
};
