import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import crypto from "crypto";
import authRoutes from "./routes/auth.js";
import entityRoutes from "./routes/entities.js";
import uploadRoutes from "./routes/upload.js";
import mediaRoutes from "./routes/media.js";
import functionRoutes from "./routes/functions.js";
import catalogRoutes from "./routes/catalog.js";
import agentRoutes from "./routes/agents.js";
import mcpRoutes from "./routes/mcp.js";
import renderRoutes from "./routes/render.js";
import searchRoutes from "./routes/search.js";
import accountRoutes from "./routes/account.js";
import aiRoutes from "./routes/ai.js";
import { HttpError, sendError } from "./lib/errors.js";
import { prisma } from "./lib/prisma.js";
import { buildSitemap } from "./lib/sitemap.js";
import { wantsMarkdown, countTokens, pageMarkdown } from "./lib/markdown.js";
import { isCloudflareConfigured } from "./services/aiProviders.js";

/** Validate production configuration at startup. */
function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== "production") return;

  const errors: string[] = [];
  const warnings: string[] = [];

  // JWT_SECRET must be set and not default
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret-change-me") {
    errors.push("JWT_SECRET must be set to a strong random value in production.");
  }

  // Admin credentials must not be defaults
  if (process.env.ADMIN_EMAIL === "admin@antic.local" && process.env.ADMIN_PASSWORD === "admin123") {
    errors.push("Default ADMIN_EMAIL/ADMIN_PASSWORD detected. Must set secure credentials in production.");
  }

  // Email transport must be configured
  const hasEmailTransport =
    (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) ||
    (process.env.CLOUDFLARE_SMTP_USER && process.env.CLOUDFLARE_SMTP_PASS) ||
    process.env.SMTP_HOST;
  if (!hasEmailTransport) {
    warnings.push("No email transport configured (Cloudflare API, Cloudflare SMTP, or SMTP). Emails will only log to console.");
  }

  // AI providers
  if (!isCloudflareConfigured() && !process.env.NVIDIA_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    warnings.push("No AI provider configured. AI workspace will be unavailable.");
  }

  // MCP Worker token
  if (!process.env.MCP_WORKER_TOKEN) {
    warnings.push("MCP_WORKER_TOKEN not set. MCP Worker integration will fail.");
  }

  if (warnings.length) {
    console.warn("⚠️  Production configuration warnings:");
    for (const w of warnings) console.warn(`  - ${w}`);
  }
  if (errors.length) {
    console.error("❌  Production configuration errors (server will not start):");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}

validateProductionConfig();

const app = express();

/** Trust first proxy (e.g., nginx, Cloudflare Tunnel) for correct client IP,
 *  X-Forwarded-Proto, and X-Forwarded-Host headers.
 *  Only enable when running behind a trusted reverse proxy.
 *  In local dev without a proxy, this has no effect (Express ignores it).
 *  NOTE: If deployed behind Cloudflare + another proxy (nginx/ALB), set to 2
 *  or use `true` to trust all proxies (requires Cloudflare IP ranges allowlist).
 *  Validate in staging: log req.ip vs req.headers['cf-connecting-ip']. */
app.set("trust proxy", 1);

/** Security headers via Helmet.
 *  CSP is configured carefully to allow the AI workspace, inline scripts
 *  for development, and required external resources without breaking the app.
 *  Production CSP allows 'unsafe-eval' for Next.js webpack runtime chunks.
 *  'unsafe-inline' is avoided in production; use nonce/hash if needed.
 *  Development CSP retains relaxed settings for hot-reload and debugging. */
const isProduction = process.env.NODE_ENV === "production";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Production: 'unsafe-eval' required for Next.js webpack runtime.
        // 'unsafe-inline' is NOT allowed in production (use nonce/hash for inline scripts).
        scriptSrc: isProduction
          ? ["'self'", "'unsafe-eval'"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        // style-src: 'unsafe-inline' is needed for Tailwind/inline styles in both environments.
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        // upgradeInsecureRequests: empty array includes the directive (no value), null omits it.
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    // crossOriginEmbedderPolicy: "credentialless" allows cross-origin resources
    // without CORP header while isolating the document. This is compatible with
    // AI provider integrations that don't send CORP headers.
    // If AI image generation (FLUX.2) breaks, test with "require-corp" and ensure
    // third-party origins send Cross-Origin-Resource-Policy headers.
    crossOriginEmbedderPolicy: { policy: "credentialless" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    originAgentCluster: true,
    xDnsPrefetchControl: { allow: false },
    xFrameOptions: { action: "deny" },
    xPoweredBy: true,
    strictTransportSecurity: isProduction
      ? { maxAge: 15552000, includeSubDomains: true, preload: true }
      : false,
    xContentTypeOptions: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // xXssProtection is deprecated (removed from Chrome/Firefox/Edge).
    // It can introduce XSS in older browsers. Modern CSP replaces it.
    xXssProtection: false,
  })
);

