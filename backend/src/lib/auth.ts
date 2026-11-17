import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_EXPIRES = "7d";

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

/** Read at call-time so dotenv has already loaded (ESM import order is not guaranteed). */
function jwtSecret() {
  return process.env.JWT_SECRET || "dev-secret-change-me";
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
