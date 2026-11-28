import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Antic Curtain Backend API",
      version: "1.0.0",
      description: `# Antic Curtain Backend API

Self-hosted Next.js + Express/Prisma curtain shop API.

## Two Domain Model

This API maintains **two separate domains** that must never be mixed:

| Domain | Model | API Base | Description |
|--------|-------|----------|-------------|
| **Curtain Catalog** | \`CurtainCategory\`, \`CurtainModel\` | \`/api/entities/CurtainCategory\`, \`/api/entities/CurtainModel\` | Curtain products and categories |
| **Shop / Accessories** | \`ShopCategory\`, \`Product\` | \`/api/catalog/categories\`, \`/api/catalog/products\` | Curtain accessories (rods, rings, hooks, etc.) |

Shop is accessories only — not connected to \`CurtainCategory\`.

## Authentication

JWT-based authentication. Tokens are stored in \`localStorage\` under key \`antic_access_token\`.
Send the token in the Authorization header: \`Bearer {token}\`.

### Rate Limiting
Auth endpoints are rate-limited:
- Login: 10 requests per 15 minutes per IP
- Register: 5 requests per 15 minutes per IP
- Forgot password: 3 requests per hour per IP

## Base URL
- Development: \`http://localhost:3001\`
- Production: Configure via \`BACKEND_INTERNAL_URL\` environment variable
`,
      contact: {
        name: "Antic Curtain Support",
        email: "support@antic-curtain.ir",
      },
      license: {
        name: "Private",
      },
      servers: [
        {
          url: "http://localhost:3001",
          description: "Development server",
        },
      ],
      components: {
        schemas: {
          Error: {
            type: "object",
            properties: {
              error: { type: "string", description: "Error message" },
              status: { type: "integer", description: "HTTP status code" },
              data: { type: "object", description: "Error details or null" },
            },
            required: ["error", "status"],
          },
          CurtainCategory: {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique category ID" },
              name: { type: "string", description: "Category name (Persian)" },
              slug: { type: "string", description: "URL-friendly slug" },
              description: { type: "string", description: "Category description" },
              image: { type: "string", description: "Image URL", nullable: true },
              order: { type: "integer", description: "Display order" },
              subcategories: { type: "string", description: "JSON-encoded subcategories array" },
              inCatalog: { type: "boolean", description: "Whether category is in catalog" },
              mechanism: { type: "string", description: "Curtain mechanism type", nullable: true },
              backgroundImage: { type: "string", description: "Background image URL", nullable: true },
              backgroundGradient: { type: "string", description: "CSS gradient string", nullable: true },
              seoTitle: { type: "string", description: "SEO title", nullable: true },
              seoDescription: { type: "string", description: "SEO description", nullable: true },
              seoCanonicalUrl: { type: "string", description: "SEO canonical URL", nullable: true },
              seoRobots: { type: "string", description: "SEO robots tag", nullable: true },
              seoOgTitle: { type: "string", description: "SEO Open Graph title", nullable: true },
              seoOgDescription: { type: "string", description: "SEO Open Graph description", nullable: true },
              seoOgImage: { type: "string", description: "SEO Open Graph image", nullable: true },
              seoTwitterCard: { type: "string", description: "SEO Twitter card type", nullable: true },
              seoTwitterTitle: { type: "string", description: "SEO Twitter title", nullable: true },
              seoTwitterDescription: { type: "string", description: "SEO Twitter description", nullable: true },
              seoTwitterImage: { type: "string", description: "SEO Twitter image", nullable: true },
              collectionIds: { type: "array", items: { type: "string" }, description: "Collection IDs" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "name", "slug"],
          },
          CurtainModel: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              name: { type: "string" },
              categorySlug: { type: "string" },
              fabric: { type: "string" },
              color: { type: "string" },
              material: { type: "string" },
              texture: { type: "string" },
              image: { type: "string" },
              installImage: { type: "string" },
              seoTitle: { type: "string" },
              seoDescription: { type: "string" },
              seoCanonicalUrl: { type: "string" },
              seoRobots: { type: "string" },
              seoOgTitle: { type: "string" },
              seoOgDescription: { type: "string" },
              seoOgImage: { type: "string" },
              seoTwitterCard: { type: "string" },
              seoTwitterTitle: { type: "string" },
              seoTwitterDescription: { type: "string" },
              seoTwitterImage: { type: "string" },
              relatedProjects: { type: "array", items: { type: "string" } },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "code", "name", "categorySlug"],
          },
          ShopCategory: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              description: { type: "string" },
              image: { type: "string" },
              visible: { type: "boolean" },
              order: { type: "integer" },
              seoTitle: { type: "string" },
              seoDescription: { type: "string" },
              seoCanonicalUrl: { type: "string" },
              seoRobots: { type: "string" },
              seoOgTitle: { type: "string" },
              seoOgDescription: { type: "string" },
              seoOgImage: { type: "string" },
              seoTwitterCard: { type: "string" },
              seoTwitterTitle: { type: "string" },
              seoTwitterDescription: { type: "string" },
              seoTwitterImage: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "name", "slug"],
          },
          Product: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              description: { type: "string" },
              price: { type: "number" },
              compareAtPrice: { type: "number" },
              currency: { type: "string", default: "IRR" },
              image: { type: "string" },
              gallery: { type: "string" },
              categoryId: { type: "string" },
              visible: { type: "boolean" },
              inStock: { type: "boolean" },
              stock: { type: "integer" },
              ribbon: { type: "string" },
              optionsJson: { type: "string" },
              variantsJson: { type: "string" },
              seoTitle: { type: "string" },
              seoDescription: { type: "string" },
              seoCanonicalUrl: { type: "string" },
              seoRobots: { type: "string" },
              seoOgTitle: { type: "string" },
              seoOgDescription: { type: "string" },
              seoOgImage: { type: "string" },
              seoTwitterCard: { type: "string" },
              seoTwitterTitle: { type: "string" },
              seoTwitterDescription: { type: "string" },
              seoTwitterImage: { type: "string" },
              relatedProjects: { type: "array", items: { type: "string" } },
              collections: { type: "array", items: { type: "string" } },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "name", "slug", "price"],
          },
          User: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              googleId: { type: "string" },
              passwordHash: { type: "string" },
              fullName: { type: "string" },
              role: { type: "string", enum: ["user", "admin"], default: "user" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "email", "role"],
          },
          ConsultationRequest: {
            type: "object",
            properties: {
              id: { type: "string" },
              fullName: { type: "string" },
              phone: { type: "string" },
              email: { type: "string", format: "email" },
              city: { type: "string" },
              spaceType: { type: "string" },
              message: { type: "string" },
              reference: { type: "string" },
              status: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "fullName", "phone", "message"],
          },
          Address: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              label: { type: "string" },
              recipient: { type: "string" },
              phone: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              postalCode: { type: "string" },
              isDefault: { type: "boolean" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "userId", "recipient", "phone", "address", "city"],
          },
          Project: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              coverImage: { type: "string" },
              images: { type: "string" },
              categorySlug: { type: "string" },
              subcategory: { type: "string" },
              relatedProducts: { type: "string" },
              relatedCurtainModels: { type: "string" },
              collections: { type: "string" },
              seoTitle: { type: "string" },
              seoDescription: { type: "string" },
              seoCanonicalUrl: { type: "string" },
              seoRobots: { type: "string" },
              seoOgTitle: { type: "string" },
              seoOgDescription: { type: "string" },
              seoOgImage: { type: "string" },
              seoTwitterCard: { type: "string" },
              seoTwitterTitle: { type: "string" },
              seoTwitterDescription: { type: "string" },
              seoTwitterImage: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "title"],
          },
          Collection: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              description: { type: "string" },
              coverImage: { type: "string" },
              order: { type: "integer" },
              active: { type: "boolean" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "title", "slug"],
          },
          LoginRequest: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string" },
            },
            required: ["email", "password"],
          },
          RegisterRequest: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              password: { type: "string", minLength: 6 },
              full_name: { type: "string" },
            },
            required: ["password"],
          },
          LoginResponse: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/User" },
              token: { type: "string" },
            },
            required: ["user", "token"],
          },
          ForgotPasswordRequest: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
            },
            required: ["email"],
          },
          ResetPasswordRequest: {
            type: "object",
            properties: {
              token: { type: "string" },
              password: { type: "string", minLength: 6 },
            },
            required: ["token", "password"],
          },
          MediaFile: {
            type: "object",
            properties: {
              id: { type: "string" },
              originalName: { type: "string" },
              filename: { type: "string" },
              path: { type: "string" },
              url: { type: "string" },
              mimetype: { type: "string" },
              size: { type: "integer" },
              userId: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
            },
            required: ["id", "originalName", "filename", "path", "url", "mimetype", "size"],
          },
          AIConversation: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              title: { type: "string" },
              provider: { type: "string" },
              model: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "userId", "title"],
          },
          AIChatMessage: {
            type: "object",
            properties: {
              id: { type: "string" },
              conversationId: { type: "string" },
              role: { type: "string", enum: ["user", "assistant", "system"] },
              content: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
            },
            required: ["id", "conversationId", "role", "content"],
          },
          RenderTemplate: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              content: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "name"],
          },
          InstallReference: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              config: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "name", "slug"],
          },
          SavedDesign: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              designData: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "userId", "name"],
          },
          VirtualWindowSetting: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              settingKey: { type: "string" },
              settingValue: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "name", "settingKey"],
          },
          SiteSetting: {
            type: "object",
            properties: {
              id: { type: "string" },
              key: { type: "string" },
              value: { type: "string" },
              category: { type: "string" },
              createdDate: { type: "string", format: "date-time" },
              updatedDate: { type: "string", format: "date-time" },
            },
            required: ["id", "key", "value"],
          },
        },
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT token obtained from /api/auth/login",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: "Authentication", description: "User authentication endpoints" },
        { name: "Entities", description: "Generic CRUD for curtain catalog and other entities" },
        { name: "Catalog", description: "Shop/accessories catalog endpoints" },
        { name: "Account", description: "User account management (auth required)" },
        { name: "Media", description: "Media upload and management (admin)" },
        { name: "Search", description: "Search products and categories" },
        { name: "Agents", description: "AI agent conversations" },
        { name: "AI", description: "AI workspace (admin only)" },
        { name: "Functions", description: "Serverless function execution (admin)" },
        { name: "Upload", description: "File upload endpoints" },
        { name: "MCP", description: "Model Control Protocol bridge" },
        { name: "Render", description: "Render queue management (admin)" },
        { name: "Public", description: "Public endpoints (health, settings, sitemap)" },
      ],
    },
  },
  apis: ["./src/docs/swagger.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