/* ------------------------------------------------------------------ */
/* Web Bot Auth — HTTP Message Signatures (IETF WebBotAuth WG)        */
/* Publishes a JWKS at /.well-known/http-message-signatures-directory  */
/* so receiving sites can verify signatures on requests this site's    */
/* bot/agent sends.                                                    */
/* ------------------------------------------------------------------ */

const WEB_BOT_AUTH_KEY_ID = "web-bot-auth-1";
const WEB_BOT_AUTH_AGENT = "antic-curtain-bot/1.0";

type WebBotAuthJwk = JsonWebKey & {
  kid: string;
  use: string;
  alg: string;
};

let webBotAuthPublicJwk: WebBotAuthJwk | null = null;
let webBotAuthPrivateKey: crypto.KeyObject | null = null;

function initWebBotAuth(): void {
  const envSeed = process.env.WEB_BOT_AUTH_PRIVATE_KEY;
  let privateKey: crypto.KeyObject | null = null;
  let publicKeyJwk: { kty: string; crv: string; x: string } | null = null;

  if (envSeed) {
    try {
      // base64url-encoded raw Ed25519 private seed (32 bytes)
      const seedBuf = Buffer.from(envSeed, "base64url");
      if (seedBuf.length === 32) {
        privateKey = crypto.createPrivateKey({
          key: seedBuf,
          type: "ed25519",
        } as any);
        // Ed25519 private-key JWK includes the public "x" component
        const privateJwk = privateKey.export({
          format: "jwk",
        } as any) as unknown as { kty: string; crv: string; x: string; d?: string };
        publicKeyJwk = {
          kty: privateJwk.kty,
          crv: privateJwk.crv,
          x: privateJwk.x,
        };
      }
    } catch {
      /* fall through to generating a new key */
    }
  }

  if (!privateKey) {
    const { privateKey: generated, publicKey: pubKey } =
      crypto.generateKeyPairSync("ed25519");
    privateKey = generated;
    publicKeyJwk = pubKey.export({
      format: "jwk",
    } as any) as unknown as { kty: string; crv: string; x: string };
    console.log(
      `[web-bot-auth] generated Ed25519 key pair (kid=${WEB_BOT_AUTH_KEY_ID})`
    );
  }

  webBotAuthPrivateKey = privateKey;

  webBotAuthPublicJwk = {
    kty: "OKP",
    kid: WEB_BOT_AUTH_KEY_ID,
    use: "sig",
    alg: "EdDSA",
    crv: publicKeyJwk!.crv,
    x: publicKeyJwk!.x,
  } as WebBotAuthJwk;
}

initWebBotAuth();

function webBotAuthJwks(): { keys: WebBotAuthJwk[] } {
  return { keys: webBotAuthPublicJwk ? [webBotAuthPublicJwk] : [] };
}

/**
 * Sign an outbound HTTP request per RFC 9421 (HTTP Message Signatures).
 * Returns the `Signature-Input` and `Signature` header values.
 * Also sets `Signature-Agent` to identify this site's bot/agent.
 */
