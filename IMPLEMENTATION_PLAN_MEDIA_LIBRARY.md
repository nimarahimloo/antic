# Central Media Library — Implementation Plan
**Project:** Pardeh Antic (Next.js 16 + Express + Prisma + SQLite)  
**Scope:** Centralize all image uploads behind a `Media` + `MediaUsage` data model so every entity field (image, gallery, coverImage, backgroundImage, logoUrl, heroSlides, viewImage, etc.) points to one canonical media record.

**Source of truth for conventions:** `AGENTS.md` — keep CurtainCategory vs ShopCategory separate, no hardcoded slug lists, frontend TS/TSX only, run `npm run lint` after meaningful changes, model changes only in `backend/prisma/schema.prisma` then `prisma generate && prisma db push`.

---

## Design summary (keep in mind while implementing)

| Concern | Decision |
|---------|----------|
| Storage | Keep using `./uploads` (already wired at `/uploads`), add a `media/` subfolder so legacy files don't collide. |
| Public URL | `/uploads/media/<hash>/<filename>` stored in `Media.url`. |
| Auth | Media CRUD is admin-only (`requireAdmin`) except public listing/read which can stay open (images are public assets). Delete requires usage check — refuse if `MediaUsage` rows exist unless `force=true`. |
| Dedup | `sha256` content hash; if an identical hash already exists, reuse the existing `Media` record instead of writing a new file. |
| Frontend | `compressImage` stays (converts to JPEG). MediaPicker is a Radix Dialog modal with single/multi mode, list/grid view, search, and "upload from device" that calls the new media API. |
| Integration | Each of the 10 current `UploadPublicFile` call sites gains a "choose from library" button wired to MediaPicker, while direct device upload is routed through the new media API (creating a `Media` record + `MediaUsage` link). |

---

## Phase 0 — Prerequisites (no code yet)

1. Ensure backend & frontend are running locally per `AGENTS.md` ("راه‌اندازی لوکال").
2. Confirm `sharp` is installed (it is: `backend/package.json` line 49) — will be used for dimensions + SVG handling.
3. Run `npm run typecheck` (root) and `cd backend && npm run typecheck` to establish a green baseline.

---

## Phase 1 — Prisma schema: Media + MediaUsage models

**File:** `backend/prisma/schema.prisma`

Append after the `AIMemory` model (end of file). Do NOT create a second schema copy.

```prisma
/// Central media library — one canonical record per uploaded image.
/// Every image field across entities now references Media via MediaUsage.
model Media {
  id          String   @id @default(cuid())
  /// Stored filename on disk (under uploads/media/...)
  filename    String
  originalName String
  mimeType    String   // image/jpeg | image/png | image/webp | image/gif | image/svg+xml
  size        Int      // bytes
  width       Int?
  height      Int?
  /// Relative path under the upload dir, e.g. media/2026/11/abcd1234.jpg
  storagePath String
  /// Public URL served by /uploads static middleware, e.g. /uploads/media/.../abcd1234.jpg
  url         String
  sha256      String?   @unique // content hash for deduplication
  alt         String?
  caption     String?
  title       String?
  uploadedById String?
  uploadedBy  User?     @relation(fields: [uploadedById], references: [id], onDelete: SetNull)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  usages      MediaUsage[]

  @@index([uploadedById])
  @@index([sha256])
  @@index([mimeType])
  @@index([createdAt])
  @@index([url])
}

/// Join-like usage log: which entity field references which media.
/// Used for the "delete with usage check" guard and for back-filling alt/caption.
model MediaUsage {
  id        String   @id @default(cuid())
  mediaId   String
  media     Media    @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  /// e.g. "CurtainCategory" | "CurtainModel" | "Product" | "PortfolioCategory" |
  ///      "Project" | "RenderTemplate" | "InstallReference" | "SavedDesign" |
  ///      "Collection" | "VirtualWindowSetting" | "SiteSetting" | "ShopCategory"
  entityType String
  entityId  String
  /// e.g. "image" | "gallery" | "backgroundImage" | "coverImage" | "viewImage" | "logoUrl" | "heroSlides" | "pageHeroes"
  fieldName String
  createdAt DateTime @default(now())

  @@index([mediaId])
  @@index([entityType, entityId])
  @@index([entityType, entityId, fieldName])
}
```

**Apply it:**
```bash
cd backend && npx prisma generate && npx prisma db push
```

**Verification:** `npx prisma studio` (optional) or query `GET /api/entities/Media` once the entity route is extended (Phase 4).

---

## Phase 2 — Backend media validation service

**File:** `backend/src/services/mediaValidation.ts` (new)

