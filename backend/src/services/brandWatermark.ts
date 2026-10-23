import fs from "fs";
import path from "path";

/** Composite Antic brand mark onto rendered install image via sharp. */
export async function applyBrandWatermark(
  sharp: typeof import("sharp").default,
  image: import("sharp").Sharp,
  width: number,
  height: number
): Promise<import("sharp").Sharp> {
  const logoCandidates = [
    path.join(process.cwd(), "public/brand/mark.svg"),
    path.join(process.cwd(), "../public/brand/mark.svg"),
    path.join(process.cwd(), "public/brand/logo.svg"),
  ];
  let logoPath: string | null = null;
  for (const c of logoCandidates) {
    if (fs.existsSync(c)) {
      logoPath = c;
      break;
    }
  }
  if (!logoPath) return image;

  const markW = Math.max(72, Math.round(width * 0.11));
  const markBuf = await sharp(logoPath)
    .resize(markW, markW, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const left = Math.round(width * 0.04);
  const top = Math.round(height * 0.22);
  return image.composite([{ input: markBuf, left, top, blend: "over" }]);
}
