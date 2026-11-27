import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import {
  sendMail,
  closeMailTransporters,
} from "../src/lib/mailer.ts";

const MAIL_ENV_VARS = [
  "CLOUDFLARE_SMTP_PASS",
  "CLOUDFLARE_EMAIL_FROM",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
];

async function withEnvironment(values: Record<string, string>, callback: () => Promise<void>) {
  const previous = new Map(MAIL_ENV_VARS.map((name) => [name, process.env[name]]));
  try {
    for (const name of MAIL_ENV_VARS) {
      delete process.env[name];
      if (Object.hasOwn(values, name)) process.env[name] = values[name];
    }
    await callback();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

// Mock nodemailer to avoid actual network calls
const originalCreateTransport = nodemailer.createTransport;
let mockTransporter: { sendMail: (options: unknown) => Promise<{ messageId: string }>; close: () => Promise<void>; closed: boolean } | null = null;

function setupMockTransporter(sendMailImpl: (options: unknown) => Promise<{ messageId: string }>) {
  mockTransporter = {
    sendMail: sendMailImpl,
    close: async () => { mockTransporter!.closed = true; },
    closed: false,
  };
  nodemailer.createTransport = () => mockTransporter as unknown as ReturnType<typeof nodemailer.createTransport>;
}

function restoreMockTransporter() {
  nodemailer.createTransport = originalCreateTransport;
  mockTransporter = null;
}

// Mock fetch for Cloudflare API
const originalFetch = globalThis.fetch;

function setupMockFetch(fetchImpl: (url: string, options?: RequestInit) => Promise<Response>) {
  globalThis.fetch = fetchImpl as typeof globalThis.fetch;
}

function restoreMockFetch() {
  globalThis.fetch = originalFetch;
}

async function runWithMocks(testFn: () => Promise<void>) {
  try {
    await testFn();
  } finally {
    // Clear any cached transporter
    await closeMailTransporters();
    restoreMockTransporter();
    restoreMockFetch();
  }
}

test("sendMail uses Cloudflare SMTP as primary when configured", async () => {
  let sentVia: string | null = null;
  let sentFrom: string | null = null;

  await closeMailTransporters();
  setupMockTransporter(async (options) => {
    sentVia = "smtp";
    sentFrom = ((options as { from?: string }).from ?? null);
    return { messageId: "test-id" };
  });

  await withEnvironment(
    {
      CLOUDFLARE_SMTP_PASS: "test-pass",
      CLOUDFLARE_EMAIL_FROM: "sender@example.com",
    },
    async () => {
      await sendMail({
        to: "recipient@example.com",
        subject: "Test",
        text: "Body",
      });
    },
  );

  assert.equal(sentVia, "smtp");
  assert.ok(sentFrom!.includes("sender@example.com"), "From should contain CLOUDFLARE_EMAIL_FROM");
  assert.ok(!sentFrom!.includes("api_token"), "From should NOT be api_token");

  await runWithMocks(async () => {});
});

test("sendMail falls back to Cloudflare API when SMTP not configured but API is", async () => {
  let apiCalled = false;
  let apiFrom: string | null = null;

  await closeMailTransporters();
  setupMockFetch(async (url, options) => {
    apiCalled = true;
    const body = JSON.parse((options?.body as string) ?? "{}");
    apiFrom = body.from;
    return {
      ok: true,
      json: async () => ({ success: true }),
      text: async () => "",
    } as unknown as Response;
  });

  await withEnvironment(
    {
      CLOUDFLARE_ACCOUNT_ID: "test-account",
      CLOUDFLARE_API_TOKEN: "test-token",
      CLOUDFLARE_EMAIL_FROM: "api-sender@example.com",
    },
    async () => {
      await sendMail({
        to: "recipient@example.com",
        subject: "Test",
        text: "Body",
      });
    },
  );

  assert.equal(apiCalled, true);
  assert.equal(apiFrom, "api-sender@example.com");

  await runWithMocks(async () => {});
});

test("sendMail uses console transport when NO transport configured", async () => {
  let consoleLogged = false;

  const originalLog = console.log;
  console.log = (msg: unknown) => {
    if (String(msg).includes("mail:console:sent")) consoleLogged = true;
    originalLog(msg);
  };

  try {
    await closeMailTransporters();
    await withEnvironment({}, async () => {
      const result = await sendMail({
        to: "recipient@example.com",
        subject: "Test",
        text: "Body",
      });
      assert.equal(result.transport, "console");
      assert.equal(result.sent, false);
      assert.equal(consoleLogged, true);
    });
  } finally {
    console.log = originalLog;
    await runWithMocks(async () => {});
  }
});

test("sendMail throws real error when Cloudflare SMTP is configured but fails", async () => {
  const smtpError = new Error("SMTP connection refused");

  await closeMailTransporters();
  setupMockTransporter(async () => {
    throw smtpError;
  });

  await withEnvironment(
    {
      CLOUDFLARE_SMTP_PASS: "test-pass",
      CLOUDFLARE_EMAIL_FROM: "sender@example.com",
    },
    async () => {
      await assert.rejects(
        sendMail({
          to: "recipient@example.com",
          subject: "Test",
          text: "Body",
        }),
        /SMTP connection refused/,
      );
    },
  );

  await runWithMocks(async () => {});
});

test("sendMail throws real error when Cloudflare API is configured but fails", async () => {
  const apiError = new Error("Cloudflare Email API HTTP 401: Unauthorized");

  await closeMailTransporters();
  setupMockFetch((async () => {
    throw apiError;
  }) as (url: string, options?: RequestInit) => Promise<Response>);

  await withEnvironment(
    {
      CLOUDFLARE_ACCOUNT_ID: "test-account",
      CLOUDFLARE_API_TOKEN: "test-token",
      CLOUDFLARE_EMAIL_FROM: "api-sender@example.com",
    },
    async () => {
      await assert.rejects(
        sendMail({
          to: "recipient@example.com",
          subject: "Test",
          text: "Body",
        }),
        /Cloudflare Email API HTTP 401/,
      );
    },
  );

  await runWithMocks(async () => {});
});

test("sendMail sanitizes header values (newlines removed)", async () => {
  let sentSubject: string | null = null;
  let sentTo: string | null = null;

  await closeMailTransporters();
  setupMockTransporter(async (options) => {
    sentSubject = ((options as { subject?: string }).subject ?? null);
    sentTo = ((options as { to?: string }).to ?? null);
    return { messageId: "test-id" };
  });

  await withEnvironment(
    {
      CLOUDFLARE_SMTP_PASS: "test-pass",
      CLOUDFLARE_EMAIL_FROM: "sender@example.com",
    },
    async () => {
      await sendMail({
        to: "recipient@example.com\ninjected",
        subject: "Test\r\ninjected",
        text: "Body",
      });
    },
  );

  assert.equal(sentTo, "recipient@example.com injected");
  assert.equal(sentSubject, "Test injected");

  await runWithMocks(async () => {});
});

test("closeMailTransporters closes SMTP transporter", async () => {
  await closeMailTransporters();
  setupMockTransporter(async () => {
    return { messageId: "test-id" };
  });

  try {
    await withEnvironment(
      {
        CLOUDFLARE_SMTP_PASS: "test-pass",
        CLOUDFLARE_EMAIL_FROM: "sender@example.com",
      },
      async () => {
        await sendMail({
          to: "recipient@example.com",
          subject: "Test",
          text: "Body",
        });
        assert.equal(mockTransporter!.closed, false, "Transporter should not be closed before closeMailTransporters");
        await closeMailTransporters();
        assert.equal(mockTransporter!.closed, true, "Transporter should be closed after closeMailTransporters");
      },
    );
  } finally {
    await runWithMocks(async () => {});
  }
});

test("SMTP transport: when CLOUDFLARE_EMAIL_FROM is missing, throws error", async () => {
  await closeMailTransporters();
  setupMockTransporter(async () => {
    return { messageId: "test-id" };
  });

  await withEnvironment(
    {
      CLOUDFLARE_SMTP_PASS: "test-pass",
      // CLOUDFLARE_EMAIL_FROM intentionally missing
    },
    async () => {
      await assert.rejects(
        sendMail({
          to: "recipient@example.com",
          subject: "Test",
          text: "Body",
        }),
        /CLOUDFLARE_EMAIL_FROM is required/,
      );
    },
  );

  await runWithMocks(async () => {});
});

test("Cloudflare API fallback: when CLOUDFLARE_EMAIL_FROM is missing, throws error", async () => {
  await closeMailTransporters();
  setupMockFetch((async () => {
    return {
      ok: true,
      json: async () => ({ success: true }),
      text: async () => "",
    } as unknown as Response;
  }) as unknown as (url: string, options?: RequestInit) => Promise<Response>);

  await withEnvironment(
    {
      CLOUDFLARE_ACCOUNT_ID: "test-account",
      CLOUDFLARE_API_TOKEN: "test-token",
      // CLOUDFLARE_EMAIL_FROM intentionally missing
    },
    async () => {
      await assert.rejects(
        sendMail({
          to: "recipient@example.com",
          subject: "Test",
          text: "Body",
        }),
        /CLOUDFLARE_EMAIL_FROM is required/,
      );
    },
  );

  await runWithMocks(async () => {});
});

test("Cloudflare API is NOT used when SMTP is configured (priority)", async () => {
  let smtpCalled = false;
  let apiCalled = false;

  await closeMailTransporters();
  setupMockTransporter(async (options) => {
    smtpCalled = true;
    return { messageId: "test-id" };
  });

  setupMockFetch((async () => {
    apiCalled = true;
    return {
      ok: true,
      json: async () => ({ success: true }),
      text: async () => "",
    };
  }) as (url: string, options?: RequestInit) => Promise<Response>);

  await withEnvironment(
    {
      CLOUDFLARE_SMTP_PASS: "test-pass",
      CLOUDFLARE_EMAIL_FROM: "sender@example.com",
      CLOUDFLARE_ACCOUNT_ID: "test-account",
      CLOUDFLARE_API_TOKEN: "test-token",
    },
    async () => {
      await sendMail({
        to: "recipient@example.com",
        subject: "Test",
        text: "Body",
      });
    },
  );

  assert.equal(smtpCalled, true, "SMTP should be called");
  assert.equal(apiCalled, false, "API should NOT be called when SMTP is configured");

  await runWithMocks(async () => {});
});