Responsibilities:
1. **File signature (magic bytes)** — read the first bytes of the buffer and detect JPEG/PNG/WEBP/GIF/SVG. Reject anything whose signature doesn't match an allowed image type, regardless of the `Content-Type` header or extension.
2. **MIME verification** — cross-check detected signature against `file.mimetype`; reject mismatches (mime-type sniffing / extension spoofing).
3. **Dimensions** — use `sharp` to read width/height (works for JPEG/PNG/WEBP/GIF; SVG via sharp too). Enforce max dimensions (e.g. 4096×4096) and a min (e.g. 1×1).
4. **SVG sanitization** — for `image/svg+xml`, strip `<script>`, event-handler attributes (`on*`), `href`/`xlink:href` pointing to `javascript:`/`data:`, and `<foreignObject>`/`<iframe>`; if the SVG is empty/unsafe after cleaning, reject. (Keep it dependency-light: string/regex-based sanitizer on Node; no `jsdom`/`DOMPurify` unless already present.)
5. **Size limit** — reuse existing 12 MB cap (or a `MAX_MEDIA_BYTES` env, default `12 * 1024 * 1024`).

Exports:
- `validateMediaFile(buffer: Buffer, opts?: { mimeType?: string; originalName?: string; maxBytes?: number; maxDim?: number }): Promise<MediaInfo>`
  where `MediaInfo = { mimeType, width, height, size, sha256, isSvg, safeSvg?: string }`.
- `computeSha256(buffer): string`
- `sanitizeSvg(xml: string): string` (returns cleaned SVG or throws).

**Note:** `sharp` is already a dependency; import it in this service only.

---

## Phase 3 — Backend media routes

**File:** `backend/src/routes/media.ts` (new)

Router mounted at `/api/media`. All mutating routes use `requireAdmin`; list/read can be public (images are public assets) but require auth for write.

Endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | none (or optionalAuth) | List media with pagination (`?limit`, `?offset`, `?search`, `?mimeType`, `?sort_by`). Returns `{ items: Media[], total }`. |
| POST | `/` | requireAdmin | `multer.single("file")` → validate via mediaValidation → sha256 dedup check → write file to `uploads/media/<date>/` → create `Media` record → return `{ media }`. |
| GET | `/:id` | none | Get one Media record by id (return 404 if missing). |
| PATCH | `/:id` | requireAdmin | Update metadata only (`alt`, `caption`, `title`). Returns updated `Media`. |
| DELETE | `/:id` | requireAdmin | Check `MediaUsage.count({ where: { mediaId: id } })`; if > 0 and `?force=true` not set → 409 with usage list. Otherwise delete file from disk + `MediaUsage` rows + `Media` record. |

Response shape for upload:
```json
{
  "media": {
    "id": "...",
    "url": "/uploads/media/.../file.jpg",
    "mimeType": "image/jpeg",
    "width": 1200,
    "height": 800,
    "size": 234567,
    "sha256": "...",
    "originalName": "photo.jpg"
  }
}
```

**Storage layout:** `uploads/media/YYYY/MM/<sha256-prefix>-<random>.<ext>` so files are spread across subfolders and dedup by sha256 is easy.

**File:** `backend/src/lib/mediaStorage.ts` (new, optional helper)
- `storagePathFor(sha256, ext): string`
- `deleteFileIfExists(storagePath): void`
- `ensureUploadDir(): void`

Reuse the existing `uploadDir = process.env.UPLOAD_DIR || "./uploads"` convention from `upload.ts`/`app.ts`.

---

## Phase 4 — Mount routes in app.ts

**File:** `backend/src/app.ts`

1. Add import (near line 9, after `import uploadRoutes from "./routes/upload.js"`):
   ```ts
   import mediaRoutes from "./routes/media.js";
   ```
2. Add mount (near line 426, after `app.use("/api/upload", uploadRoutes);`):
   ```ts
   app.use("/api/media", mediaRoutes);
   ```

Keep `/api/upload` as-is (legacy/public virtual-studio upload); new media library goes through `/api/media`.

---

## Phase 5 — Frontend API client additions

**File:** `src/api/client.ts`

Add a `Media` type and a `media` namespace inside the `api` object (after `integrations`, or alongside it).

Types to add (near the top imports / type block):
```ts
export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  storagePath: string;
  url: string;
  sha256?: string;
  alt?: string;
  caption?: string;
  title?: string;
  uploadedById?: string;
  createdAt: string;
  updatedAt: string;
}
export interface MediaListResponse { items: Media[]; total: number; }
```

