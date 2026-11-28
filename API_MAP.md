# Backend API Reference Map

## Overview
This document provides a comprehensive map of all backend APIs for theantic-curtain application. The backend is built with Express.js and Prisma, running on port 3001 (or as configured via `BACKEND_INTERNAL_URL`).

## Base URL
- **Development**: `http://localhost:3001`
- **Production**: Configure via `BACKEND_INTERNAL_URL` environment variable
- **API Base**: `process.env.NEXT_PUBLIC_API_BASE || "/api"` (frontend proxy)
- **Swagger UI**: `http://localhost:3001/api/docs` (OpenAPI 3.0 interactive documentation)
- **OpenAPI Spec**: `http://localhost:3001/api/docs/json` (raw JSON spec)

---

## 📦 API Routes Structure

### 1. **Entity CRUD Routes** (`/api/entities/*`)
Managed by: `src/routes/entities.ts`
All entities use Prisma ORM with consistent CRUD operations.

| Entity | Public Read | Public Create | Key Fields |
|--------|-------------|---------------|------------|
| `CurtainModel` | ✅ | ❌ | id, name, slug, price, images, categoryId |
| `CurtainCategory` | ✅ | ❌ | id, name, slug, subcategories, backgroundImage |
| `PortfolioCategory` | ✅ | ❌ | id, name, slug, description |
| `Project` | ✅ | ❌ | id, name, slug, description, price, image |
| `Collection` | ✅ | ❌ | id, name, slug, description, productIds |
| `ConsultationRequest` | ❌ | ✅ | id, name, email, phone, message, createdAt |
| `RenderTemplate` | ✅ | ❌ | id, name, description, content |
| `InstallReference` | ✅ | ❌ | id, name, slug, config |
| `SavedDesign` | ❌ | ✅ | id, name, description, designData, userId |
| `VirtualWindowSetting` | ✅ | ❌ | id, name, settingKey, settingValue |
| `SiteSetting` | ✅ | ❌ | id, key, value, category |
| `User` | ❌ | ❌ | id, email, name, role, createdAt |

**Common Entity Endpoints:**
- `GET /api/entities/{entity}` - List all entities with pagination/filtering/sorting
- `GET /api/entities/{entity}/{id}` - Get single entity by ID
- `POST /api/entities/{entity}` - Create new entity (admin only where applicable)
- `PATCH /api/entities/{entity}/{id}` - Update entity (admin only where applicable)
- `DELETE /api/entities/{entity}/{id}` - Delete entity (admin only where applicable)
- `GET /api/entities/{entity}/count` - Count entities with filtering

**CurtainCategory-specific endpoints:**
- `GET /api/entities/CurtainCategory?catalog_only=true` - Get categories for catalog (ISR)
- `GET /api/entities/CurtainCategory/:slug/projects` - Get projects by category slug

**CurtainModel-specific endpoints:**
- `GET /api/entities/CurtainModel/:id/related-projects` - Get related projects
- `POST /api/admin/CurtainModel/:id/related-projects` - Add related project (admin)
- `DELETE /api/admin/CurtainModel/:id/related-projects/:projectId` - Remove related project (admin)

**Collection-specific endpoints:**
- `GET /api/admin/Collection/:id/products` - Get collection products (admin)
- `POST /api/admin/Collection/:id/products` - Add product to collection (admin)
- `DELETE /api/admin/Collection/:id/products/:productId` - Remove product from collection (admin)
- `GET /api/admin/Collection/:id/categories` - Get collection categories (admin)
- `POST /api/admin/Collection/:id/categories` - Add category to collection (admin)
- `DELETE /api/admin/Collection/:id/categories/:categoryId` - Remove category from collection (admin)
- `GET /api/admin/Collection/:id/projects` - Get collection projects (admin)
- `POST /api/admin/Collection/:id/projects` - Add project to collection (admin)
- `DELETE /api/admin/Collection/:id/projects/:projectId` - Remove project from collection (admin)
- `GET /api/entities/Collection/:slug/products` - Get collection products (public)
- `GET /api/entities/Collection/:slug/categories` - Get collection categories (public)
- `GET /api/entities/Collection/:slug/projects` - Get collection projects (public)

---

