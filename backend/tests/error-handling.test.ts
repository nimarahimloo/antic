import assert from "node:assert";
import { describe, it } from "node:test";
import { HttpError, ErrorCode, sendError } from "../src/lib/errors.js";

function captureSendError(err: unknown): { status: number; body: unknown; headers: Record<string, string> } {
  let status = 200;
  let body: unknown = null;
  const headers: Record<string, string> = {};
  const res = {
    status: (s: number) => { status = s; return res; },
    set: (k: string, v: string) => { headers[k] = v; return res; },
    json: (b: unknown) => { body = b; return res; },
  } as any;
  sendError(res, err);
  return { status, body, headers };
}

describe("Backend error handling — HttpError", () => {
  it("returns stable code + Persian message + requestId for HttpError", () => {
    const err = new HttpError(403, ErrorCode.FORBIDDEN, "some english message");
    const { status, body, headers } = captureSendError(err);
    assert.strictEqual(status, 403);
    assert.strictEqual((body as { code: string }).code, ErrorCode.FORBIDDEN);
    assert.strictEqual((body as { error: string }).error, "شما دسترسی به این عملیات را ندارید.");
    assert.ok((body as { requestId: string }).requestId, "requestId should be present");
    const xrid = headers["X-Request-Id"] ?? headers["x-request-id"];
    assert.ok(xrid, "x-request-id header should be present");
  });

  it("sets WWW-Authenticate header on 401", () => {
    const err = new HttpError(401, ErrorCode.AUTH_REQUIRED, "please login");
    const { headers } = captureSendError(err);
    const wwwAuth = headers["WWW-Authenticate"] ?? headers["www-authenticate"];
    assert.ok(wwwAuth);
    assert.ok(wwwAuth.includes("Bearer"));
  });

  it("backward-compatible: new HttpError(400, 'plain message') auto-generates code", () => {
    const err = new HttpError(400, "some plain message");
    const { body } = captureSendError(err);
    assert.strictEqual((body as { code: string }).code, ErrorCode.VALIDATION);
    assert.strictEqual((body as { error: string }).error, "دادهٔ ارسالی نامعتبر است.");
  });
});

describe("Backend error handling — Prisma codes", () => {
  it("P2002 → 409 CONFLICT", () => {
    const err = { code: "P2002", name: "PrismaClientKnownRequestError", message: "Unique constraint" };
    const { status, body } = captureSendError(err);
    assert.strictEqual(status, 409);
    assert.strictEqual((body as { code: string }).code, ErrorCode.CONFLICT);
  });

  it("P2025 → 404 NOT_FOUND", () => {
    const err = { code: "P2025", name: "PrismaClientKnownRequestError", message: "Record not found" };
    const { status, body } = captureSendError(err);
    assert.strictEqual(status, 404);
    assert.strictEqual((body as { code: string }).code, ErrorCode.NOT_FOUND);
  });

  it("P2003 → 400 BAD_REFERENCE", () => {
    const err = { code: "P2003", name: "PrismaClientKnownRequestError", message: "Foreign key constraint" };
    const { status, body } = captureSendError(err);
    assert.strictEqual(status, 400);
    assert.strictEqual((body as { code: string }).code, ErrorCode.BAD_REFERENCE);
  });
});

describe("Backend error handling — unknown/internal", () => {
  it("unknown error → 500 INTERNAL_ERROR", () => {
    const err = new Error("unexpected boom");
    const { status, body } = captureSendError(err);
    assert.strictEqual(status, 500);
    assert.strictEqual((body as { code: string }).code, ErrorCode.INTERNAL);
  });

  it("never exposes stack traces or internal paths in response", () => {
    const err = new Error("boom at /sensitive/path");
    err.stack = "Error: boom at /sensitive/path\n    at Function.x (/sensitive/path:1:1)";
    const { body } = captureSendError(err);
    const bodyStr = JSON.stringify(body);
    assert.ok(!bodyStr.includes("/sensitive/path"));
    assert.ok(!bodyStr.includes("stack"));
    assert.ok(!bodyStr.includes("boom at /sensitive/path"));
  });
});