Add to `export const api = { ... }`:
```ts
media: {
  async list(opts?: {
    limit?: number; offset?: number; search?: string; mimeType?: string; sort_by?: string;
  }): Promise<MediaListResponse> {
    const q = new URLSearchParams();
    if (opts?.limit) q.set("limit", String(opts.limit));
    if (opts?.offset !== undefined) q.set("offset", String(opts.offset));
    if (opts?.search) q.set("search", opts.search);
    if (opts?.mimeType) q.set("mimeType", opts.mimeType);
    if (opts?.sort_by) q.set("sort_by", opts.sort_by);
    return request(`/media?${q}`, { auth: false }) as Promise<MediaListResponse>;
  },
  async upload(file: File): Promise<Media> {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/media`, { method: "POST", headers, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || "آپلود رسانه ناموفق بود", { status: res.status, data });
    return data.media as Media;
  },
  async get(id: string): Promise<Media> {
    return request(`/media/${encodeURIComponent(id)}`, { auth: false }) as Promise<Media>;
  },
  async update(id: string, body: { alt?: string; caption?: string; title?: string }): Promise<Media> {
    return request(`/media/${encodeURIComponent(id)}`, { method: "PATCH", body }) as Promise<Media>;
  },
  async delete(id: string, force = false): Promise<void> {
    await request(`/media/${encodeURIComponent(id)}?${force ? "force=true" : ""}`, { method: "DELETE" });
  },
},
```

**Convention:** keep `api.integrations.Core.UploadPublicFile` working (don't remove it) so legacy call sites don't break until migrated in Phase 8.

---

## Phase 6 — Frontend MediaPicker component (modal, single/multi select)

**File:** `src/components/media/MediaPicker.tsx` (new)

A Radix UI `Dialog`-based modal (`@radix-ui/react-dialog` already a dependency per AGENTS.md). Props:

```ts
interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "single" | "multi";
  max?: number;                 // for multi mode
  onSelect: (media: Media | Media[]) => void;
  accept?: string;              // e.g. "image/*"
  title?: string;               // default "انتخاب تصویر"
}
```

Features:
- Dialog overlay + content (Tailwind), RTL-friendly (Persian labels).
- Tabbed: "کتابخانه" (library list) / "آپلود از دستگاه" (device upload).
- Library tab: calls `api.media.list(...)`, renders a grid of image thumbnails with checkmarks/radio, search filter (`search` debounced), pagination/load-more, selected count badge, "ثبت انتخاب" confirm button.
- Upload tab: file input → `compressImage` → `api.media.upload(file)` → refresh list, auto-select newly uploaded.
- Empty state, error state, loading spinner.
- Returns selected media via `onSelect`.

Use `lucide-react` icons (`Image`, `Upload`, `Search`, `X`, `CheckCircle`, `Plus`). Tailwind classes consistent with existing admin UI.

---

## Phase 7 — Frontend MediaLibrary page component

**File:** `src/app/(dashboard)/admin/media/page.tsx` (new)

A standalone admin page (route `/admin/media`) so editors can browse/manage the library directly.

Contents:
- Server/client component that calls `api.media.list` (client-side via TanStack Query or useEffect — match existing admin page style).
- Grid of media cards: thumbnail, filename, dimensions, size, upload date, `alt`/`caption` editable inline (calls `api.media.update`), "استفاده در" usage count (from a new optional `GET /api/media/:id/usages` — see note below), delete button with usage-check handling (shows 409 message with list of referencing entities).
- "آپلود جدید" button opening MediaPicker in multi mode.
- Bulk delete (optional, phase-out).

*Note:* If a `GET /api/media/:id/usages` endpoint is desired, add it to `backend/src/routes/media.ts` in Phase 3; otherwise derive usage count client-side is not possible without an endpoint, so either add the endpoint or hide usage count until added. Recommendation: add `GET /api/media/:id/usages` returning `{ usages: [{ entityType, entityId, fieldName }] }` in Phase 3.

---

## Phase 8 — Integration points (all 10 upload locations)

For each location below: keep the direct-device-upload path working but route it through `api.media.upload` (create Media record) and store `media.url` in the form field; add a "انتخاب از کتابخانه médias" button that opens `MediaPicker` and sets the field from `media.url`. For gallery fields, support multi-select and append to the gallery array.

Files to edit:

1. **`src/components/admin/AdminEntityPage.tsx`** — `uploadImage(fieldKey, file)` (line ~467) and `uploadGallery(...)` (line ~486). Replace `api.integrations.Core.UploadPublicFile` with `api.media.upload`; set `form[fieldKey] = res.url`. Add MediaPicker trigger for image + gallery fields.
2. **`src/app/(dashboard)/admin/settings/page.tsx`** — line ~100-101 (logo upload). Route logo through `api.media.upload`; set `logoUrl`. Add MediaPicker for logo/hero images.
3. **`src/app/(dashboard)/admin/products/page.tsx`** — lines ~81, 85 (cover + gallery). Route cover + gallery through media API. Add MediaPicker for cover image and gallery.
4. **`src/app/(dashboard)/admin/window/page.tsx`** — lines ~109-110 (view image). Route `viewImage` through media API. Add MediaPicker.
5. **`src/app/(dashboard)/admin/fabric-library/page.tsx`** — line ~56 (background image). Route `backgroundImage` through media API. Add MediaPicker.
6. **`src/app/(dashboard)/admin/bulk-upload/page.tsx`** — lines ~69-70. Route each uploaded file through `api.media.upload`; collect URLs.
7. **`src/components/admin/InstallReferenceManager.tsx`** — lines ~67-68. Route install image through media API; store `image: url`. Add MediaPicker.
8. **`src/components/admin/RenderTemplateManager.tsx`** — lines ~96-97. Route template image through media API. Add MediaPicker.
9. **`src/components/admin/AdminPageHeroes.tsx`** — lines ~94-95. Route hero images through media API. Add MediaPicker.
10. **`src/components/agent/FloatingBot.tsx`** — lines ~206-207. Route uploaded image through media API. Add MediaPicker.

For each, the minimal change is:
- Import `MediaPicker` + `compressImage` (already imported).
- Add `const [pickerOpen, setPickerOpen] = useState(false)` and `const [selectedMedia, setSelectedMedia] = useState<Media | Media[] | null>(null)`.
- Replace the `UploadPublicFile({ file: compressed })` call with `api.media.upload(compressed)` → `res.url`.
- Add a button "در کتابخانه medios انتخاب کن" → `setPickerOpen(true)`.
- Render `<MediaPicker open={pickerOpen} onOpenChange={setPickerOpen} mode="single" onSelect={(m) => { setField(m.url); setPickerOpen(false); }} />`.

**MediaUsage back-fill (optional but recommended):** after setting a field to a media URL, call a server action / backend endpoint to create a `MediaUsage` row (`mediaId`, `entityType`, `entityId`, `fieldName`). This requires an endpoint `POST /api/media/usages` (add to Phase 3 routes) or reuse entity update. If not done in this iteration, deletion guard still works based on whatever rows exist; mark as "Phase 9 enhancement".

---

## Phase 9 — Test files

**Backend (run against a live backend on :3001):**

**File:** `backend/scripts/media-validation.test.mjs` (new)
- Unit tests for `mediaValidation`: JPEG/PNG/WEBP/GIF magic-byte detection, MIME mismatch rejection, non-image rejection (PDF/EXE text renamed to .jpg), dimension extraction, SVG sanitization (script removal, javascript: href rejection), size limit enforcement.

**File:** `backend/scripts/media-routes.test.mjs` (new)
- Functional tests needing `BASE=http://localhost:3001` backend running:
  - `POST /api/media` upload → 201 with `media.url`, `media.mimeType`, `media.width/height`, `media.sha256`.
  - Dedup: upload same bytes twice → same `media.id` (sha256 match), one file on disk.
  - `GET /api/media` → list with pagination.
  - `GET /api/media/:id` → 200; missing id → 404.
  - `PATCH /api/media/:id` (admin) → updates alt/caption/title.
  - `DELETE /api/media/:id` with no usages → 200 + file removed from disk.
  - `DELETE /api/media/:id` with a `MediaUsage` row → 409 unless `?force=true`.
  - Non-admin token → 403 on mutating routes.

