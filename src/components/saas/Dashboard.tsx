import { createContext, useContext, useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  LayoutDashboard,
  FolderOpen,
  Users,
  Palette,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import type { Organization, Role, CatalogKind, CatalogItem } from "@/lib/saas/api";
import { client, createOrganization, slugify } from "@/lib/saas/api";
import { useAuth } from "@/lib/saas/context";
import {
  FURNITURE_TYPES,
  HANDLE_MODELS,
  ACCESSORIES,
  type FurnitureConfig,
} from "@/lib/furniture/types";
import { COMPONENT_CATALOG } from "@/lib/furniture/components";
import { MATERIALS } from "@/lib/furniture/materials";
import { brl } from "@/lib/furniture/pricing";
const NAV = [
  ["", "Visão geral", LayoutDashboard],
  ["projetos", "Projetos", FolderOpen],
  ["leads", "Leads", Users],
  ["modelos", "Modelos 3D", Boxes],
  ["materiais", "Materiais", Palette],
  ["puxadores", "Puxadores", Boxes],
  ["acessorios", "Acessórios", Boxes],
  ["minha-marca", "Minha marca", Palette],
  ["integracao", "Integração", ExternalLink],
  ["assinatura", "Assinatura", FolderOpen],
  ["configuracoes", "Configurações", Users],
] as const;
const DashboardContext = createContext<{
  org: Organization;
  role: Role;
  refresh: () => void;
} | null>(null);
function useDashboard() {
  const c = useContext(DashboardContext);
  if (!c) throw new Error("Organização indisponível");
  return c;
}
const input = "mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm";
const card = "rounded-2xl border border-border bg-card p-5";
function errorMessage(err: unknown) {
  return err instanceof Error
    ? err.message
    : String((err as { message?: string })?.message ?? "Não foi possível concluir.");
}
export function DashboardLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState("");
  const [mobile, setMobile] = useState(false);
  const membership = useQuery({
    queryKey: ["memberships", auth.user?.id],
    enabled: !!auth.user,
    retry: false,
    queryFn: async () => {
      const { data, error } = await client()
        .from("organization_members")
        .select("role, organizations(*)")
        .eq("user_id", auth.user!.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? [])
        .map((row) => ({
          role: row.role as Role,
          org: row.organizations as unknown as Organization,
        }))
        .filter((r) => r.org && r.role !== "CUSTOMER");
    },
  });
  useEffect(() => {
    if (!auth.loading && !auth.user) void navigate({ to: "/login" });
  }, [auth.loading, auth.user, navigate]);
  if (auth.loading || !auth.user || membership.isPending)
    return (
      <main className="flex min-h-screen items-center justify-center">Carregando seu espaço…</main>
    );
  if (membership.error)
    return (
      <main className="p-10">
        <p role="alert">{errorMessage(membership.error)}</p>
        <button className="btn-primary mt-4" onClick={() => membership.refetch()}>
          Tentar novamente
        </button>
      </main>
    );
  const entry = membership.data?.find((r) => r.org.id === selected) ?? membership.data?.[0];
  if (!entry)
    return <Onboarding onCreated={() => qc.invalidateQueries({ queryKey: ["memberships"] })} />;
  return (
    <DashboardContext.Provider
      value={{
        org: entry.org,
        role: entry.role,
        refresh: () => {
          void qc.invalidateQueries({ queryKey: ["memberships"] });
        },
      }}
    >
      <main className="flex min-h-screen bg-[#f6f5f1] text-foreground">
        <button
          className="fixed left-4 top-4 z-40 rounded-xl border bg-card p-2 lg:hidden"
          aria-label="Abrir navegação"
          onClick={() => setMobile(!mobile)}
        >
          {mobile ? <X size={20} /> : <Menu size={20} />}
        </button>
        <aside
          className={`${mobile ? "flex" : "hidden"} fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-white/10 bg-[#252e2b] px-5 pb-6 pt-16 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:pt-8`}
        >
          <Link to="/" className="mb-8 text-xl font-semibold">
            Modelador 3D <span className="text-[#bca787]">/</span>
          </Link>
          <p className="mb-4 truncate text-xs uppercase tracking-[.18em] text-[#c0b5a3]">
            {entry.org.name}
          </p>
          {(membership.data?.length ?? 0) > 1 && (
            <select
              aria-label="Marcenaria"
              className="mb-4 rounded bg-[#35413b] p-2 text-xs"
              value={entry.org.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {membership.data!.map((r) => (
                <option key={r.org.id} value={r.org.id}>
                  {r.org.name}
                </option>
              ))}
            </select>
          )}
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {NAV.map(([path, label, Icon]) => (
              <Link
                key={path}
                to={path ? "/dashboard/$section" : "/dashboard"}
                {...(path ? { params: { section: path } } : {})}
                onClick={() => setMobile(false)}
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-white/10 text-white" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/5"
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
          <a
            href={`/m/${entry.org.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-2 rounded-xl border border-white/15 p-3 text-sm"
          >
            <ExternalLink size={15} /> Abrir configurador
          </a>
          <button
            className="mt-4 flex items-center gap-2 px-3 text-sm text-white/60"
            onClick={async () => {
              await client().auth.signOut();
              qc.clear();
              await navigate({ to: "/login" });
            }}
          >
            <LogOut size={15} /> Sair
          </button>
        </aside>
        <section className="min-w-0 flex-1 px-5 pb-12 pt-20 md:px-10 lg:pt-10">
          <header className="mb-8 flex items-center justify-between border-b border-border pb-5">
            <span className="text-sm text-muted-foreground">Seu espaço de trabalho</span>
            <span className="text-xs text-muted-foreground">{auth.user.email}</span>
          </header>
          <Outlet key={entry.org.id} />
        </section>
      </main>
    </DashboardContext.Provider>
  );
}
function Onboarding({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(String(user?.user_metadata["company"] ?? ""));
  const [slug, setSlug] = useState(String(user?.user_metadata["company_slug"] ?? ""));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        className={`${card} w-full max-w-lg space-y-5`}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await createOrganization(name, slug, String(user?.user_metadata["name"] ?? ""));
            onCreated();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="text-sm text-muted-foreground">Modelador 3D</span>
        <h1 className="font-display text-3xl">Crie seu espaço.</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta está pronta. Defina a marcenaria e o endereço público do configurador.
        </p>
        <label className="block text-sm">
          Nome da marcenaria
          <input
            required
            minLength={2}
            maxLength={120}
            className={input}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
          />
        </label>
        <label className="block text-sm">
          Endereço: /m/
          <input
            required
            minLength={3}
            maxLength={64}
            pattern="[a-z0-9][a-z0-9-]{2,63}"
            className={input}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? "Criando…" : "Criar marcenaria"}
        </button>
        <button type="button" className="btn-ghost w-full" onClick={() => client().auth.signOut()}>
          Sair da conta
        </button>
      </form>
    </main>
  );
}
export function DashboardHome() {
  const { org } = useDashboard();
  const stats = useQuery({
    queryKey: ["overview", org.id],
    queryFn: async () => {
      const c = client();
      const results = await Promise.all([
        c
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id),
        c.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", org.id),
        c.from("catalog_items").select("kind,active").eq("organization_id", org.id),
        c
          .from("projects")
          .select("id,code,created_at,price,status")
          .eq("organization_id", org.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      for (const r of results) if (r.error) throw r.error;
      return {
        projects: results[0]!.count ?? 0,
        leads: results[1]!.count ?? 0,
        catalog: results[2]!.data as unknown as {
          kind: string;
          active: boolean;
        }[],
        recent: results[3]!.data as unknown as {
          id: string;
          code: string;
          created_at: string;
          price: number;
          status: string;
        }[],
      };
    },
  });
  const count = (kind: string, fallback: number) => {
    const list = stats.data?.catalog?.filter((c) => c.kind === kind);
    return list?.length ? list.filter((c) => c.active).length : fallback;
  };
  return (
    <>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Visão geral</p>
      <h1 className="mt-2 font-display text-4xl">Olá, {org.name}.</h1>
      <p className="mt-3 text-muted-foreground">
        Acompanhe as ideias que podem virar seus próximos projetos.
      </p>
      {stats.error && (
        <p role="alert" className="mt-4 text-destructive">
          {errorMessage(stats.error)}
        </p>
      )}
      <div className="my-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Projetos criados", stats.data?.projects ?? "—"],
          ["Leads recebidos", stats.data?.leads ?? "—"],
          ["Modelos disponíveis", stats.data ? count("model", FURNITURE_TYPES.length) : "—"],
          ["Materiais disponíveis", stats.data ? count("material", MATERIALS.length) : "—"],
        ].map(([label, value]) => (
          <article key={label} className={card}>
            <span className="text-sm text-muted-foreground">{label}</span>
            <p className="mt-5 text-4xl font-semibold tabular-nums">{value}</p>
          </article>
        ))}
      </div>
      <div className={card}>
        <h2 className="text-lg font-semibold">Projetos recentes</h2>
        {stats.isPending ? (
          <p className="mt-4 text-sm">Carregando…</p>
        ) : !stats.data?.recent.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum projeto ainda. Compartilhe seu configurador para receber as primeiras
            solicitações.
          </p>
        ) : (
          stats.data.recent.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-border py-4 text-sm">
              <span>
                {p.code}
                <small className="ml-3 text-muted-foreground">{p.status}</small>
              </span>
              <strong>{brl(p.price)}</strong>
            </div>
          ))
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/dashboard/$section" params={{ section: "minha-marca" }} className="btn-primary">
          Personalizar minha marca
        </Link>
        <Link to="/dashboard/$section" params={{ section: "integracao" }} className="btn-ghost">
          Compartilhar configurador
        </Link>
      </div>
    </>
  );
}
export function DashboardSection({ section }: { section: string }) {
  const label = NAV.find((n) => n[0] === section)?.[1];
  if (!label) return <p>Página não encontrada.</p>;
  return (
    <>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Sua marcenaria</p>
      <h1 className="mb-8 mt-2 font-display text-4xl">{label}</h1>
      {section === "minha-marca" ? (
        <Branding />
      ) : section === "integracao" ? (
        <Integration />
      ) : section === "assinatura" ? (
        <Subscription />
      ) : section === "configuracoes" ? (
        <Settings />
      ) : section === "projetos" || section === "leads" ? (
        <Records kind={section} />
      ) : (
        <CatalogEditor
          kind={
            (
              {
                modelos: "model",
                materiais: "material",
                puxadores: "handle",
                acessorios: "accessory",
              } as Record<string, CatalogKind>
            )[section]!
          }
        />
      )}
    </>
  );
}
function Branding() {
  const { org, role, refresh } = useDashboard();
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...org });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = role === "OWNER" || role === "ADMIN";
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form
        className={`${card} space-y-4`}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const { error } = await client()
              .from("organizations")
              .update({
                name: form.name,
                logo: form.logo || null,
                primary_color: form.primary_color,
                secondary_color: form.secondary_color,
                whatsapp: form.whatsapp,
                phone: form.phone,
                email: form.email,
                website: form.website,
                instagram: form.instagram,
              })
              .eq("id", org.id)
              .select("id")
              .single();
            if (error) throw error;
            refresh();
            void qc.invalidateQueries({ queryKey: ["tenant", org.slug] });
            setMessage("Marca salva. Seu configurador já usa esses dados.");
          } catch (err) {
            setMessage(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            ["name", "Nome da empresa"],
            ["logo", "URL do logo"],
            ["primary_color", "Cor principal"],
            ["secondary_color", "Cor secundária"],
            ["whatsapp", "WhatsApp (com DDI e DDD)"],
            ["phone", "Telefone"],
            ["email", "E-mail"],
            ["website", "Site"],
            ["instagram", "Instagram"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              disabled={!editable}
              required={key === "name"}
              className={input}
              type={
                key.includes("color")
                  ? "color"
                  : key === "email"
                    ? "email"
                    : key === "logo" || key === "website"
                      ? "url"
                      : "text"
              }
              value={form[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">
          Use uma URL HTTPS pública para o logo. Upload de arquivos poderá ser adicionado depois.
        </p>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <button disabled={busy || !editable} className="btn-primary disabled:opacity-50">
          {busy ? "Salvando…" : "Salvar marca"}
        </button>
      </form>
      <div className={`${card} self-start`}>
        <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">
          Preview do cliente
        </p>
        <div className="overflow-hidden rounded-xl border border-border">
          <header
            className="flex items-center gap-3 p-5"
            style={{ background: form.secondary_color }}
          >
            {form.logo && /^https:\/\//.test(form.logo) && (
              <img src={form.logo} className="h-10 max-w-32 object-contain" alt={form.name} />
            )}
            <strong>{form.name}</strong>
          </header>
          <div className="p-8">
            <h2 className="font-display text-3xl">Configure seu móvel.</h2>
            <p className="my-4 text-sm text-muted-foreground">
              Medidas, materiais e detalhes do seu jeito.
            </p>
            <span
              className="inline-block rounded-xl px-5 py-3 text-sm text-white"
              style={{ background: form.primary_color }}
            >
              Solicitar orçamento
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">/m/{org.slug}</p>
      </div>
    </div>
  );
}
function Integration() {
  const { org } = useDashboard();
  const [copied, setCopied] = useState("");
  const url =
    typeof window === "undefined" ? `/m/${org.slug}` : `${window.location.origin}/m/${org.slug}`;
  const button = `<a href="${url}" target="_blank" rel="noopener">Configure seu móvel em 3D</a>`;
  return (
    <div className={`${card} max-w-3xl space-y-6`}>
      <h2 className="text-xl font-semibold">Seu site, com uma nova experiência.</h2>
      <p className="text-sm text-muted-foreground">
        Adicione um link ou botão ao site da marcenaria. O cliente entra diretamente no seu
        configurador, sem criar conta.
      </p>
      {[
        ["Link público", url],
        ["Código do botão", button],
      ].map(([label, text]) => (
        <div key={label}>
          <h3 className="mb-2 text-sm font-semibold">{label}</h3>
          <pre className="overflow-x-auto rounded-xl bg-secondary p-4 text-xs whitespace-pre-wrap break-all">
            {text}
          </pre>
          <button
            className="btn-ghost mt-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text!);
                setCopied(label!);
              } catch {
                setCopied("Selecione o texto acima e copie manualmente.");
              }
            }}
          >
            {copied === label ? "Copiado" : "Copiar"}
          </button>
        </div>
      ))}
      <a className="btn-primary inline-flex" href={url} target="_blank" rel="noreferrer">
        Abrir configurador
      </a>
      <p className="text-xs text-muted-foreground">
        Domínio próprio e incorporação por iframe estão previstos para etapas futuras.
      </p>
    </div>
  );
}
function Subscription() {
  const { org } = useDashboard();
  const q = useQuery({
    queryKey: ["subscription", org.id],
    queryFn: async () => {
      const { data, error } = await client()
        .from("subscriptions")
        .select("*,subscription_plans(*)")
        .eq("organization_id", org.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className={`${card} max-w-2xl space-y-4`}>
      <h2 className="text-xl font-semibold">Plano da plataforma</h2>
      {q.error ? (
        <p role="alert">{errorMessage(q.error)}</p>
      ) : (
        <>
          <p>
            Plano: <strong>{q.data?.subscription_plans?.name ?? "Carregando…"}</strong>
          </p>
          <p>Status: {q.data?.status === "trial" ? "Em avaliação" : (q.data?.status ?? "—")}</p>
          <p>
            Próxima cobrança:{" "}
            {q.data?.next_billing_at
              ? new Date(q.data.next_billing_at).toLocaleDateString("pt-BR")
              : "Nenhuma cobrança agendada"}
          </p>
          <p className="text-sm text-muted-foreground">
            Configurador 3D, catálogo, projetos, leads e identidade visual disponíveis nesta etapa.
            Pagamentos, preços e aplicação automática dos limites serão definidos antes da ativação
            comercial.
          </p>
        </>
      )}
      <p className="border-t pt-4 text-xs text-muted-foreground">
        A assinatura do Modelador 3D é independente dos orçamentos dos móveis.
      </p>
    </div>
  );
}
function Settings() {
  const { org, role, refresh } = useDashboard();
  const [message, setMessage] = useState("");
  const editable = role === "OWNER" || role === "ADMIN";
  return (
    <div className={`${card} max-w-2xl space-y-4`}>
      <h2 className="text-xl font-semibold">Acesso ao configurador público</h2>
      <p className="text-sm">Endereço: /m/{org.slug}</p>
      <p className="text-sm">Seu papel: {role}</p>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          disabled={!editable}
          checked={org.published}
          onChange={async (e) => {
            const { error } = await client()
              .from("organizations")
              .update({ published: e.target.checked })
              .eq("id", org.id)
              .select("id")
              .single();
            if (error) setMessage(error.message);
            else {
              refresh();
              setMessage("Disponibilidade atualizada.");
            }
          }}
        />{" "}
        Configurador publicado
      </label>
      <p className="text-xs text-muted-foreground">
        Ao desativar, o endereço público fica indisponível. Os projetos permanecem no painel.
      </p>
      {message && <p role="status">{message}</p>}
      <Link className="btn-ghost inline-flex" to="/recuperar-senha">
        Redefinir minha senha
      </Link>
    </div>
  );
}
function catalogDefaults(kind: CatalogKind) {
  return kind === "model"
    ? FURNITURE_TYPES.map((d) => ({
        id: d.id,
        label: d.label,
        description: d.description ?? "",
      }))
    : kind === "material"
      ? MATERIALS.map((d) => ({
          id: d.id,
          label: d.label,
          description: d.finish ?? "",
        }))
      : kind === "handle"
        ? HANDLE_MODELS.map((d) => ({
            id: d.id,
            label: d.label,
            description: "",
          }))
        : [
            ...ACCESSORIES.map((d) => ({
              id: d.id,
              label: d.label,
              description: "Ferragem",
            })),
            ...COMPONENT_CATALOG.map((d) => ({
              id: `mod:${d.id}`,
              label: d.label,
              description: d.category,
            })),
          ];
}
function CatalogEditor({ kind }: { kind: CatalogKind }) {
  const { org, role } = useDashboard();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const editable = role === "OWNER" || role === "ADMIN";
  const q = useQuery({
    queryKey: ["catalog", org.id, kind],
    queryFn: async () => {
      const { data, error } = await client()
        .from("catalog_items")
        .select("*")
        .eq("organization_id", org.id)
        .eq("kind", kind)
        .order("name");
      if (error) throw error;
      return data as CatalogItem[];
    },
  });
  const defaults = catalogDefaults(kind);
  const list = q.data?.length
    ? q.data
    : defaults.map(
        (d) =>
          ({
            kind,
            source_id: d.id,
            name: d.label,
            description: d.description,
            active: true,
            data: {},
          }) as CatalogItem,
      );
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["catalog", org.id] });
    void qc.invalidateQueries({ queryKey: ["overview", org.id] });
  };
  const seed = async () => {
    setBusy(true);
    try {
      const { error } = await client()
        .from("catalog_items")
        .upsert(
          defaults.map((d) => ({
            organization_id: org.id,
            kind,
            source_id: d.id,
            name: d.label,
            description: d.description,
            active: true,
            data: {},
          })),
          {
            onConflict: "organization_id,kind,source_id",
            ignoreDuplicates: true,
          },
        );
      if (error) throw error;
      refresh();
      setMessage(
        "Catálogo padrão importado. Agora você pode editar e controlar a disponibilidade.",
      );
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      if (!q.data?.length) await seed();
      const { error } = await client().from("catalog_items").upsert(
        {
          organization_id: org.id,
          kind,
          source_id: selected.source_id,
          name: selected.name,
          description: selected.description,
          active: selected.active,
          data: selected.data,
        },
        { onConflict: "organization_id,kind,source_id" },
      );
      if (error) throw error;
      setSelected(null);
      refresh();
      setMessage("Item salvo. A rota pública já utiliza o catálogo atualizado.");
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {q.data?.length
            ? "Seu catálogo utiliza os modelos e materiais do configurador existente."
            : "Enquanto seu catálogo não foi cadastrado, o configurador usa as opções padrão."}{" "}
          Edite nomes, descrições e disponibilidade.
        </p>
        <button
          disabled={!editable || busy}
          className="btn-primary disabled:opacity-50"
          onClick={seed}
        >
          Importar catálogo padrão
        </button>
      </div>
      <input
        type="search"
        aria-label="Buscar no catálogo"
        className={`${input} max-w-lg`}
        placeholder="Buscar no catálogo"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {q.error && (
        <p role="alert" className="text-destructive">
          {errorMessage(q.error)}
        </p>
      )}
      {q.isPending ? (
        <p>Carregando catálogo…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list
            .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
            .map((d) => (
              <button
                disabled={!editable}
                key={d.source_id}
                onClick={() => setSelected({ ...d })}
                className={`${card} text-left hover:border-primary disabled:opacity-80`}
              >
                <span className="mb-4 inline-flex rounded-lg bg-secondary p-2">
                  <Boxes size={20} />
                </span>
                <h2 className="font-semibold">{d.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{d.description || d.source_id}</p>
                <span
                  className={`mt-4 block text-xs ${d.active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {d.active ? "Disponível" : "Oculto no configurador"}
                </span>
              </button>
            ))}
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className={`${card} w-full max-w-lg space-y-4`}>
            <h2 className="text-xl font-semibold">Editar {selected.name}</h2>
            <label className="block text-sm">
              Nome
              <input
                required
                maxLength={120}
                className={input}
                value={selected.name}
                onChange={(e) => setSelected({ ...selected, name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Descrição
              <textarea
                maxLength={1000}
                className={`${input} h-24 p-3`}
                value={selected.description}
                onChange={(e) => setSelected({ ...selected, description: e.target.value })}
              />
            </label>
            <label className="flex gap-3 text-sm">
              <input
                type="checkbox"
                checked={selected.active}
                onChange={(e) => setSelected({ ...selected, active: e.target.checked })}
              />{" "}
              Disponível para o cliente
            </label>
            <p className="text-xs text-muted-foreground">
              O item mantém a geometria ou textura original. Upload de novos modelos e texturas será
              uma etapa posterior.
            </p>
            <div className="flex gap-2">
              <button disabled={busy} className="btn-primary">
                Salvar
              </button>
              <button type="button" onClick={() => setSelected(null)} className="btn-ghost">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
interface ProjectRow {
  id: string;
  code: string;
  config: FurnitureConfig;
  price: number;
  status: string;
  customer: Record<string, string> | null;
  created_at: string;
}
interface LeadRow {
  id: string;
  project_id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  projects: ProjectRow;
}
function Records({ kind }: { kind: "projetos" | "leads" }) {
  const { org } = useDashboard();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ProjectRow | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [openingId, setOpeningId] = useState<string | null>(null);
  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [org.id, kind]);
  const openProject = async (id: string) => {
    setOpeningId(id);
    setMessage("");
    try {
      const { data, error } = await client()
        .from("projects")
        .select("*")
        .eq("organization_id", org.id)
        .eq("id", id)
        .single();
      if (error) throw error;
      setSelected(data as ProjectRow);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setOpeningId(null);
    }
  };
  const q = useQuery({
    queryKey: ["records", org.id, kind, page],
    queryFn: async () => {
      const { data, error } =
        kind === "projetos"
          ? await client()
              .from("projects")
              .select("id,code,price,customer,status,created_at", {
                count: "exact",
              })
              .eq("organization_id", org.id)
              .order("created_at", { ascending: false })
              .range(page * 25, page * 25 + 24)
          : await client()
              .from("leads")
              .select("*,projects(id,code,price,customer,status,created_at)", {
                count: "exact",
              })
              .eq("organization_id", org.id)
              .order("created_at", { ascending: false })
              .range(page * 25, page * 25 + 24);
      if (error) throw error;
      return data as unknown as (ProjectRow | LeadRow)[];
    },
  });
  const rows = q.data?.filter((row) =>
    JSON.stringify([
      "name" in row ? row.name : row.customer?.["name"],
      "code" in row ? row.code : row.projects?.code,
      row.status,
    ])
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-4">
      <input
        className={`${input} max-w-lg`}
        type="search"
        aria-label="Buscar projetos ou leads"
        placeholder="Buscar nesta página por nome, código ou status"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {q.error && <p role="alert">{errorMessage(q.error)}</p>}
      {message && <p role="status">{message}</p>}
      {q.isPending ? (
        <p>Carregando…</p>
      ) : !rows?.length ? (
        <div className={card}>
          <h2 className="font-semibold">
            Nenhum {kind === "leads" ? "lead" : "projeto"} encontrado.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Solicitações feitas em /m/{org.slug} aparecem aqui com a configuração completa do móvel.
          </p>
        </div>
      ) : (
        rows.map((row) => {
          const lead = "project_id" in row ? row : null;
          const project = lead ? lead.projects : (row as ProjectRow);
          return (
            <article
              key={row.id}
              className={`${card} flex flex-wrap items-center justify-between gap-4`}
            >
              <div>
                <h2 className="font-semibold">
                  {lead?.name || project?.customer?.["name"] || project?.code || "Projeto removido"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project?.code || "Projeto removido"} ·{" "}
                  {new Date(row.created_at).toLocaleDateString("pt-BR")}{" "}
                  {lead && `· ${lead.phone} · ${lead.email || ""}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {lead ? (
                  <select
                    aria-label={`Status de ${lead.name}`}
                    className="rounded-lg border border-border bg-background p-2 text-sm"
                    value={lead.status}
                    onChange={async (e) => {
                      const { error } = await client()
                        .from("leads")
                        .update({ status: e.target.value })
                        .eq("id", lead.id)
                        .eq("organization_id", org.id)
                        .select("id")
                        .single();
                      if (error) setMessage(error.message);
                      else
                        void qc.invalidateQueries({
                          queryKey: ["records", org.id],
                        });
                    }}
                  >
                    {["Novo", "Em contato", "Orçamento enviado", "Fechado", "Perdido"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm">{brl(project.price)}</span>
                )}
                <button
                  className="btn-ghost"
                  disabled={!project || openingId !== null}
                  onClick={() => project && void openProject(project.id)}
                >
                  {openingId === project?.id ? "Abrindo…" : "Ver projeto"}
                </button>
                {lead && (
                  <a
                    className="btn-ghost"
                    href={`https://wa.me/${[10, 11].includes(lead.phone.replace(/\D/g, "").length) ? "55" : ""}${lead.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </article>
          );
        })
      )}
      <div className="flex items-center justify-between gap-3 text-sm">
        <button
          className="btn-ghost"
          disabled={page === 0 || q.isFetching}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span>Página {page + 1} · 25 registros por página</span>
        <button
          className="btn-ghost"
          disabled={!q.data || q.data.length < 25 || q.isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${card} max-h-[90vh] w-full max-w-xl overflow-y-auto space-y-4`}>
            <h2 className="font-display text-2xl">{selected.code}</h2>
            <p className="text-sm">
              {selected.customer?.["name"]} · {selected.customer?.["phone"]}
            </p>
            <p>
              {selected.config.width} × {selected.config.height} × {selected.config.depth} cm
            </p>
            <p>
              Material: {selected.config.material} · Portas: {selected.config.doors} · Gavetas:{" "}
              {selected.config.drawers} · Prateleiras: {selected.config.shelves}
            </p>
            <strong className="block text-2xl">{brl(selected.price)}</strong>
            {selected.customer?.["notes"] && (
              <p className="text-sm">{selected.customer["notes"]}</p>
            )}
            <a
              className="btn-primary inline-flex"
              href={`/m/${org.slug}?project=${selected.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir configuração 3D
            </a>
            <button
              className="btn-ghost"
              onClick={() => {
                const blob = new Blob([JSON.stringify(selected.config, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${selected.code}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Exportar JSON
            </button>
            <button className="btn-ghost" onClick={() => setSelected(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