### 2. **Catalog Routes** (`/api/catalog/*`)
Managed by: `src/routes/catalog.ts`
Handles product and category data for the storefront.

| Endpoint | Description |
|----------|-------------|
| `GET /api/catalog/categories?limit=&visible=` | Get categories with optional filtering |
| `GET /api/catalog/products?limit=&visible=&category_slug=` | Get products with filtering |
| `GET /api/catalog/products?slug=` | Get product by slug |
| `GET /api/catalog/categories?catalog_only=true` | Get categories for catalog (ISR) |
| `GET /api/catalog/models?limit=&category_slug=` | Get curtain models |
| `POST /api/catalog/admin/products` | Create product (admin) |
| `PATCH /api/catalog/admin/products/{id}` | Update product (admin) |
| `DELETE /api/catalog/admin/products/{id}` | Delete product (admin) |

---

### 3. **Authentication Routes** (`/api/auth/*`)
Managed by: `src/routes/auth.ts`
- `POST /api/auth/login` - User login with JWT
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Revoke token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset with token

---

### 4. **Agent/Chat Routes** (`/api/agents/*`)
Managed by: `src/routes/agents.ts`
- `POST /api/agents/conversations` - Create new conversation
- `GET /api/agents/conversations/:id` - Get conversation
- `POST /api/agents/conversations/:id/messages` - Send message
- `GET /api/agents/conversations` - List user conversations

---

### 5. **AI Routes** (`/api/ai/*`)
Managed by: `src/routes/ai.ts` (Admin only - `requireAdmin`)
- `GET /api/ai/providers` - List AI providers
- `GET /api/ai/conversations` - List AI conversations
- `GET /api/ai/conversations/:id` - Get AI conversation
- `POST /api/ai/conversations` - Create AI conversation
- `PATCH /api/ai/conversations/:id` - Update AI conversation
- `DELETE /api/ai/conversations/:id` - Delete AI conversation
- `GET /api/ai/usage` - Get AI usage statistics
- `GET /api/ai/usage/provider-usage` - Provider-wise usage
- `GET /api/ai/files` - List AI files
- `POST /api/ai/files` - Upload AI file
- `GET /api/ai/files/:id` - Get AI file
- `DELETE /api/ai/files/:id` - Delete AI file
- `GET /api/ai/images` - List AI images
- `POST /api/ai/images/generate` - Generate image
- `POST /api/ai/chat` - Chat with AI agent
- `GET /api/ai/breakers` - Get circuit breakers status
- `GET /api/ai/provider-usage` - Provider usage stats
- `GET /api/ai/memory/types` - Available memory types
- `GET /api/ai/memory` - Get memory contents
- `POST /api/ai/memory` - Create memory entry
- `GET /api/ai/memory/:id` - Get memory entry
- `PATCH /api/ai/memory/:id` - Update memory entry
- `DELETE /api/ai/memory/:id` - Delete memory entry
- `DELETE /api/ai/memory` - Clear all memory

---

### 6. **Media Routes** (`/api/media/*`)
Managed by: `src/routes/media.ts`
- `GET /api/media/uploads/:path` - Serve uploaded files
- `POST /api/media/upload` - Upload new media (multipart/form-data)
- `POST /api/media/public` - Upload public media (optional auth)
- `DELETE /api/media/:path` - Delete media file
- `GET /api/media/gallery/:category` - Get gallery images
- `GET /api/media/:id/usages` - Get media usage stats

---

### 7. **Account Routes** (`/api/account/*`)
Managed by: `src/routes/account.ts` (Auth required)
- `GET /api/account/overview` - User overview
- `GET /api/account/profile` - User profile
- `PATCH /api/account/profile` - Update profile
- `POST /api/account/password` - Change password
- `GET /api/account/addresses` - List addresses
- `POST /api/account/addresses` - Create address
- `PUT /api/account/addresses/:id` - Update address
- `DELETE /api/account/addresses/:id` - Delete address
- `GET /api/account/requests` - List consultation requests

---

### 8. **Search Routes** (`/api/search/*`)
Managed by: `src/routes/search.ts`
- `GET /api/search/products?query=` - Search products
- `GET /api/search/categories?query=` - Search categories
- `GET /api/search/suggestions?query=` - Get search suggestions

