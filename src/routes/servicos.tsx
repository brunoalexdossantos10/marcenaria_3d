import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import SiteLayout, { PageHero } from "@/components/site/SiteLayout";
import Reveal from "@/components/site/Reveal";
import { FURNITURE_TYPES } from "@/lib/furniture/types";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços de marcenaria sob medida | Ateliê Nogal" },
      {
        name: "description",
        content:
          "Guarda-roupas, cozinhas, estantes, racks, home office e banheiros sob medida: projeto 3D, produção CNC e montagem própria.",
      },
      {
        property: "og:title",
        content: "Serviços de marcenaria sob medida | Ateliê Nogal",
      },
      {
        property: "og:description",
        content: "Do projeto executivo à montagem, com configurador 3D e estimativa na hora.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicosPage,
});

const DETAILS: Record<string, string> = {
  "guarda-roupa": "Cabideiros, gaveteiros internos, portas de correr e espelho embutido.",
  cozinha: "Torre quente, gaveteiros com amortecedor e aéreos com iluminação de LED.",
  estante: "Nichos passantes, prateleiras reforçadas e vãos para TV ou livros.",
  rack: "Painel ripado, passagem de cabos e gavetas com corrediça telescópica.",
  "home-office": "Bancada contínua, suporte de CPU e organização de cabos.",
  banheiro: "MDF resistente à umidade, cuba embutida e espelheira com nichos.",
};

function ServicosPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Serviços"
        title="Cada ambiente com o seu projeto executivo"
        description="Trabalhamos com seis famílias de móveis, todas parametrizadas no configurador 3D — com limites de medida reais de produção."
      />

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FURNITURE_TYPES.map((t, i) => (
            <Reveal key={t.id} delay={i * 80}>
              <article className="card-lift flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                <h2 className="text-xl">{t.label}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{DETAILS[t.id]}</p>
                <dl className="mt-5 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>Largura</dt>
                    <dd className="tabular-nums">
                      {t.limits.width[0]}–{t.limits.width[1]} cm
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Altura</dt>
                    <dd className="tabular-nums">
                      {t.limits.height[0]}–{t.limits.height[1]} cm
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Profundidade</dt>
                    <dd className="tabular-nums">
                      {t.limits.depth[0]}–{t.limits.depth[1]} cm
                    </dd>
                  </div>
                </dl>
                <Link
                  to="/configurador"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary"
                >
                  Configurar {t.label.toLowerCase()} <ArrowRight className="size-4" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div className="mt-14 grid gap-4 md:grid-cols-4">
            {[
              ["Visita técnica", "Conferimos prumo, esquadro, tomadas e pontos hidráulicos."],
              ["Projeto executivo", "Plano de corte, ferragens e detalhamento assinado."],
              ["Produção", "Corte CNC, fitagem de borda e usinagem no ateliê."],
              ["Montagem", "Equipe própria, limpeza final e ajuste de portas."],
            ].map(([t, d]) => (
              <article key={t} className="rounded-2xl border border-border bg-secondary/40 p-6">
                <h3 className="text-lg">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
