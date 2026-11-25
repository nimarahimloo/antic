/**
 * Antic Curtain — Email Sending Worker
 *
 * Uses the Cloudflare Workers Email Sending binding (`env.EMAIL`) to dispatch
 * transactional emails directly from Worker code. No API token required.
 *
 * Bind the `EMAIL` service in `wrangler.jsonc` via the `send_email` resource.
 */

interface Env {
  EMAIL: {
    send: (options: {
      to: string;
      from: string;
      subject: string;
      html?: string;
      text?: string;
    }) => Promise<{ messageId: string }>;
  };
}

interface ExecutionContext {
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
}

const FROM_EMAIL = "welcome@mail.pardehantic.ir";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "antic-email-worker" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send a welcome email (POST /send-welcome)
    if (url.pathname === "/send-welcome" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          to?: string;
          fullName?: string;
        };

        const to = body.to || "nimarahimloo1379@gmail.com";
        const fullName = body.fullName || "کاربر عزیز";

        const response = await env.EMAIL.send({
          to,
          from: FROM_EMAIL,
          subject: "خوش آمدید به پرده آنتیک — Welcome to Antic Curtain",
          html: `
            <h1>سلام ${fullName}!</h1>
            <p>به <strong>پرده آنتیک</strong> خوش آمدید.</p>
            <p>حساب شما با موفقیت ساخته شد. اکنون می‌توانید دسته‌بندی و مدل‌های پرده را مشاهده کنید و خرید آنلاین انجام دهید.</p>
            <p><a href="https://pardehantic.ir/shop">بازدید از فروشگاه</a></p>
          `,
          text: `سلام ${fullName}!\n\nبه پرده آنتیک خوش آمدید. حساب شما با موفقیت ساخته شد. اکنون می‌توانید دسته‌بندی و مدل‌های پرده را مشاهده کنید و خرید آنلاین انجام دهید.\n\nبازدید از فروشگاه: https://pardehantic.ir/shop`,
        });

        return new Response(
          JSON.stringify({ ok: true, messageId: response.messageId, to }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : "Unknown error",
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }

    // Send a generic email (POST /send)
    if (url.pathname === "/send" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          to: string;
          subject: string;
          html?: string;
          text?: string;
          from?: string;
        };

        const response = await env.EMAIL.send({
          to: body.to,
          from: body.from || FROM_EMAIL,
          subject: body.subject,
          html: body.html,
          text: body.text,
        });

        return new Response(
          JSON.stringify({ ok: true, messageId: response.messageId }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : "Unknown error",
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }

    return new Response("Antic Curtain Email Worker — use POST /send-welcome or POST /send", {
      status: 200,
    });
  },
} satisfies ExportedHandler<Env>;
