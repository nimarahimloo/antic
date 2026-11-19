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
import accountRoutes from "./routes/account.js";
import { HttpError, sendError } from "./lib/errors.js";
import { prisma } from "./lib/prisma.js";
import { buildSitemap } from "./lib/sitemap.js";
import { wantsMarkdown, countTokens, pageMarkdown } from "./lib/markdown.js";

const app = express();

const origin = process.env.CORS_ORIGIN || "http://localhost:3000";
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
    image: "/images/migrated/2be489b62_generated_image.png",
  },
  {
    space: "آشپزخانه",
    title: "آشپزخانه",
    subtitle: "کنترل نور و هماهنگی با دکوراسیون آشپزخانه",
    image: "/images/migrated/e29f4aed1_generated_image.png",
  },
  {
    space: "اتاق خواب",
    title: "اتاق خواب",
    subtitle: "حریم خصوصی و آرامش برای اتاق خواب",
    image: "/images/migrated/58350d5ba_generated_image.png",
  },
  {
    space: "فضاهای ویژه",
    title: "فضاهای ویژه",
    subtitle: "راهکار اختصاصی برای فضاهای خاص",
    image: "/images/migrated/7480c6599_generated_image.png",
  },
];

app.get("/api/app/public-settings", async (_req, res) => {
  let logo_url: string | null = null;
  let hero_slides = DEFAULT_HERO;
  let page_heroes: Record<string, unknown> = {};

  try {
    const row = await prisma.siteSetting.findFirst({
      where: { key: "main" },
      orderBy: { updatedAt: "desc" },
    });
    if (row?.logoUrl) logo_url = row.logoUrl;
    if (row?.pageHeroes) {
      try {
        const ph = JSON.parse(row.pageHeroes);
        if (ph && typeof ph === "object") page_heroes = ph;
      } catch {
        /* */
      }
    }
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
      page_heroes,
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
app.use("/api/account", accountRoutes);
app.use("/api/entities", entityRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/functions", functionRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/mcp", mcpRoutes);
app.use("/api/render", renderRoutes);
app.use("/api/search", searchRoutes);

/** Public XML sitemap at site root — regenerated from the DB on every request
 *  so it always reflects published / removed content. */
app.get("/sitemap.xml", async (_req, res) => {
  try {
    const xml = await buildSitemap();
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.status(200).send(xml);
  } catch (err) {
    sendError(res, err);
  }
});

/** robots.txt pointing at the sitemap. */
app.get("/robots.txt", (_req, res) => {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(
    `User-agent: *\nAllow: /\n\nSitemap: ${process.env.PUBLIC_BASE_URL || "https://pardehantic.ir"}/sitemap.xml\n`
  );
});

/** Base URL for discovery documents. */
function publicBaseUrl(req?: { protocol: string; get: (h: string) => string | undefined }): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  if (req) {
    const host = req.get("host") || "localhost:3001";
    const proto = req.get("x-forwarded-proto") || req.protocol || "http";
    return `${proto}://${host}`;
  }
  return "https://pardehantic.ir";
}

/**
 * OAuth Protected Resource Metadata (RFC 9728).
 * Advertises this service as a resource server that accepts bearer tokens
 * in the Authorization header and identifies its own authorization server.
 */
app.get("/.well-known/oauth-protected-resource", (_req, res) => {
  const base = publicBaseUrl();
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    resource: base,
    authorization_servers: [base],
    scopes_supported: ["openid", "profile", "email", "agent:read", "agent:write"],
    bearer_methods_supported: ["header"],
  });
});

/**
 * OAuth Authorization Server Metadata (RFC 8414).
 * Self-issued: this service is both the resource server and the
 * authorization server for agent registration and JWT issuance.
 */
app.get("/.well-known/oauth-authorization-server", (_req, res) => {
  const base = publicBaseUrl();
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    issuer: base,
    authorization_endpoint: `${base}/api/auth/google`,
    token_endpoint: `${base}/api/auth/login`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    registration_endpoint: `${base}/api/auth/register`,
    revocation_uri: `${base}/api/auth/logout`,
    scopes_supported: ["openid", "profile", "email", "agent:read", "agent:write"],
    response_types_supported: ["code", "token"],
    grant_types_supported: ["authorization_code", "password", "client_credentials"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    identity_types_supported: ["identity_assertion", "anonymous"],
    identity_assertion: {
      assertion_types_supported: [
        "urn:ietf:params:oauth:token-type:id-jag",
        "verified_email",
      ],
    },
    anonymous: {
      credential_types_supported: ["bearer"],
    },
    claim_uri: `${base}/api/auth/me`,
    events_supported: ["revocation"],
  });
});

