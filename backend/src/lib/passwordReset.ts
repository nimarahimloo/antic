import crypto from "crypto";
import { prisma } from "./prisma.js";
import { hashPassword } from "./auth.js";

/**
 * Password reset flow.
 *
 * Security notes:
 * - The reset token is generated with crypto.randomBytes and only its SHA-256
 *   hash is stored, so a database leak cannot be used to reset passwords.
 * - Tokens are single-use: `usedAt` is stamped on redemption.
 * - Tokens expire (30 minutes by default).
 * - Responses never reveal whether an email exists (no user enumeration).
 */

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function resetTokenTtlMs() {
  const fromEnv = Number(process.env.PASSWORD_RESET_TTL_MINUTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv * 60 * 1000;
  return TOKEN_TTL_MS;
}

/**
 * Create a reset token for the given email.
 * Returns the raw token only when a matching user exists — the caller must
 * not reveal that difference to the end user.
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user || !user.passwordHash) return null;

  // Invalidate any previously issued, still-valid tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + resetTokenTtlMs()),
    },
  });

  return raw;
}

/** Redeem a reset token and set the new password. Returns true on success. */
export async function redeemPasswordResetToken(rawToken: string, newPassword: string): Promise<boolean> {
  if (!rawToken || !newPassword) return false;

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  });

  if (!row) return false;
  if (row.usedAt) return false;
  if (row.expiresAt.getTime() < Date.now()) return false;

  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  // Drop every other outstanding token for this account.
  await prisma.passwordResetToken.updateMany({
    where: { userId: row.userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  return true;
}

/** Housekeeping — remove expired tokens. Safe to call periodically. */
export async function purgeExpiredResetTokens() {
  try {
    await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    /* best effort */
  }
}
