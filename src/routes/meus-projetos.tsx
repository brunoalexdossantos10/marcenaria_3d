import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileDown, Trash2 } from "lucide-react";
import SiteLayout, { PageHero } from "@/components/site/SiteLayout";
import Reveal from "@/components/site/Reveal";
import { fetchProjects, deleteProject, type SavedProject } from "@/lib/furniture/store";
import { ProjectAccount } from "@/components/site/ProjectAccount";
import { typeDef } from "@/lib/furniture/types";
import { material } from "@/lib/furniture/materials";
import { brl } from "@/lib/furniture/pricing";

export const Route = createFileRoute("/meus-projetos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meus projetos salvos | Ateliê Nogal" },
      {
        name: "description",
        content:
          "Retome os móveis que você configurou no Ateliê Nogal: medidas, acabamento, peças e estimativa de investimento salvos neste dispositivo.",
      },
      { property: "og:title", content: "Meus projetos salvos | Ateliê Nogal" },
      {
        property: "og:description",
        content: "Seus móveis configurados em 3D, prontos para retomar ou enviar para orçamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeusProjetosPage,
});

function MeusProjetosPage() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    fetchProjects()
      .then(setProjects)
      .catch((reason) => setError(reason.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((current) => current.filter((p) => p.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir.");
    }
  };

  const download = (p: SavedProject) => {
    const blob = new Blob([JSON.stringify(p, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.code.replace(/\W+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Meus projetos"
        title="Seus móveis configurados"
        description="Entre por e-mail para guardar novos projetos na sua conta. Projetos anteriores deste navegador continuam disponíveis."
      />

      <section className="mx-auto max-w-6xl px-5 py-16">
        <ProjectAccount onChange={refresh} />
        {error && (
          <p role="alert" className="mb-5 text-sm text-destructive">
            {error}
          </p>
        )}
        {projects.length === 0 ? (
          <Reveal>
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
              <h2 className="text-2xl">Nenhum projeto salvo ainda</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Abra o configurador, ajuste as medidas do seu ambiente e clique em “Salvar projeto”.
              </p>
              <Link to="/configurador" className="btn-primary mt-7">
                Criar meu primeiro projeto <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
                <article className="card-lift flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg">{p.code}</h2>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("pt-BR")} · {p.status}
                      </p>
                    </div>
                    <span
                      className="size-8 shrink-0 rounded-lg border border-black/10"
                      style={{ background: material(p.config.material).color }}
                    />
                  </div>

                  <p className="mt-4 text-sm">{typeDef(p.config.type).label}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.config.width} × {p.config.height} × {p.config.depth} cm ·{" "}
                    {material(p.config.material).label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.config.doors} portas · {p.config.drawers} gavetas · {p.config.shelves}{" "}
                    prateleiras
                  </p>

                  <p className="mt-5 font-display text-2xl tabular-nums">{brl(p.price)}</p>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Link to="/configurador" className="chip">
                      Retomar
                    </Link>
                    <button type="button" onClick={() => download(p)} className="chip">
                      <FileDown className="mr-1.5 size-3.5" /> JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="chip text-destructive"
                    >
                      <Trash2 className="mr-1.5 size-3.5" /> Excluir
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
