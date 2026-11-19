import type { Request } from "express";

/**
 * Express 5 types route params as `string | string[]` (to support wildcards).
 * For our routes every param is a single segment, so normalize it to a string.
 *
 * Returns an empty string when the param is missing or an array (which should
 * never happen for the routes using it).
 */
export function routeParam(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[] | undefined>)[name];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}
