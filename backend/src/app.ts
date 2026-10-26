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

app.get("/api/app/public-settings", (_req, res) => {
  res.json({
    id: "antic",
    public_settings: {
      app_name: "پرده آنتیک",
      locale: "fa",
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