Run with:
```bash
BASE=http://localhost:3001 node --import tsx backend/scripts/media-validation.test.mjs
BASE=http://localhost:3001 node --import tsx backend/scripts/media-routes.test.mjs
```
Or add to `backend/package.json` scripts: `"test:media": "..."`.

**Frontend:** no frontend test runner is configured in `AGENTS.md`; add a note to verify MediaPicker/MediaLibrary manually (open `/admin/media`, open each of the 10 integration pages, confirm library + device upload both work). If a runner is added later, place component tests under `src/components/media/__tests__/`.

---

## Phase 10 — Verification & cleanup

```bash
# root
npm run lint
npm run typecheck
# backend
cd backend && npm run typecheck && npm run db:generate && npm run db:push
# restart backend dev server, then
cd .. && npm run dev          # frontend
```

- Open `/admin/media` → library loads, upload works, delete works.
- Open each of the 10 integration pages → device upload and library pick both set the correct field.
- Confirm no `.env` or `dev.db` is committed (`.gitignore` already handles this per AGENTS.md).
- Confirm no duplicate `.js`/`.ts` files were created.

---

## Migration note for existing image strings

Existing entity fields (`CurtainCategory.image`, `Product.image`, etc.) already hold `/uploads/...` URL strings. This plan keeps them as strings; `MediaUsage` rows are created **going forward** for new uploads. Back-filling `MediaUsage` for legacy URLs (parsing the URL to find-or-create a `Media` record) is a separate, optional migration step not required for the library to function.