function signHttpRequest(opts: {
  method: string;
  targetUri: string;
  authority: string;
  headers: Record<string, string>;
  body?: string;
  created?: number;
}): {
  "Signature-Input": string;
  Signature: string;
  "Signature-Agent": string;
} {
  const {
    method,
    targetUri,
    authority,
    headers,
    body,
    created = Math.floor(Date.now() / 1000),
  } = opts;

  if (!webBotAuthPrivateKey) {
    throw new Error("web-bot-auth private key not available");
  }

  const contentType = headers["content-type"] || "";
  const contentLength = headers["content-length"] || String(body ? body.length : 0);

  // Signature base string (RFC 9421 § 2.2) — covered components in order
  const components: Array<[string, string]> = [
    ["@method", method.toUpperCase()],
    ["@target-uri", targetUri],
    ["authority", authority],
    ["content-type", contentType],
    ["content-length", contentLength],
  ];

  const signatureBase = components.map(([name, value]) => `"${name}": ${value}`).join("\n");

  const signature = crypto.sign(null, Buffer.from(signatureBase, "utf8"), webBotAuthPrivateKey);

  const componentNames = components.map(([name]) => `"${name}"`).join(" ");

  const signatureInput = `${componentNames}; created=${created}; keyid="${WEB_BOT_AUTH_KEY_ID}"`;
  const signatureB64 = signature.toString("base64");

  return {
    "Signature-Input": `sig1=(${signatureInput})`,
    Signature: `sig1=:${signatureB64}:`,
    "Signature-Agent": WEB_BOT_AUTH_AGENT,
  };
}

declare global {
  namespace Express {
    interface Request {
      webBotAuth?: {
        sign: typeof signHttpRequest;
      };
    }
  }
}

const origin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: origin.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/** Attach Web Bot Auth signing helper to every request so route handlers
 *  can sign outbound bot/agent requests when this service acts as a client. */
app.use((req, _res, next) => {
  (req as Express.Request & { webBotAuth?: { sign: typeof signHttpRequest } }).webBotAuth = {
    sign: signHttpRequest,
  };
  next();
});

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
        image_generation_external: isCloudflareConfigured(),
      },
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/entities", entityRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/functions", functionRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/mcp", mcpRoutes);
app.use("/api/render", renderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/ai", aiRoutes);

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

/** robots.txt pointing at the sitemap, with Content-Signal directives. */
app.get("/robots.txt", (_req, res) => {
  const base = process.env.PUBLIC_BASE_URL || "https://pardehantic.ir";
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(
    `# As a condition of accessing this website, you agree to
# abide by the following content signals:
#
# (a)  If a content-signal = yes, you may collect content
# for the corresponding use.
# (b)  If a content-signal = no, you may not collect
# content for the corresponding use.
# (c)  If the website operator does not include a content
# signal for a corresponding use, the website operator
# neither grants nor restricts permission via content
# signal with respect to the corresponding use.
#
# The content signals and their meanings are:
# search: building a search index and providing search
# results (e.g., returning hyperlinks and short excerpts
# from your website's contents).  Search does not include
# providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models
# (e.g., retrieval augmented generation, grounding, or
# other real-time taking of content for generative AI
# search answers).
# ai-train: training or fine-tuning AI models.
#
# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE
# EXPRESS RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF THE
# EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT AND
# RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.

User-Agent: *
Content-Signal: ai-train=yes, search=yes, ai-input=yes
Allow: /

Sitemap: ${base}/sitemap.xml
`
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
      credential_types_supported: ["bearer"],
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
 * HTTP Message Signatures Directory (Web Bot Auth / IETF WebBotAuth WG).
 * Publishes the JSON Web Key Set containing the public key(s) that receiving
 * sites can use to verify signatures on requests sent by this site's
 * bot/agent. The matching private key stays on this server only.
 */
app.get("/.well-known/http-message-signatures-directory", (_req, res) => {
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json(webBotAuthJwks());
});

/**
 * MCP Server Card (SEP-1649).
 * Advertises this service as an MCP server for agent discovery.
 * Served at /.well-known/mcp/server-card.json with HTTP 200.
 */
app.get("/.well-known/mcp/server-card.json", (_req, res) => {
  const base = publicBaseUrl();
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    schemaVersion: "1.0.0",
    serverInfo: {
      name: "antic-curtain-mcp",
      version: "1.0.0",
      description: "پرده آنتیک — Read-only curtain catalog MCP server",
    },
    transport: {
      type: "streamable-http",
      endpoint: `${base}/api/mcp`,
    },
    capabilities: {
      tools: {
        list_categories: {
          description: "لیست دسته‌بندی‌های پرده",
        },
        search_models: {
          description: "جست‌وجوی مدل‌های پرده با متن یا دسته",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              category_slug: { type: "string" },
              limit: { type: "number" },
            },
          },
        },
        get_model: {
          description: "جزئیات یک مدل با id",
          inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
          },
        },
        list_projects: {
          description: "لیست پروژه‌های اجرا شده",
          inputSchema: {
            type: "object",
            properties: { limit: { type: "number" } },
          },
        },
      },
      resources: {
        curtain_categories: {
          description: "دسته‌بندی‌های پرده",
          uri: `${base}/api/entities/CurtainCategory`,
        },
        curtain_models: {
          description: "مدل‌های پرده",
          uri: `${base}/api/entities/CurtainModel`,
        },
      },
      prompts: {},
    },
  });
});

