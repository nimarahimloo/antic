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

export function sendError(res: Response, err: unknown) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      extra_data: err.data,
    });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
