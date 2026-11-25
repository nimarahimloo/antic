import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_EXPIRES = "7d";

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

const DEFAULT_JWT_SECRET = "dev-secret-change-me";

/** Read at call-time so dotenv has already loaded (ESM import order is not guaranteed). */
function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production. Refusing to start with default secret.");
    }
    return DEFAULT_JWT_SECRET;
  }
  if (secret === DEFAULT_JWT_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is set to the default development value. Must use a strong random secret in production.");
  }
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, jwtSecret()) as JwtPayload;
}