/**
 * Agent Skills Discovery Index (RFC v0.2.0).
 * Advertises the skills this site exposes for agent discovery.
 * Served at /.well-known/agent-skills/index.json with HTTP 200.
 */
app.get("/.well-known/agent-skills/index.json", (_req, res) => {
  const base = publicBaseUrl();
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "curtain-catalog",
        type: "skill-md",
        description: "Browse and search the curtain catalog (categories, models, settings)",
        url: `${base}/.well-known/agent-skills/curtain-catalog.md`,
        digest: "sha256:4c2ffb27d2034fa5c6be87dffad5c9987366d4baa06be352c4ea1e151048572c",
      },
      {
        name: "shop-catalog",
        type: "skill-md",
        description: "Browse and search the shop accessory catalog (categories, products)",
        url: `${base}/.well-known/agent-skills/shop-catalog.md`,
        digest: "sha256:f6391fdf5a6aa74a65700bd53bf3fecf7f0e8a9e3e033fa34f209495c22ec986",
      },
      {
        name: "mcp-tools",
        type: "skill-md",
        description: "Invoke MCP catalog tools over Streamable HTTP",
        url: `${base}/.well-known/agent-skills/mcp-tools.md`,
        digest: "sha256:346ecba9759aae37e16074aaac4493b63d878e4fcfab76c029242eb1655b6433",
      },
    ],
  });
});

/**
 * A2A Agent Card (A2A Protocol Specification).
 * Advertises this service as an A2A-compatible agent for agent-to-agent discovery.
 * Served at /.well-known/agent-card.json with HTTP 200.
 */
app.get("/.well-known/agent-card.json", (_req, res) => {
  const base = publicBaseUrl();
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    name: "پرده آنتیک A2A Agent",
    version: "1.0.0",
    description:
      "پرده آنتیک — curtain and accessory catalog agent supporting A2A agent-to-agent communication",
    supportedInterfaces: [
      {
        serviceUrl: `${base}/api/mcp`,
        transport: "streamable-http",
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    skills: [
      {
        id: "curtain-catalog",
        name: "Curtain Catalog",
        description: "Browse and search curtain categories and models",
      },
      {
        id: "shop-catalog",
        name: "Shop Catalog",
        description: "Browse and search shop accessory categories and products",
      },
      {
        id: "mcp-tools",
        name: "MCP Catalog Tools",
        description: "Invoke MCP catalog tools over Streamable HTTP",
      },
    ],
  });
});

/**
 * Agentic Commerce Protocol (ACP) Discovery Document.
 * Advertises this service as an ACP-compatible commerce agent for agent discovery.
 * Served at /.well-known/acp.json with HTTP 200.
 */
app.get("/.well-known/acp.json", (_req, res) => {
  const base = publicBaseUrl();
  res.set("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    protocol: {
      name: "acp",
      version: "1.0.0",
    },
    api_base_url: base,
    transports: ["http", "streamable-http"],
    capabilities: {
      services: [
        {
          id: "curtain-catalog",
          name: "Curtain Catalog",
          description: "Browse and search curtain categories and models",
          endpoint: `${base}/api/entities/CurtainCategory`,
        },
        {
          id: "shop-catalog",
          name: "Shop Catalog",
          description: "Browse and search shop accessory categories and products",
          endpoint: `${base}/api/catalog/categories`,
        },
        {
          id: "mcp-tools",
          name: "MCP Catalog Tools",
          description: "Invoke MCP catalog tools over Streamable HTTP",
          endpoint: `${base}/api/mcp`,
        },
      ],
    },
  });
});

/**
 * Serve individual SKILL.md skill artifacts referenced by the discovery index.
 * Content is embedded so it works in both dev (tsx) and production (dist)
 * builds without needing to copy asset files.
 */