/**
 * JSON Web Key Set (RFC 7517).
 * This service signs JWTs with HS256 (symmetric), so no public keys are
 * published. An empty key set is a valid JWKS.
 */
app.get("/.well-known/jwks.json", (_req, res) => {
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({ keys: [] });
});

/**
 * OpenID Connect Discovery (OpenID Connect Discovery 1.0).
 * Mirrors the OAuth 2.0 Authorization Server Metadata so OIDC clients
 * and agents can discover this service's endpoints.
 */
app.get("/.well-known/openid-configuration", (_req, res) => {
  const base = publicBaseUrl();
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    issuer: base,
    authorization_endpoint: `${base}/api/auth/google`,
    token_endpoint: `${base}/api/auth/login`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    registration_endpoint: `${base}/api/auth/register`,
    revocation_uri: `${base}/api/auth/logout`,
    scopes_supported: ["openid", "profile", "email", "agent:read", "agent:write"],
    response_types_supported: ["code", "token", "id_token"],
    grant_types_supported: ["authorization_code", "password", "client_credentials"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    id_token_signing_alg_values_supported: ["HS256"],
    subject_types_supported: ["public"],
  });
});

/**
 * Auth.md — Agent Registration Discovery.
 * Self-contained markdown describing the agent audience, registration
 * endpoint(s), supported methods, and credential use.
 */
app.get("/auth.md", async (_req, res) => {
  const base = publicBaseUrl();
  const md = `# auth.md

پرده آنتیک — پلتفرم فروش و اجرای پرده لوکس.

## Agent Audience

igkeiten (\`agents\`) و کلاینت‌های هواشناسی می‌توانند با ثبت‌نام در این API به منابع محفوظ دسترسی یابند.

## Registration

ثبت‌نام агент با فراخوانی \`POST ${base}/api/auth/register\` انجام می‌شود. در صورت موفقیت، یک توکن JWT دریافت می‌کنید.

## Credential Use

تکنیک احراز هویت: توکن bearer (JWT) را در هدر \`Authorization\` به صورت \`Bearer <token>\` ارسال کنید. توکن را از پاسخ ثبت‌نام یا ورود دریافت می‌کنید.

## agent_auth

- skill: markdown-negotiation
- register_uri: ${base}/api/auth/register
- methods:
  - type: oauth2
    authorization_endpoint: ${base}/.well-known/oauth-authorization-server
    token_endpoint: ${base}/api/auth/login
    scopes: [openid, profile, email]

## OAuth Protected Resource Metadata

\`${base}/.well-known/oauth-protected-resource\`

## OAuth Authorization Server Metadata

\`${base}/.well-known/oauth-authorization-server\`
`;
  res.set("Content-Type", "text/markdown; charset=utf-8");
  res.status(200).send(md);
});

/**
 * Markdown content negotiation for public pages.
 *
 * The Next.js frontend owns HTML rendering; this backend only serves the API.
 * It still exposes markdown representations of the public pages so AI agents
 * can fetch a compact text version of a page instead of the full HTML shell.
 *
 * - Accept: text/markdown  → markdown representation (Content-Type: text/markdown, x-markdown-tokens)
 * - Otherwise              → 404 (the API backend has no HTML routes)
 */
const PAGE_PATH_RE = /^\/((?!api|uploads|sitemap\.xml|robots\.txt|\.well-known|auth\.md).*)?$/;

app.get(PAGE_PATH_RE, async (req, res, next) => {
  const { path: urlPath } = req;
  if (req.method !== "GET") return next();

  if (!wantsMarkdown(req)) return next();

  try {
    const md = await pageMarkdown(urlPath);
    if (md) {
      res.set("Content-Type", "text/markdown; charset=utf-8");
      res.set("x-markdown-tokens", String(countTokens(md)));
      return res.status(200).send(md);
    }
    // Unknown page path — still honor markdown request with a 404 markdown body
    const notFoundMd = "# 404 Not found\n\nصفحه مورد نظر یافت نشد.\n";
    res.set("Content-Type", "text/markdown; charset=utf-8");
    res.set("x-markdown-tokens", String(countTokens(notFoundMd)));
    return res.status(404).send(notFoundMd);
  } catch (err) {
    return next(err);
  }
});

app.use((_req, _res, next) => {
  next(new HttpError(404, "Not found"));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(res, err);
});

export default app;
