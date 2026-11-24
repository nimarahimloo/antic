# NVIDIA MCP Worker

The public Worker at `mcp.pardehantic.ir/mcp` is a read-only MCP transport for the catalog and public project tools. It does not run inference or serve private AI files.

## Bindings

| Name | Type | Required | Purpose |
| --- | --- | --- | --- |
| `MCP_WORKER_TOKEN` | Secret | Yes | Shared credential sent to the Backend bridge as `x-mcp-worker-token`. Configure the same value in the Backend production environment. Never use a plain-text binding or commit the value. |
| `MCP_BACKEND_URL` | Text | No | Backend tools endpoint. Defaults to `https://pardehantic.ir/api/mcp/tools`. |
| `MCP_CATALOG_CACHE` | KV namespace | No | Optional read-through cache for public catalog lists. Bind to the existing `pardehantic-ai-assets` namespace. |

The Worker may keep existing D1 and Queue bindings during migration, but it does not use them. The Backend owns application data and database access.

## KV cache policy

Only `list_categories` and `list_projects` are cached. Successful responses are stored for 60 seconds and KV reads use a 30-second edge cache TTL. Search and model-detail requests always reach the Backend. A KV read or write failure is fail-open and must not break a successful Backend response. The Backend remains the source of truth.

KV is eventually consistent, so it must not be used for authorization, payment state, inventory, or other correctness-critical records.

## R2

R2 is intentionally not bound to this Worker. The MCP service has no binary upload/download use case. Activate R2 and bind a bucket only when a separate application component has a defined object-storage requirement, authorization model, lifecycle policy, and cost review. Keep private AI file access in the Backend's private storage flow rather than exposing it through this public MCP Worker.