const SKILL_ARTIFACTS: Record<string, string> = {
  "curtain-catalog": `# Curtain Catalog Skill

Browse and search the پرده آنتیک curtain catalog. Retrieve curtain categories
(with mechanisms and subcategories) and curtain models (fabric, dimensions,
pricing, availability).

## Tools

- \`list_categories\` — list curtain categories
- \`get_curtain_models\` — get curtain models, optionally filtered by category
- \`get_public_settings\` — get public site settings

## Endpoints

- \`GET /.well-known/mcp/server-card.json\` — MCP server card
- \`GET /api/entities/CurtainCategory\` — curtain categories
- \`GET /api/entities/CurtainModel\` — curtain models
- \`GET /api/app/public-settings\` — public settings
`,
  "shop-catalog": `# Shop Catalog Skill

Browse and search the پرده آنتیک online shop accessory catalog. Retrieve
shop categories and accessory products (curtain rods, rings, hooks, ties,
etc.) with filtering and pagination.

## Tools

- \`search_shop_products\` — search shop products
- \`get_shop_categories\` — list shop categories

## Endpoints

- \`GET /api/catalog/categories\` — shop categories
- \`GET /api/catalog/products\` — shop products
`,
  "mcp-tools": `# MCP Tools Skill

Invoke the پرده آنتیک MCP catalog tool bridge over Streamable HTTP. Tools
expose read-only access to curtain categories, curtain models, shop products,
and executed projects.

## Tools

- \`list_categories\` — list curtain categories
- \`search_models\` — search curtain models by text or category
- \`get_model\` — get curtain model details by id
- \`list_projects\` — list executed projects

## Endpoint

- \`POST /api/mcp/tools/:name\` — invoke an MCP catalog tool
`,
};

app.get("/.well-known/agent-skills/:skill.md", (req, res) => {
  const { skill } = req.params;
  const content = SKILL_ARTIFACTS[skill as keyof typeof SKILL_ARTIFACTS];
  if (content === undefined) {
    return res.status(404).json({ error: "Skill not found" });
  }
  res.set("Content-Type", "text/markdown; charset=utf-8");
  res.status(200).send(content);
});

/**
 * API Catalog for agent discovery (RFC 9727).
 * Lists machine-readable endpoints that AI agents can use to discover
 * and interact with this service. Referenced via Link header rel="api-catalog".
 * Served as application/linkset+json per RFC 9727.
 */
app.get("/.well-known/api-catalog", (_req, res) => {
  const base = publicBaseUrl();
  res.set("Content-Type", "application/linkset+json; charset=utf-8");
  res.status(200).json({
    linkset: [
      {
        anchor: `${base}/`,
        rel: ["service-desc", "service-doc", "status"],
        href: `${base}/.well-known/api-catalog`,
      },
      {
        anchor: `${base}/.well-known/oauth-protected-resource`,
        rel: ["service-desc"],
        href: `${base}/.well-known/oauth-protected-resource`,
      },
      {
        anchor: `${base}/.well-known/oauth-authorization-server`,
        rel: ["service-doc"],
        href: `${base}/.well-known/oauth-authorization-server`,
      },
      {
        anchor: `${base}/.well-known/openid-configuration`,
        rel: ["service-doc"],
        href: `${base}/.well-known/openid-configuration`,
      },
      {
        anchor: `${base}/.well-known/jwks.json`,
        rel: ["service-desc"],
        href: `${base}/.well-known/jwks.json`,
      },
      {
        anchor: `${base}/.well-known/http-message-signatures-directory`,
        rel: ["service-desc"],
        href: `${base}/.well-known/http-message-signatures-directory`,
      },
      {
        anchor: `${base}/auth.md`,
        rel: ["service-doc"],
        href: `${base}/auth.md`,
      },
      {
        anchor: `${base}/api/mcp`,
        rel: ["service-desc"],
        href: `${base}/api/mcp`,
      },
      {
        anchor: `${base}/sitemap.xml`,
        rel: ["service-desc"],
        href: `${base}/sitemap.xml`,
      },
      {
        anchor: `${base}/api/health`,
        rel: ["status"],
        href: `${base}/api/health`,
      },
    ],
  });
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

وکیل‌های هوش مصنوعی و کلاینت‌های هوش مصنوعی می‌توانند با ثبت‌نام در این API به منابع محفوظ دسترسی یابند.

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
