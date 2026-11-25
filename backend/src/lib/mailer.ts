/**
 * Outbound email — "All Service Mail" for antic-curtain.
 *
 * Transports (in priority order):
 *   1. Cloudflare Email Sending API (REST) — when CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN set
 *   2. Cloudflare SMTP via nodemailer — when CLOUDFLARE_SMTP_USER + CLOUDFLARE_SMTP_PASS set
 *      (host: smtp.mx.cloudflare.net, port: 465, secure: true)
 *   3. Generic SMTP — when SMTP_HOST set
 *   4. Console log (local dev / demo — always testable)
 *
 * Env:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_EMAIL_FROM
 *   CLOUDFLARE_SMTP_USER, CLOUDFLARE_SMTP_PASS
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
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
  transport: "cloudflare-api" | "cloudflare-smtp" | "smtp" | "console";
}

/* ------------------------------------------------------------------ */
/* Header sanitisation                                                */
/* ------------------------------------------------------------------ */

function sanitizeHeaderValue(value: string) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

export function mailFromAddress() {
  return sanitizeHeaderValue(
    process.env.CLOUDFLARE_EMAIL_FROM ||
      process.env.SMTP_FROM ||
      process.env.CLOUDFLARE_SMTP_USER ||
      "no-reply@antic.local"
  );
}

function cloudflareApiConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

function cloudflareSmtpConfigured() {
  return Boolean(process.env.CLOUDFLARE_SMTP_USER && process.env.CLOUDFLARE_SMTP_PASS);
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

/* ------------------------------------------------------------------ */
/* Transport 1 — Cloudflare Email Sending API (REST)                  */
/* ------------------------------------------------------------------ */

async function sendViaCloudflareApi(message: MailMessage): Promise<MailResult | null> {
  if (!cloudflareApiConfigured()) return null;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!;
  const from = mailFromAddress();

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
          subject: message.subject,
          content: [
            { type: "text/plain", value: message.text },
            ...(message.html ? [{ type: "text/html", value: message.html }] : []),
          ],
        }),
      }
    );

    if (!res.ok) {
      console.error(
        `[mail:cloudflare-api:error] HTTP ${res.status} to=${message.to} subject=${message.subject}`
      );
      return null;
    }

    const result = (await res.json()) as { success?: boolean; errors?: unknown[] };
    if (result.success !== true) {
      console.error(
        `[mail:cloudflare-api:error] ${JSON.stringify(result.errors)} to=${message.to} subject=${message.subject}`
      );
      return null;
    }

    console.log(`[mail:cloudflare-api:sent] to=${message.to} subject=${message.subject}`);
    return { sent: true, transport: "cloudflare-api" };
  } catch (err) {
    console.error("[mail:cloudflare-api:error]", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Transport 2 — Cloudflare SMTP via nodemailer                       */
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
      user: process.env.CLOUDFLARE_SMTP_USER!,
      pass: process.env.CLOUDFLARE_SMTP_PASS!,
    },
  });

  cloudflareSmtpTransporter = transporter;
  return transporter;
}

async function sendViaCloudflareSmtp(message: MailMessage): Promise<MailResult | null> {
  const transporter = getCloudflareSmtpTransporter();
  if (!transporter) return null;

  const to = sanitizeHeaderValue(message.to);
  const subject = sanitizeHeaderValue(message.subject);
  const from = mailFromAddress();

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
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Transport 3 — Generic SMTP via nodemailer                          */
/* ------------------------------------------------------------------ */

let genericSmtpTransporter: Transporter | null = null;

function getGenericSmtpTransporter(): Transporter | null {
  if (!smtpConfigured()) return null;
  if (genericSmtpTransporter) return genericSmtpTransporter;

  const host = String(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE
    ? /^(1|true|yes)$/i.test(process.env.SMTP_SECURE)
    : port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || "",
          },
        }
      : {}),
  });

  genericSmtpTransporter = transporter;
  return transporter;
}

async function sendViaGenericSmtp(message: MailMessage): Promise<MailResult | null> {
  const transporter = getGenericSmtpTransporter();
  if (!transporter) return null;

  const to = sanitizeHeaderValue(message.to);
  const subject = sanitizeHeaderValue(message.subject);
  const from = mailFromAddress();

  try {
    const info = await transporter.sendMail({
      from: `"پرده آنتیک" <${from}>`,
      to,
      subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });

    console.log(
      `[mail:smtp:sent] to=${to} subject=${subject} messageId=${info.messageId}`
    );
    return { sent: true, transport: "smtp" };
  } catch (err) {
    console.error("[mail:smtp:error]", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Transport 4 — Console log (fallback)                               */
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
 * Send an email. Tries Cloudflare Email API first, then Cloudflare SMTP,
 * then generic SMTP, then logs to console. Returns a MailResult with the
 * transport used.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const to = sanitizeHeaderValue(message.to);
  const subject = sanitizeHeaderValue(message.subject);

  const cfApi = await sendViaCloudflareApi({ ...message, to, subject });
  if (cfApi) return cfApi;

  const cfSmtp = await sendViaCloudflareSmtp({ ...message, to, subject });
  if (cfSmtp) return cfSmtp;

  const smtp = await sendViaGenericSmtp({ ...message, to, subject });
  if (smtp) return smtp;

  return sendViaConsole({ ...message, to, subject });
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
  if (genericSmtpTransporter) {
    await genericSmtpTransporter.close();
    genericSmtpTransporter = null;
  }
}
