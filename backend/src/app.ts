import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.js";
import entityRoutes from "./routes/entities.js";
import uploadRoutes from "./routes/upload.js";
import functionRoutes from "./routes/functions.js";
import catalogRoutes from "./routes/catalog.js";
import orderRoutes from "./routes/orders.js";
import agentRoutes from "./routes/agents.js";
import mcpRoutes from "./routes/mcp.js";
import renderRoutes from "./routes/render.js";
import searchRoutes from "./routes/search.js";
import { HttpError, sendError } from "./lib/errors.js";
import { prisma } from "./lib/prisma.js";

const app = express();

const origin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: origin.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(path.resolve(uploadDir)));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "antic-backend" });
});

const DEFAULT_HERO = [
  {
    space: "پذیرایی",
    title: "فضای پذیرایی",
    subtitle: "پرده‌های شیک برای فضای پذیرایی",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/2be489b62_generated_image.png",
  },
  {
    space: "آشپزخانه",
    title: "آشپزخانه",
    subtitle: "کنترل نور و هماهنگی با دکوراسیون آشپزخانه",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e29f4aed1_generated_image.png",
  },
  {
    space: "اتاق خواب",
    title: "اتاق خواب",
    subtitle: "حریم خصوصی و آرامش برای اتاق خواب",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/58350d5ba_generated_image.png",
  },
  {
    space: "فضاهای ویژه",
    title: "فضاهای ویژه",
    subtitle: "راهکار اختصاصی برای فضاهای خاص",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/7480c6599_generated_image.png",
  },
];

app.get("/api/app/public-settings", async (_req, res) => {
  let logo_url: string | null = null;
  let hero_slides = DEFAULT_HERO;

  try {
    const row = await prisma.siteSetting.findFirst({
      where: { key: "main" },
      orderBy: { updatedAt: "desc" },
    });
    if (row?.logoUrl) logo_url = row.logoUrl;
    if (row?.heroSlides) {
      try {
        const parsed = JSON.parse(row.heroSlides);
        if (Array.isArray(parsed) && parsed.length) {
          hero_slides = parsed
            .filter((s) => s && (s.image || s.title))
            .map((s) => ({
              space: String(s.space || s.title || ""),
              title: String(s.title || s.space || ""),
              subtitle: String(s.subtitle || ""),
              image: String(s.image || ""),
            }));
        }
      } catch {
        /* keep default */
      }
    }
  } catch {
    /* db offline — defaults */
  }

  res.json({
    id: "antic",
    public_settings: {
      app_name: "پرده آنتیک",
      locale: "fa",
      logo_url,
      hero_slides,
      ai: {
        design_consultant: "local-catalog",
        mcp: true,
        install_engine: "server-chroma-composite",
        image_generation_external: false,
      },
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/entities", entityRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/functions", functionRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/mcp", mcpRoutes);
app.use("/api/render", renderRoutes);
app.use("/api/search", searchRoutes);

app.use((_req, _res, next) => {
  next(new HttpError(404, "Not found"));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(res, err);
});

export default app;
