import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTenant, client } from "@/lib/saas/api";
import { TenantContext } from "@/lib/saas/context";
import { ConfiguradorPage } from "@/components/configurator/ConfiguratorPage";
import { useEffect, useState } from "react";
import type { FurnitureConfig } from "@/lib/furniture/types";
export const Route = createFileRoute("/m/$tenant")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["project"] === "string" ? { project: search["project"] } : {}),
    ...(typeof search["c"] === "string" ? { c: search["c"] } : {}),
  }),
  ssr: false,
  head: () => ({ meta: [{ title: "Configure seu móvel · Modelador 3D" }] }),
  component: TenantPage,
});
function TenantPage() {
  const { tenant } = Route.useParams();
  const { project: projectId, c: sharedConfig } = Route.useSearch();
  const q = useQuery({
    queryKey: ["tenant", tenant],
    queryFn: () => getTenant(tenant),
    retry: false,
    staleTime: 0,
  });
  const [project, setProject] = useState<FurnitureConfig | null>(null);
  const [projectError, setProjectError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setProject(null);
    setProjectError("");
    setLoading(false);
    if (!q.data) return;
    let alive = true;
    const id = projectId;
    if (!id) return;
    setLoading(true);
    client()
      .from("projects")
      .select("config")
      .eq("id", id)
      .eq("organization_id", q.data.organization.id)
      .single()
      .then(
        ({ data, error }) => {
          if (!alive) return;
          if (error) setProjectError("Entre com uma conta da marcenaria para abrir este projeto.");
          else setProject(data.config as FurnitureConfig);
          setLoading(false);
        },
        () => {
          if (!alive) return;
          setProjectError("Não foi possível carregar este projeto. Tente novamente.");
          setLoading(false);
        },
      );
    return () => {
      alive = false;
    };
  }, [q.data, projectId]);
  useEffect(() => {
    if (q.data) document.title = `${q.data.organization.name} · Configure seu móvel`;
  }, [q.data]);
  if (
    q.isPending ||
    loading ||
    (typeof window !== "undefined" && projectId && !project && !projectError && !q.error)
  )
    return (
      <main className="flex min-h-screen items-center justify-center">
        Preparando seu configurador…
      </main>
    );
  if (q.error || projectError)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-3xl">Configurador indisponível</h1>
        <p>
          {projectError ||
            ("message" in q.error!
              ? String(q.error!.message)
              : "Não foi possível carregar a marcenaria.")}
        </p>
        <Link to="/" className="btn-primary">
          Voltar ao início
        </Link>
      </main>
    );
  const models = q.data?.catalog.filter((entry) => entry.kind === "model") ?? [];
  const materials = q.data?.catalog.filter((entry) => entry.kind === "material") ?? [];
  if (
    (models.length && !models.some((entry) => entry.active)) ||
    (materials.length && !materials.some((entry) => entry.active))
  )
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="font-display text-3xl">{q.data?.organization.name}</h1>
        <p>O catálogo está sendo atualizado. Volte em breve.</p>
      </main>
    );
  return (
    <TenantContext.Provider value={q.data!}>
      <ConfiguradorPage
        key={`${tenant}-${projectId ?? sharedConfig ?? "new"}-${project ? "loaded" : "draft"}`}
        {...(project ? { projectConfig: project } : {})}
      />
    </TenantContext.Provider>
  );
}
