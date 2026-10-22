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
  createdAt: "created_date",
  updatedAt: "updated_date",
};

const JSON_FIELDS = new Set([
  "subcategories",
  "images",
  "productsUsed",
  "products_used",
]);

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

  const out: AnyRec = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === "id" || k === "created_date" || k === "updated_date") continue;
    if (k === "password" || k === "password_hash") continue;
    const camel = reverse[k] || k;
    if (JSON_FIELDS.has(camel) || JSON_FIELDS.has(k)) {
      out[camel] = typeof v === "string" ? v : JSON.stringify(v ?? null);
    } else {
      out[camel] = v;
    }
  }

  if (entity === "ConsultationRequest" && out.status == null) {
    out.status = "new";
  }
  if (entity === "Project" && out.featured == null) {
    out.featured = false;
  }

  return out;
}
