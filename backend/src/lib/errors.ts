import type { Response } from "express";

export class HttpError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function prismaCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: string }).code);
  }
  return undefined;
}

function resourceMetadataUrl(): string {
  const base = process.env.PUBLIC_BASE_URL || "https://pardehantic.ir";
  return base.replace(/\/$/, "") + "/.well-known/oauth-protected-resource";
}

export function sendError(res: Response, err: unknown) {
  if (err instanceof HttpError) {
    if (err.status === 401) {
      res.set(
        "WWW-Authenticate",
        `Bearer realm="pardehantic", resource_metadata="${resourceMetadataUrl()}"`
      );
    }
    return res.status(err.status).json({
      error: err.message,
      extra_data: err.data,
    });
  }

  const code = prismaCode(err);
  if (code === "P2002") {
    return res.status(409).json({ error: "رکورد تکراری است (unique constraint)." });
  }
  if (code === "P2025") {
    return res.status(404).json({ error: "رکورد پیدا نشد." });
  }
  if (code === "P2003") {
    return res.status(400).json({ error: "ارجاع نامعتبر به رکورد دیگر." });
  }

  // Prisma validation / unknown arg
  if (err && typeof err === "object" && "name" in err) {
    const name = String((err as { name: string }).name);
    if (name === "PrismaClientValidationError") {
      // Log only safe fields - never expose full error with potentially sensitive path info
      console.error("Prisma validation error", { name, message: (err as { message?: string }).message });
      return res.status(400).json({
        error: "دادهٔ ارسالی با مدل دیتابیس سازگار نیست.",
      });
    }
  }

  // Log only safe fields for unknown errors
  if (err && typeof err === 'object') {
    const errObj = err as Record<string, unknown>;
    console.error("Internal server error", {
      name: errObj.name,
      code: errObj.code,
      message: typeof errObj.message === 'string' ? errObj.message : undefined,
    });
  } else {
    console.error("Internal server error", err);
  }
  return res.status(500).json({ error: "Internal server error" });
}
