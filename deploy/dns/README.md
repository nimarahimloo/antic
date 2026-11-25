# DNS for AI Discovery (DNS-AID)

Publish DNS-AID SVCB records so AI agents can discover this service's agent
endpoints via DNS under the `_agents.pardehantic.ir` namespace.

## Published records

Zone file: `deploy/dns/pardehantic.ir.zone`

```
_index._agents.pardehantic.ir. 3600 IN SVCB 1 pardehantic.ir. \
  alpn="h3,h2" port=443 mandatory=alpn,port \
  key100000="agent-index" key100001="discovery" key100002="/.well-known"

_a2a._agents.pardehantic.ir. 3600 IN SVCB 1 mcp.pardehantic.ir. \
  alpn="h3,h2" port=443 mandatory=alpn,port \
  key100000="agent-a2a" key100001="mcp" key100002="streamable-http"
```

| Record | Target | ALPN | Purpose |
|--------|--------|------|---------|
| `_index._agents.pardehantic.ir` | `pardehantic.ir` | h3, h2 | Agent index / resource discovery (serves `/.well-known/oauth-*`, `auth.md`) |
| `_a2a._agents.pardehantic.ir` | `mcp.pardehantic.ir` | h3, h2 | Agent-to-Agent / MCP (Streamable HTTP worker) |

### SvcParamKeys used

| Key | Name | Meaning |
|-----|------|---------|
| `alpn` | (assigned) | Application-Layer Protocol Negotiation (`h3,h2`) |
| `port` | (assigned) | TCP/TLS port (`443`) |
| `mandatory` | (assigned) | Resolver must understand `alpn,port` |
| `key100000` | experimental | Agent protocol role (`agent-index` / `agent-a2a`) |
| `key100001` | experimental | Capability family (`discovery` / `mcp`) |
| `key100002` | experimental | Endpoint hint (`/.well-known` / `streamable-http`) |

Numeric `keyNNNNN` names are used for experimental DNS-AID custom parameters
until they are IANA-registered, per the DNS-AID draft.

## How to publish

### Option A — Cloudflare API (recommended)

```bash
# 1. Create a Cloudflare API token with "DNS:Edit" for the pardehantic.ir zone
#    (dash.cloudflare.com -> My Profile -> API Tokens -> Create Token)

# 2. Set environment variables
export CLOUDFLARE_API_TOKEN="<your-token>"
# optional: export CLOUDFLARE_ZONE_ID="<zone-id>"

# 3. Publish
node deploy/dns/publish-dnsaid.mjs
```

The script upserts (create-or-update) both SVCB records via
`https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records`.

### Option B — Cloudflare dashboard

1. Go to **DNS** -> **Records** for `pardehantic.ir`
2. Add **Record type: SVCB**
   - Name: `_index._agents` → Content: `1 pardehantic.ir. alpn="h3,h2" port=443 mandatory=alpn,port key100000="agent-index" key100001="discovery" key100002="/.well-known"`
   - Name: `_a2a._agents` → Content: `1 mcp.pardehantic.ir. alpn="h3,h2" port=443 mandatory=alpn,port key100000="agent-a2a" key100001="mcp" key100002="streamable-http"`
   - TTL: `3600` (Auto)
3. Save each record.

## DNSSEC

Sign the discovery zone so validating resolvers return authenticated data:

1. In Cloudflare: **DNS** -> **DNSSEC** -> **Enable**
2. Cloudflare generates the KSK/ZSK and publishes the DS record at the parent
   zone (nic.ir / your registrar) automatically.
3. Confirm with a DNSSEC analyzer (e.g. `dnsviz.net` or `verisignlabs.com` DNSSEC
   debugger) that `_agents.pardehantic.ir` returns `AD` (authenticated data)
   from validating resolvers.

Do not manually add DNSKEY/RRSIG records unless you run your own authoritative
name server; Cloudflare manages signing automatically once DNSSEC is enabled.

## Validation

The `isitagentready.com` scanner validates DNS-AID via DNS-over-HTTPS:

```http
POST https://isitagentready.com/api/scan
Content-Type: application/json

{"url": "https://pardehantic.ir"}
```

Check that `checks.discoverability.dnsAid.status` is `"pass"`.

Default resolver: `https://cloudflare-dns.com/dns-query` with fallback to
`https://dns.google/resolve`.

## Related files

- `deploy/dns/pardehantic.ir.zone` — authoritative zone file (source of truth)
- `deploy/dns/publish-dnsaid.mjs` — Cloudflare API publish/upsert script
- `AGENTS.md` — project-wide DNS-AID notes (see "DNS for AI Discovery" section)
