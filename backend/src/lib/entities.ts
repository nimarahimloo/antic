import { prisma } from "./prisma.js";

export const ENTITY_MAP = {
  CurtainModel: {
    model: prisma.curtainModel,
    publicRead: true,
    publicCreate: false,
  },
  CurtainCategory: {
    model: prisma.curtainCategory,
    publicRead: true,
    publicCreate: false,
  },
  PortfolioCategory: {
    model: prisma.portfolioCategory,
    publicRead: true,
    publicCreate: false,
  },
  Project: {
    model: prisma.project,
    publicRead: true,
    publicCreate: false,
  },
  ConsultationRequest: {
    model: prisma.consultationRequest,
    publicRead: false,
    publicCreate: true,
  },
  RenderTemplate: {
    model: prisma.renderTemplate,
    publicRead: true,
    publicCreate: false,
  },
  InstallReference: {
    model: prisma.installReference,
    publicRead: true,
    publicCreate: false,
  },
  SavedDesign: {
    model: prisma.savedDesign,
    publicRead: true,
    publicCreate: true,
  },
  VirtualWindowSetting: {
    model: prisma.virtualWindowSetting,
    publicRead: true,
    publicCreate: false,
  },
  User: {
    model: prisma.user,
    publicRead: false,
    publicCreate: false,
  },
} as const;

export type EntityName = keyof typeof ENTITY_MAP;

export function isEntityName(name: string): name is EntityName {
  return name in ENTITY_MAP;
}

const SORTABLE: Record<string, true> = {
  createdAt: true,
  updatedAt: true,
  name: true,
  title: true,
  order: true,
  code: true,
  slug: true,
  categorySlug: true,
  status: true,
  style: true,
  email: true,
};

export function parseSort(sortBy?: string): Record<string, "asc" | "desc"> {
  if (!sortBy) return { createdAt: "desc" };
  const desc = sortBy.startsWith("-");
  let key = desc ? sortBy.slice(1) : sortBy;
  const map: Record<string, string> = {
    created_date: "createdAt",
    updated_date: "updatedAt",
    category_slug: "categorySlug",
    cover_image: "coverImage",
    full_name: "fullName",
    order: "order",
  };
  key = map[key] || key;
  if (!SORTABLE[key]) return { createdAt: "desc" };
  return { [key]: desc ? "desc" : "asc" };
}

export function parseFilter(filter: Record<string, unknown> = {}) {
  const map: Record<string, string> = {
    category_slug: "categorySlug",
    install_status: "installStatus",
    curtain_model_id: "curtainModelId",
  };
  const where: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object") continue;
    where[map[k] || k] = v;
  }
  return where;
}
