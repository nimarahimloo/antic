# Curtain Catalog Skill

Browse and search the پرده آنتیک curtain catalog. Retrieve curtain categories
(with mechanisms and subcategories) and curtain models (fabric, dimensions,
pricing, availability).

## Tools

- `list_categories` — list curtain categories
- `get_curtain_models` — get curtain models, optionally filtered by category
- `get_public_settings` — get public site settings

## Endpoints

- `GET /.well-known/mcp/server-card.json` — MCP server card
- `GET /api/entities/CurtainCategory` — curtain categories
- `GET /api/entities/CurtainModel` — curtain models
- `GET /api/app/public-settings` — public settings
