type AnyRec = Record<string, unknown>;

const FIELD_MAP: Record<string, string> = {
  fullName: "full_name",
  passwordHash: "password_hash",
  categorySlug: "category_slug",
  colorCode: "color_code",
  installImage: "install_image",
  installStatus: "install_status",
  installScore: "install_score",
  installReview: "install_review",
  installPending: "install_pending",
  spaceType: "space_type",
  coverImage: "cover_image",
  productsUsed: "products_used",
  curtainStyle: "curtain_style",
  curtainModelId: "curtain_model_id",
  curtainModelCode: "curtain_model_code",
  designerName: "designer_name",
  wallColor: "wall_color",
  frameColor: "frame_color",
  railColor: "rail_color",
  viewImage: "view_image",
  logoUrl: "logo_url",
  heroSlides: "hero_slides",
  createdAt: "created_date",
  updatedAt: "updated_date",
  inCatalog: "in_catalog",
};

const JSON_FIELDS = new Set([
  "subcategories",
  "images",
  "productsUsed",
  "products_used",
  "heroSlides",
  "hero_slides",
]);

const ALLOWED: Record<string, Set<string>> = {
  CurtainModel: new Set([
    "code",
    "name",
    "categorySlug",
    "subcategory",
    "fabric",
    "color",
    "colorCode",
    "material",
    "texture",
    "image",
    "installImage",
    "installStatus",
    "installScore",
    "installReview",
    "installPending",
    "description",
  ]),
  CurtainCategory: new Set([
    "name",
    "slug",
    "description",
    "image",
    "order",
    "mechanism",
    "subcategories",
    "inCatalog",
  ]),
  PortfolioCategory: new Set([
    "name",
    "slug",
    "description",
    "image",
    "order",
    "subcategories",
  ]),
  Project: new Set([
    "title",
    "description",
    "coverImage",
    "images",
    "categorySlug",
    "subcategory",
  ]),
  ConsultationRequest: new Set([
    "name",
    "phone",
    "email",
    "city",
    "spaceType",
    "message",
    "reference",
    "status",
  ]),
  RenderTemplate: new Set(["style", "image"]),
  InstallReference: new Set(["style", "image", "note"]),
  SavedDesign: new Set([
    "title",
    "image",
    "curtainStyle",
    "curtainModelId",
    "curtainModelCode",
    "color",
    "designerName",
  ]),
  VirtualWindowSetting: new Set(["wallColor", "frameColor", "railColor", "viewImage"]),
  SiteSetting: new Set(["key", "logoUrl", "heroSlides"]),
  User: new Set([]),
};

export function toApi(row: AnyRec | null | undefined): AnyRec | null {
  if (!row) return null;
  const out: AnyRec = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "passwordHash") continue;
    const key = FIELD_MAP[k] || k;
    if (JSON_FIELDS.has(k) || JSON_FIELDS.has(key)) {
      if (typeof v === "string") {
        try {
          out[key] = JSON.parse(v);
        } catch {
          out[key] = v;
        }
      } else {
        out[key] = v;
      }
    } else if (v instanceof Date) {
      out[key] = v.toISOString();
    } else {
      out[key] = v;
    }
  }
  return out;
}

export function toApiList(rows: AnyRec[]) {
  return rows.map((r) => toApi(r)!);
}

export function fromApi(body: AnyRec, entity: string): AnyRec {
  const reverse: Record<string, string> = {};
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    reverse[snake] = camel;
  }

  const allowed = ALLOWED[entity];
  const out: AnyRec = {};

  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    if (k === "id" || k === "created_date" || k === "updated_date" || k === "createdAt" || k === "updatedAt")
      continue;
    if (k === "password" || k === "password_hash" || k === "passwordHash") continue;

    const camel = reverse[k] || k;
    if (allowed && !allowed.has(camel)) continue;

    if (JSON_FIELDS.has(camel) || JSON_FIELDS.has(k)) {
      out[camel] = typeof v === "string" ? v : JSON.stringify(v ?? null);
    } else if (camel === "featured" || camel === "visible" || camel === "inStock" || camel === "inCatalog") {
      out[camel] = v === true || v === "true" || v === 1 || v === "1";
    } else if (camel === "order" || camel === "installScore" || camel === "sortOrder") {
      const n = Number(v);
      out[camel] = Number.isFinite(n) ? n : v;
    } else if (v === null || v === "") {
      out[camel] = null;
    } else {
      out[camel] = v;
    }
  }

  if (entity === "ConsultationRequest" && (out.status == null || out.status === "")) {
    out.status = "new";
  }

  return out;
}
