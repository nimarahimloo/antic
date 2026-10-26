/**
 * پس از هر دیپلوی: وضعیت قالب سبز دسته‌ها را چک کن — بدون پاک‌کردن آپلود ادمین.
 *
 *   cd backend && npm run chroma:ensure
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const uploadDir = process.env.UPLOAD_DIR || "./uploads";

function fileOk(image) {
  if (!image) return false;
  if (image.startsWith("http")) return true;
  const local = path.join(path.resolve(uploadDir), path.basename(image));
  try {
    return fs.existsSync(local) && fs.statSync(local).size > 100;
  } catch {
    return false;
  }
}

async function main() {
  fs.mkdirSync(path.resolve(uploadDir), { recursive: true });

  const cats = await prisma.curtainCategory.findMany({
    select: { slug: true, name: true },
    orderBy: { order: "asc" },
  });
  const templates = await prisma.renderTemplate.findMany();
  const byStyle = new Map(templates.map((t) => [String(t.style).toLowerCase(), t]));

  let kept = 0;
  let missing = 0;
  let broken = 0;

  console.log(`UPLOAD_DIR=${path.resolve(uploadDir)}`);
  console.log(`Categories=${cats.length}  RenderTemplates=${templates.length}`);
  console.log("---");

  for (const c of cats) {
    const key = String(c.slug || "").toLowerCase();
    if (!key) continue;
    const t = byStyle.get(key);
    if (t?.image && fileOk(t.image)) {
      kept++;
      console.log(`✓ kept   ${key}  ${t.image}`);
    } else if (t?.image) {
      broken++;
      console.log(`✗ broken ${key}  file missing: ${t.image}`);
    } else {
      missing++;
      console.log(`· missing ${key}  (${c.name})`);
    }
  }

  console.log("---");
  console.log(`kept=${kept}  missing=${missing}  broken-file=${broken}`);
  console.log("نکته: uploads را volume دائمی نگه دارید تا با دیپلوی پاک نشود.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