---

### 9. **Function Routes** (`/api/functions/*`)
Managed by: `src/routes/functions.ts` (Admin only)
- `POST /api/functions/:name` - Execute named function

---

### 10. **Upload Routes** (`/api/upload/*`)
Managed by: `src/routes/upload.ts`
- `POST /api/upload/` - Upload file (admin)
- `POST /api/upload/public` - Upload public file (optional auth)

---

### 11. **MCP Routes** (`/api/mcp/*`)
Managed by: `src/routes/mcp.ts`
- `GET /api/mcp/` - List available MCP tools
- `POST /api/mcp/tools/:name` - Execute MCP tool

---

### 12. **Render Routes** (`/api/render/*`)
Managed by: `src/routes/render.ts` (Admin only)
- `GET /api/render/install/:modelId` - Get install data for model
- `GET /api/render/styles` - Get available render styles
- `POST /api/render/batch` - Start batch render (admin)
- `GET /api/render/batch/status` - Get batch render status (admin)
- `POST /api/render/one` - Render single item (admin)
- `GET /api/render/stats` - Get render statistics (admin)
- `GET /api/render/categories-coverage` - Get category template coverage (admin)
- `POST /api/render/template/from-category` - Create template from category (admin)
- `POST /api/render/template/all-categories` - Create templates for all categories (admin)

---

### 13. **API Documentation** (`/api/docs/*`)
Managed by: `swagger-ui-express` + `swagger-jsdoc`
- `GET /api/docs` - Swagger UI interactive documentation
- `GET /api/docs/json` - Raw OpenAPI 3.0 JSON specification

---

## 🔌 Frontend Integration

### API Client (`src/api/index.ts`)
Re-exports from barrels:
- `api` - Main fetch utility
- `setToken` / `clearToken` - JWT management
- `useCurtainCategories` - Hook for categories
- `useShop` - Hook for shop data
- `getCurrentCart` / `addToCart` / `checkout` - Cart operations
- `searchProducts` / `queryCategories` - Product search

### Server Data Layer (`src/lib/server-data.ts`)
Centralized server-side data fetching with React caching:
- `getCurtainCategories(catalogOnly)` - Categories for catalog page
- `getCategoryCounts()` - Category product counts
- `getShopCategories()` - Shop page categories
- `getShopProducts(filters)` - Shop products with filters
- `getShopProduct(slug)` - Product detail by slug
- `getCurtainModel(filters)` - Curtain models list
- `getCurtainModels(filters)` - Get multiple curtain models
- `getCollection(filters)` - Collection detail
- `getCollections(filters)` - Collections list
- `getPublicSettings()` - Site settings
- `getProject(id)` - Project by ID
- `getProjects(filters)` - Projects list
- `getProjectByCategory(categorySlug)` - Projects by category

### Server Actions (`src/actions/catalog.ts`, `src/actions/auth.ts`)
Server-side data fetching with automatic error handling for build-time:
- All fetch calls wrapped in try-catch
- Graceful fallback to empty data when backend unavailable
- Uses `BACKEND_INTERNAL_URL` for absolute URLs during SSR

### REST Catalog Client (`src/rest/store-catalog.ts`)
- `getCurtainModelRelatedProjects(modelId, limit)` - Related projects for a model
- `searchProducts(variables)` - Product search with variables
- `getCurtainModel(id)` - Get model by ID

---

## ⚡ Performance & Caching Strategy

### ISR (Incremental Static Regeneration)
- **Home page** (`/`): `revalidate = 3600` (1 hour)
- **Catalog** (`/catalog`): `revalidate = 3600` (1 hour)
- **Product detail** (`/product/[slug]`): `revalidate = 3600` (1 hour)
- **Shop** (`/shop`): `revalidate = 3600` (1 hour)
- **Projects** (`/projects`): `revalidate = 3600` (1 hour)
- **Projects category** (`/projects/category/[slug]`): `revalidate = 3600` (1 hour)
- **Curtain detail** (`/curtain/[id]`): `revalidate = 3600` (1 hour)

### SSG (Static Site Generation)
- **About page** (`/about`): `revalidate = 86400` (24 hours)
- **Contact page** (`/contact`): `revalidate = 86400` (24 hours)
- **Collections** (`/collections/[slug]`): Uses `generateStaticParams`

