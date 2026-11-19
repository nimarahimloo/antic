/**
 * Outbound email.
 *
 * The project is self-hosted, so SMTP is the only transport we depend on.
 * When SMTP is not configured (local dev / demo), the message is logged to
 * the server console instead of being sent — that keeps the password-reset
 * flow fully testable without any external account.
 *
 * Env:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

/** Strip anything that could inject extra headers (CR/LF, newlines). */
function sanitizeHeaderValue(value: string) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

export function mailFromAddress() {
  return sanitizeHeaderValue(
    process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@antic.local"
  );
}

/**
 * Send an email. Returns true when it was actually handed to an SMTP server,
 * false when it was only logged (no SMTP configured).
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const to = sanitizeHeaderValue(message.to);
  const subject = sanitizeHeaderValue(message.subject);

  if (!smtpConfigured()) {
    console.log(
      `[mail:logged-to-console] to=${to} subject=${subject}\n${message.text}`
    );
    return false;
  }

  const host = String(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE
    ? /^(1|true|yes)$/i.test(process.env.SMTP_SECURE)
    : port === 465;

  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  // Minimal SMTP conversation (ESMTP + optional AUTH LOGIN) implemented on top
  // of node:net / node:tls so we don't add an extra dependency.
  const { connect } = await import("node:net");
  const { connect: connectTls } = await import("node:tls");

  const socket = secure
    ? await new Promise<import("node:tls").TLSSocket>((resolve, reject) => {
        const s = connectTls({ host, port, servername: host }, () => resolve(s));
        s.once("error", reject);
      })
    : await new Promise<import("node:net").Socket>((resolve, reject) => {
        const s = connect({ host, port }, () => resolve(s));
        s.once("error", reject);
      });

  const readReply = () =>
    new Promise<string>((resolve, reject) => {
      let buffer = "";
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        // SMTP multiline replies: "250-..." continues, "250 ..." ends.
        const lines = buffer.split(/\r?\n/).filter((l) => l.length > 0);
        if (lines.length === 0) return;
        const last = lines[lines.length - 1];
        if (/^\d{3} /.test(last)) {
          socket.off("data", onData);
          resolve(buffer);
        }
      };
      socket.on("data", onData);
      socket.once("error", reject);
      socket.once("close", () => resolve(buffer));
    });

  const send = async (line: string) => {
    socket.write(line + "\r\n");
    return readReply();
  };

  try {
    await readReply(); // greeting
    await send("EHLO antic.local");
    if (user) {
      await send("AUTH LOGIN");
      await send(Buffer.from(user).toString("base64"));
      await send(Buffer.from(pass).toString("base64"));
    }
    await send(`MAIL FROM:<${mailFromAddress()}>`);
    await send(`RCPT TO:<${to}>`);
    await send("DATA");

    const body = [
      `From: ${mailFromAddress()}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      message.text,
    ].join("\r\n");

    // Escape leading dots so a line "." does not terminate the DATA block.
    const escaped = body.replace(/\r?\n\./g, "\r\n..");
    socket.write(escaped + "\r\n.\r\n");
    await readReply();
    await send("QUIT");
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  } finally {
    socket.end();
    socket.destroy();
  }
}
