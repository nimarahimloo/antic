# MCP Tools Skill

Invoke the پرده آنتیک MCP catalog tool bridge over Streamable HTTP. Tools
expose read-only access to curtain categories, curtain models, shop products,
and executed projects.

## Tools

- `list_categories` — list curtain categories
- `search_models` — search curtain models by text or category
- `get_model` — get curtain model details by id
- `list_projects` — list executed projects

## Endpoint

- `POST /api/mcp/tools/:name` — invoke an MCP catalog tool
