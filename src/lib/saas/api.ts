import { supabase } from "@/lib/supabase";
import type { FurnitureConfig } from "@/lib/furniture/types";

export type Role = "OWNER" | "ADMIN" | "STAFF" | "CUSTOMER";
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  published: boolean;
}
export type CatalogKind = "model" | "material" | "handle" | "accessory";
export interface CatalogItem {
  id?: string;
  organization_id?: string;
  kind: CatalogKind;
  source_id: string;
  name: string;
  description: string;
  active: boolean;
  data: Record<string, unknown>;
}
export interface TenantConfig {
  organization: Organization;
  catalog: CatalogItem[];
}
export function client() {
  if (!supabase) throw new Error("A conexão com o Supabase não está configurada.");
  return supabase;
}
export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
}
export async function getTenant(slug: string): Promise<TenantConfig> {
  const { data, error } = await client().rpc("get_public_tenant", {
    tenant_slug: slug,
  });
  if (error) throw error;
  if (!data) throw new Error("Marcenaria não encontrada ou configurador indisponível.");
  return data as TenantConfig;
}
export async function createOrganization(name: string, slug: string, profileName: string) {
  const { data, error } = await client().rpc("create_organization", {
    company_name: name,
    company_slug: slug,
    profile_name: profileName,
  });
  if (error) throw error;
  return data as string;
}
export async function submitQuote(
  tenant: TenantConfig,
  config: FurnitureConfig,
  customer: Record<string, string>,
  proposalCode: string,
) {
  const { data, error } = await client().functions.invoke("tenant-quote", {
    body: {
      tenant_slug: tenant.organization.slug,
      configuration: config,
      customer_data: customer,
      proposal_code: proposalCode,
    },
  });
  if (error) {
    if ("context" in error && error.context instanceof Response) {
      const details = await error.context.json().catch(() => null);
      if (details?.error) throw new Error(String(details.error));
    }
    throw error;
  }
  return data as { id: string; code: string };
}
export async function saveOrganizationProject(
  org: Organization,
  config: FurnitureConfig,
  price: number,
) {
  const c = client();
  const {
    data: { user },
    error: authError,
  } = await c.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Entre no painel para salvar um projeto na marcenaria.");
  const code = `M3D-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { error } = await c.from("projects").insert({
    id: crypto.randomUUID(),
    organization_id: org.id,
    user_id: user.id,
    code,
    config,
    price,
    status: "Novo projeto",
  });
  if (error) throw error;
  return code;
}

export function apiError(err: unknown): string {
  return err instanceof Error
    ? err.message
    : String((err as { message?: string })?.message ?? "Não foi possível concluir.");
}
