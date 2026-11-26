/**
 * Outbound email — "All Service Mail" for antic-curtain.
 *
 * Transports (in priority order):
 *   1. Cloudflare SMTP via nodemailer — when CLOUDFLARE_SMTP_PASS + CLOUDFLARE_EMAIL_FROM set
 *      (host: smtp.mx.cloudflare.net, port: 465, secure: true, username: "api_token")
 *   2. Cloudflare Email Sending API (REST) — ONLY as explicit fallback when CLOUDFLARE_ACCOUNT_ID +
 *      CLOUDFLARE_API_TOKEN + CLOUDFLARE_EMAIL_FROM set AND Cloudflare SMTP is NOT configured
 *   3. Console log (local dev / demo — only when NO transport is configured)
 *
 * Env:
 *   CLOUDFLARE_SMTP_PASS — REQUIRED for SMTP transport (password for username "api_token")
 *   CLOUDFLARE_EMAIL_FROM — REQUIRED sender address for ALL transports (never "api_token")
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN — for REST API fallback ONLY
 *
 * IMPORTANT:
 * - Generic SMTP is NOT supported.
 * - If a configured transport fails, the REAL error is thrown. No silent fallback.
 * - Console transport is ONLY used when NO transport is configured.
 */

import nodemailer, { type Transporter } from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailResult {
  sent: boolean;
  transport: "cloudflare-smtp" | "cloudflare-api" | "console";
}

/* ------------------------------------------------------------------ */
/* Header sanitisation                                                */
/* ------------------------------------------------------------------ */

export function mailFromAddress(): string {
  const from = process.env.CLOUDFLARE_EMAIL_FROM ||
    process.env.SMTP_FROM ||
    "no-reply@antic.local";
  return sanitizeHeaderValue(from);
}

function sanitizeHeaderValue(value: string) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function getRequiredFromAddress(): string {
  const from = process.env.CLOUDFLARE_EMAIL_FROM;
  if (!from) {
    throw new Error("CLOUDFLARE_EMAIL_FROM is required for sending email");
  }
  return sanitizeHeaderValue(from);
}

function hasSmtpIntent(): boolean {
  return Boolean(process.env.CLOUDFLARE_SMTP_PASS);
}

function hasApiIntent(): boolean {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

function cloudflareSmtpConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_SMTP_PASS && process.env.CLOUDFLARE_EMAIL_FROM);
}

function cloudflareApiConfigured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_API_TOKEN &&
      process.env.CLOUDFLARE_EMAIL_FROM
  );
}

/* ------------------------------------------------------------------ */
/* Transport 1 — Cloudflare SMTP via nodemailer (PRIMARY)             */
/* ------------------------------------------------------------------ */

let cloudflareSmtpTransporter: Transporter | null = null;

function getCloudflareSmtpTransporter(): Transporter | null {
  if (!cloudflareSmtpConfigured()) return null;
  if (cloudflareSmtpTransporter) return cloudflareSmtpTransporter;

  const transporter = nodemailer.createTransport({
    host: "smtp.mx.cloudflare.net",
    port: 465,
    secure: true, // implicit TLS
    auth: {
      user: "api_token",
      pass: process.env.CLOUDFLARE_SMTP_PASS!,
    },
  });

  cloudflareSmtpTransporter = transporter;
  return transporter;
}

async function sendViaCloudflareSmtp(message: MailMessage): Promise<MailResult> {
  const transporter = getCloudflareSmtpTransporter();
  if (!transporter) {
    throw new Error("Cloudflare SMTP not configured");
  }

  const to = sanitizeHeaderValue(message.to);
  const subject = sanitizeHeaderValue(message.subject);
  const from = getRequiredFromAddress();

  try {
    const info = await transporter.sendMail({
      from: `"پرده آنتیک" <${from}>`,
      to,
      subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });

    console.log(
      `[mail:cloudflare-smtp:sent] to=${to} subject=${subject} messageId=${info.messageId}`
    );
    return { sent: true, transport: "cloudflare-smtp" };
  } catch (err) {
    console.error("[mail:cloudflare-smtp:error]", err);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Transport 2 — Cloudflare Email Sending API (REST) — FALLBACK ONLY  */
/* ------------------------------------------------------------------ */

async function sendViaCloudflareApi(message: MailMessage): Promise<MailResult> {
  if (!cloudflareApiConfigured()) {
    throw new Error("Cloudflare Email API not configured");
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
  const from = getRequiredFromAddress();
  const to = sanitizeHeaderValue(message.to);
  const subject = sanitizeHeaderValue(message.subject);

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject,
          content: [
            { type: "text/plain", value: message.text },
            ...(message.html ? [{ type: "text/html", value: message.html }] : []),
          ],
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Cloudflare Email API HTTP ${res.status}: ${errText}`);
    }

    const result = (await res.json()) as { success?: boolean; errors?: unknown[] };
    if (result.success !== true) {
      throw new Error(`Cloudflare Email API error: ${JSON.stringify(result.errors)}`);
    }

    console.log(`[mail:cloudflare-api:sent] to=${to} subject=${subject}`);
    return { sent: true, transport: "cloudflare-api" };
  } catch (err) {
    console.error("[mail:cloudflare-api:error]", err);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Transport 3 — Console log (dev only, when NO transport configured) */
/* ------------------------------------------------------------------ */

function sendViaConsole(message: MailMessage): MailResult {
  console.log(
    `[mail:console:sent] to=${message.to} subject=${message.subject}\n${message.text}`
  );
  return { sent: false, transport: "console" };
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Send an email.
 * Priority:
 *   1. Cloudflare SMTP (if CLOUDFLARE_SMTP_PASS + CLOUDFLARE_EMAIL_FROM)
 *   2. Cloudflare Email API (if CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN + CLOUDFLARE_EMAIL_FROM)
 *   3. Console log (if NO transport configured)
 *
 * If CLOUDFLARE_SMTP_PASS is set but CLOUDFLARE_EMAIL_FROM is missing,
 * or if CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN are set but
 * CLOUDFLARE_EMAIL_FROM is missing, a configuration error is thrown.
 * No silent fallback to console.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const to = sanitizeHeaderValue(message.to);
  const subject = sanitizeHeaderValue(message.subject);
  const sanitizedMessage = { ...message, to, subject };

  // Check for SMTP intent (SMTP_PASS set) - requires EMAIL_FROM
  if (hasSmtpIntent()) {
    if (!process.env.CLOUDFLARE_EMAIL_FROM) {
      throw new Error("CLOUDFLARE_EMAIL_FROM is required when CLOUDFLARE_SMTP_PASS is set");
    }
    return sendViaCloudflareSmtp(sanitizedMessage);
  }

  // Check for API fallback intent (ACCOUNT_ID + API_TOKEN set) - requires EMAIL_FROM
  if (hasApiIntent()) {
    if (!process.env.CLOUDFLARE_EMAIL_FROM) {
      throw new Error("CLOUDFLARE_EMAIL_FROM is required when CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set");
    }
    return sendViaCloudflareApi(sanitizedMessage);
  }

  // No transport intent configured - use console (dev only)
  return sendViaConsole(sanitizedMessage);
}

/**
 * Send a templated email. Convenience wrapper around sendMail().
 */
export async function sendTemplatedMail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<MailResult> {
  return sendMail({ to, subject: sanitizeHeaderValue(subject), text, html });
}

/**
 * Close all SMTP transporters (useful for graceful shutdown).
 */
export async function closeMailTransporters(): Promise<void> {
  if (cloudflareSmtpTransporter) {
    await cloudflareSmtpTransporter.close();
    cloudflareSmtpTransporter = null;
  }
}