#!/usr/bin/env node
/**
 * publish-dnsaid.mjs
 * ------------------
 * Publish DNS for AI Discovery (DNS-AID) SVCB records for pardehantic.ir
 * via the Cloudflare API (DNS zone: pardehantic.ir, subzone _agents).
 *
 * Prerequisites:
 *   - CLOUDFLARE_API_TOKEN with "DNS:Edit" permission for the pardehantic.ir zone
 *   - CLOUDFLARE_ZONE_ID (or zone name pardehantic.ir to look it up)
 *
 *   Set these in backend/.env or export as environment variables:
 *     export CLOUDFLARE_API_TOKEN="..."
 *     export CLOUDFLARE_ZONE_ID="<zone-id>"   # optional; looked up by name if absent
 *
 * Usage:
 *   node deploy/dns/publish-dnsaid.mjs
 *
 * What it does:
 *   1. Looks up the Cloudflare zone ID for pardehantic.ir (if not provided)
 *   2. Upserts (create or update) SVCB records for:
 *        _index._agents.pardehantic.ir
 *        _a2a._agents.pardehantic.ir
 *   3. Reports the resulting record IDs and content
 *
 * DNSSEC note:
 *   Enable DNSSEC separately in the Cloudflare dashboard (DNS -> DNSSEC) or
 *   via the API. Cloudflare handles KSK/ZSK generation and DS publication at
 *   the parent zone automatically.
 */

const ZONE_NAME = "pardehantic.ir";
const API_BASE = "https://api.cloudflare.com/client/v4";

const RECORDS = [
  {
    name: "_index._agents.pardehantic.ir",
    type: "SVCB",
    content: "1 pardehantic.ir. alpn=\\\"h3,h2\\\" port=443 mandatory=alpn,port key100000=\\\"agent-index\\\" key100001=\\\"discovery\\\" key100002=\\\"/.well-known\\\"",
    ttl: 3600,
    comment: "DNS-AID index agent endpoint",
  },
  {
    name: "_a2a._agents.pardehantic.ir",
    type: "SVCB",
    content: "1 mcp.pardehantic.ir. alpn=\\\"h3,h2\\\" port=443 mandatory=alpn,port key100000=\\\"agent-a2a\\\" key100001=\\\"mcp\\\" key100002=\\\"streamable-http\\\"",
    ttl: 3600,
    comment: "DNS-AID A2A / MCP agent endpoint",
  },
];

function env(name, fallback) {
  return process.env[name] ?? fallback;
}

async function cfRequest(path, opts = {}) {
  const token = env("CLOUDFLARE_API_TOKEN");
  if (!token) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN is not set. Set it in backend/.env or export it before running."
    );
  }
  const url = `${API_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    const errors = body.errors?.map((e) => e.message).join(", ") || res.statusText;
    throw new Error(`Cloudflare API error (${res.method} ${path}): ${errors}`);
  }
  return body.result;
}

async function getZoneId() {
  const explicit = env("CLOUDFLARE_ZONE_ID");
  if (explicit) return explicit;

  const zones = await cfRequest(`/zones?name=${encodeURIComponent(ZONE_NAME)}`, {
    method: "GET",
  });
  if (!zones.length) {
    throw new Error(`Cloudflare zone not found for ${ZONE_NAME}`);
  }
  return zones[0].id;
}

async function getExistingRecords(zoneId) {
  const records = await cfRequest(
    `/zones/${zoneId}/dns_records?type=SVCB&name=_agents.${ZONE_NAME}`,
    { method: "GET" }
  );
  return Array.isArray(records) ? records : [];
}

function buildSvcbContent(record) {
  // Cloudflare stores SVCB content as the full RDATA text (priority target params...).
  // Example: "1 pardehantic.ir. alpn=\"h3,h2\" port=443 mandatory=alpn,port"
  return record.content;
}

async function upsertRecord(zoneId, record, existing) {
  const match = existing.find((r) => r.name === record.name && r.type === "SVCB");
  const content = buildSvcbContent(record);

  if (match) {
    const updated = await cfRequest(`/zones/${zoneId}/dns_records/${match.id}`, {
      method: "PUT",
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content,
        ttl: record.ttl,
        comment: record.comment,
      }),
    });
    return { action: "updated", record: updated };
  }

  const created = await cfRequest(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: record.type,
      name: record.name,
      content,
      ttl: record.ttl,
      comment: record.comment,
    }),
  });
  return { action: "created", record: created };
}

async function main() {
  const zoneId = await getZoneId();
  console.log(`Zone: ${ZONE_NAME} (id: ${zoneId})`);

  const existing = await getExistingRecords(zoneId);
  console.log(`Found ${existing.length} existing SVCB records under _agents.${ZONE_NAME}`);

  const results = [];
  for (const record of RECORDS) {
    const result = await upsertRecord(zoneId, record, existing);
    results.push(result);
    console.log(
      `  [${result.action}] ${record.name}  ->  ${record.content}`
    );
  }

  console.log("\nDNS-AID records published. Enable DNSSEC in Cloudflare (DNS -> DNSSEC).");
  console.log("Validate with: POST https://isitagentready.com/api/scan  {\"url\":\"https://pardehantic.ir\"}");
  console.log('Check: checks.discoverability.dnsAid.status === "pass"');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
