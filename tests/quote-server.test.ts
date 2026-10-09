import test from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig } from "../src/lib/furniture/builder.ts";
import { computeScenePrice } from "../src/lib/furniture/pricing.ts";

let handler: (req: Request) => Promise<Response>;
const runtime = globalThis as typeof globalThis & { Deno: unknown };
runtime.Deno = {
  serve: (fn: typeof handler) => {
    handler = fn;
  },
  env: {
    get: (name: string) =>
      name === "SUPABASE_URL" ? "https://example.invalid" : "test-service-key",
  },
};
await import("../supabase/functions/tenant-quote/index.ts");
const originalFetch = globalThis.fetch;
test.after(() => {
  globalThis.fetch = originalFetch;
});

test("quote server ignores a forged client price and computes the real total", async () => {
  const config = normalizeConfig({ type: "guarda-roupa" });
  let submitted: Record<string, unknown> | null = null;
  globalThis.fetch = async (input, options) => {
    if (String(input).endsWith("get_public_tenant")) return Response.json({ catalog: [] });
    submitted = JSON.parse(String(options?.body));
    return Response.json({ id: "id", code: "M3D-2026-ABCDEF123456" });
  };
  const response = await handler(
    new Request("https://example.invalid", {
      method: "POST",
      headers: { apikey: "test-public-key" },
      body: JSON.stringify({
        tenant_slug: "test-tenant",
        configuration: config,
        estimated_price: 0,
        customer_data: { name: "Cliente", phone: "5511999999999" },
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(submitted?.estimated_price, computeScenePrice(config).total);
  assert.equal((await response.json()).price, computeScenePrice(config).total);
});
test("missing app key is rejected without touching the database", async () => {
  let requested = false;
  globalThis.fetch = async () => {
    requested = true;
    return Response.json({});
  };
  assert.equal(
    (await handler(new Request("https://example.invalid", { method: "POST", body: "{}" }))).status,
    401,
  );
  assert.equal(requested, false);
});
test("invalid configuration and inactive catalog selections never reach quote storage", async () => {
  let submissions = 0;
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("get_public_tenant"))
      return Response.json({
        catalog: [{ kind: "model", source_id: "guarda-roupa", active: false }],
      });
    submissions++;
    return Response.json({});
  };
  for (const config of [
    normalizeConfig({ type: "guarda-roupa" }),
    { type: "guarda-roupa", width: null, height: 220, depth: 60 },
  ]) {
    const response = await handler(
      new Request("https://example.invalid", {
        method: "POST",
        headers: { apikey: "test-public-key" },
        body: JSON.stringify({
          tenant_slug: "test-tenant",
          configuration: config,
          customer_data: { name: "Cliente", phone: "5511999999999" },
        }),
      }),
    );
    assert.equal(response.status, 400);
  }
  assert.equal(submissions, 0);
});
