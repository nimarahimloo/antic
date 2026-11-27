import test from "node:test";
import assert from "node:assert/strict";
import { listAIProviders } from "../src/services/aiProviders.ts";

const names = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "AI_ENABLE_CLOUDFLARE",
  "NVIDIA_API_KEY",
  "AI_ENABLE_NVIDIA",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "AI_ENABLE_GOOGLE",
  "OPENROUTER_API_KEY",
  "AI_ENABLE_OPENROUTER",
];

function withEnvironment(values: Record<string, string>, callback: () => void) {
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) {
      delete process.env[name];
      if (Object.hasOwn(values, name)) process.env[name] = values[name];
    }
    callback();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("credentials do not activate providers without an explicit enable flag", () => {
  withEnvironment(
    {
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_API_TOKEN: "set",
      NVIDIA_API_KEY: "set",
      GOOGLE_GENERATIVE_AI_API_KEY: "set",
      OPENROUTER_API_KEY: "set",
    },
    () => {
      const providers = listAIProviders();
      assert.equal(providers.length, 4);
      assert.ok(providers.every((provider) => provider.configured === false));
    },
  );
});

test("a provider activates only when its own explicit enable flag is true", () => {
  withEnvironment(
    {
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_API_TOKEN: "set",
      AI_ENABLE_CLOUDFLARE: "true",
      NVIDIA_API_KEY: "set",
      AI_ENABLE_NVIDIA: "true",
      GOOGLE_GENERATIVE_AI_API_KEY: "set",
      AI_ENABLE_GOOGLE: "true",
      OPENROUTER_API_KEY: "set",
      AI_ENABLE_OPENROUTER: "true",
    },
    () => {
      const providers = listAIProviders();
      assert.ok(providers.every((provider) => provider.configured === true));
    },
  );
});