### CSR (Client-Side Rendering)
- Dashboard pages (admin routes)
- Auth-required pages (login, register, profile)
- Interactive components with `use client` directive

---

## 🔒 Authentication & Authorization

### JWT Strategy
- Tokens stored in `localStorage` under key `antic_access_token`
- Authorization header: `Bearer {token}`
- Token expiry handled via refresh flow

### Role-Based Access
- **Public endpoints**: No auth required (entity list, catalog, product detail)
- **Admin endpoints**: `requireAdmin` middleware
- **User endpoints**: `requireAuth` middleware
- **Consultation requests**: Public create, user read only

### Rate Limiting
- Configurable via `rateLimit` middleware
- Applied to auth and admin endpoints

---

## 📊 Database Schema (Key Tables)

| Table | Key Fields | Relationships |
|-------|-----------|---------------|
| `curtainModel` | id, name, slug, price, image, categoryId | ⇢ `curtainCategory` (categoryId) |
| `curtainCategory` | id, name, slug, subcategories (JSON) | ⇢ `curtainModel` (via categoryId), self-referential (subcategories) |
| `project` | id, name, slug, price, image, categoryId | ⇢ `portfolioCategory` |
| `collection` | id, name, slug, description | ⇢ `curtainModel` (via productIds) |
| `consultationRequest` | id, name, email, phone, message | - |
| `siteSetting` | id, key, value | - |
| `savedDesign` | id, name, description, designData (JSON) | ⇢ User |

---

## 🛠️ Development & Deployment

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_INTERNAL_URL` | Backend base URL for SSR | `http://localhost:3001` |
| `NEXT_PUBLIC_API_BASE` | Frontend API proxy base | `/api` |
| `NEXT_PUBLIC_SITE_URL` | Site URL for metadata | `https://antic-curtain.ir` |
| `JWT_SECRET` | JWT signing secret | Required |
| `ZARINPAL_MERCHANT_ID` | Payment gateway merchant ID | Required |
| `AI_SDK_KEY` | AI SDK key for agents | Required |

### Docker
- Defined in `Dockerfile`
- Compose in `docker-compose.yml`
- Entrypoint: `docker-entrypoint.sh`

### Health Check
- `GET http://localhost:3001/api/health` - Basic health check

---

## 🔍 API Error Handling

All API responses follow consistent error format:
```json
{
  "error": "Error message",
  "status": 400, // HTTP status code
  "data": null // or error details
}
```

Server actions catch network errors gracefully and return `undefined` instead of crashing the build when the backend is unavailable during static generation.

---

## 🐛 Bug Fixes (2026-11-28)

### 1. `catalog_only` query parameter validation fix
**File**: `backend/src/routes/entities.ts`
**Issue**: The `catalog_only=true` query parameter sent by the frontend when fetching curtain categories was being treated as a filter field, causing a 404 VALIDATION_ERROR during `next build` prerendering.
**Fix**: Added `"catalog_only"` to the excluded query parameters list in both `GET /:Entity` and `GET /:Entity/count` handlers.

### 2. `SERVER_API_BASE` URL prefix fix
**File**: `src/actions/catalog.ts`
**Issue**: Server-side API calls during `next build` were going to `http://localhost:3001/entities/...` instead of `http://localhost:3001/api/entities/...`, causing 404s during prerendering.
**Fix**: Changed `baseUrl` construction to prepend `/api` when `BACKEND_INTERNAL_URL` is set.

---

## 📈 Recent Changes (2026-11-28)

### Added
- Swagger UI at `/api/docs` with OpenAPI 3.0 specification
- Raw OpenAPI spec at `/api/docs/json`
- Comprehensive API documentation in `API_MAP.md` with all route endpoints
- E2E test suite with Playwright for Guest, User, and Admin roles
- Database seeding with 19 CurtainCategories, 7 ShopCategories, 2 Products, 5 CurtainModels

### Fixed
- `catalog_only` query parameter causing 404 during build
- `SERVER_API_BASE` missing `/api` prefix during SSR build
- E2E test selectors matching actual Persian labels in the UI

---
*Generated from codebase analysis. Last updated: 2026-11-28*