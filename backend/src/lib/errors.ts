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

export function sendError(res: Response, err: unknown) {
  if (err instanceof HttpError) {
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
      console.error(err);
      return res.status(400).json({
        error: "دادهٔ ارسالی با مدل دیتابیس سازگار نیست.",
      });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
