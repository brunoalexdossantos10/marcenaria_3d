import { normalizeConfig } from "../../../src/lib/furniture/builder.ts";
import {
  parseFurnitureConfig,
  isConfigurationAllowed,
  customerSchema,
} from "../../../src/lib/furniture/configValidation.ts";
import { computeScenePrice } from "../../../src/lib/furniture/pricing.ts";
import type { FurnitureConfig } from "../../../src/lib/furniture/types.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  const apiKey = req.headers.get("apikey");
  if (!apiKey) return reply({ error: "Credencial do aplicativo ausente." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: "Serviço temporariamente indisponível." }, 503);
  try {
    // Limit the request while streaming, before parsing or building geometry.
    if (Number(req.headers.get("content-length")) > 270000)
      return reply({ error: "Projeto grande demais." }, 413);
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: "Proposta vazia." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 270000) {
        await reader.cancel();
        return reply({ error: "Projeto grande demais." }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof body.tenant_slug !== "string" || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(body.tenant_slug))
      return reply({ error: "Marcenaria inválida." }, 400);
    // Validate the caller's project API key via the Data API. This supports
    // publishable keys and anonymous visitors without trusting a client JWT.
    const tenantResponse = await fetch(`${url}/rest/v1/rpc/get_public_tenant`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_slug: body.tenant_slug }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tenantResponse.ok) return reply({ error: "Credencial do aplicativo inválida." }, 401);
    const tenant = await tenantResponse.json();
    if (!tenant) return reply({ error: "Marcenaria indisponível." }, 404);
    const parsed = parseFurnitureConfig(body.configuration);
    const config = normalizeConfig(parsed as FurnitureConfig);
    if (!isConfigurationAllowed(config, tenant.catalog))
      return reply(
        {
          error: "Uma opção deste projeto não está disponível no catálogo da marcenaria.",
        },
        400,
      );
    // The only pricing implementation is the existing shared TypeScript module.
    const price = computeScenePrice(config);
    const customerValidation = customerSchema.safeParse(body.customer_data);
    if (!customerValidation.success)
      return reply(
        {
          error: "Confira nome, telefone com DDD, e-mail e observações da proposta.",
        },
        400,
      );
    const customer = customerValidation.data;
    if (
      !customer ||
      typeof customer !== "object" ||
      Array.isArray(customer) ||
      typeof customer.name !== "string" ||
      typeof customer.phone !== "string"
    )
      return reply({ error: "Informe nome e telefone." }, 400);
    const proposalCode =
      typeof body.proposal_code === "string" &&
      /^M3D-[0-9]{4}-[A-F0-9]{12}$/.test(body.proposal_code)
        ? body.proposal_code
        : undefined;
    const response = await fetch(`${url}/rest/v1/rpc/submit_tenant_quote`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenant_slug: body.tenant_slug,
        configuration: config,
        estimated_price: price.total,
        customer_data: {
          ...customer,
          ...(proposalCode ? { proposal_code: proposalCode } : {}),
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok)
      return reply(
        { error: result.message || "Não foi possível enviar a proposta." },
        response.status === 429 || /^Muitas solicitações|^Você já enviou/.test(result.message ?? "")
          ? 429
          : 400,
      );
    return reply({ ...result, price: price.total });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "SyntaxError" || error.message.startsWith("Configuração inválida"))
    )
      return reply({ error: error.message }, 400);
    console.error("tenant-quote failed", error instanceof Error ? error.name : "UnknownError");
    return reply({ error: "Não foi possível enviar a proposta. Tente novamente." }, 503);
  }
});
