import { createFileRoute, Link } from "@tanstack/react-router";
import SiteLayout, { PageHero } from "@/components/site/SiteLayout";
import Reveal, { CountUp } from "@/components/site/Reveal";
import oficinaImg from "@/assets/oficina.jpg";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre o ateliê | Ateliê Nogal Marcenaria" },
      {
        name: "description",
        content:
          "Conheça o Ateliê Nogal: 18 anos de marcenaria sob medida em São Paulo, produção própria com corte CNC e montagem por equipe interna.",
      },
      {
        property: "og:title",
        content: "Sobre o ateliê | Ateliê Nogal Marcenaria",
      },
      {
        property: "og:description",
        content: "Marcenaria com produção própria, projeto executivo e garantia de 5 anos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Sobre"
        title="Marcenaria de bairro, precisão de indústria"
        description="Começamos em 2008 numa oficina de 60 m². Hoje unimos corte CNC, projeto paramétrico e acabamento feito à mão."
      />

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-border shadow-soft">
            <img
              src={oficinaImg}
              alt="Marceneiro lixando painel de MDF nogueira no ateliê"
              loading="lazy"
              width={1200}
              height={900}
              className="w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
          </div>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="text-3xl md:text-4xl">O que nos diferencia</h2>
          <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Transparência de preço.</strong> A estimativa do
              configurador usa os mesmos valores de MDF, ferragens e mão de obra do nosso orçamento.
            </li>
            <li>
              <strong className="text-foreground">Projeto antes da venda.</strong> Você visualiza o
              móvel em 3D e ajusta o que quiser sem pressão comercial.
            </li>
            <li>
              <strong className="text-foreground">Equipe própria.</strong> Quem desenha, produz e
              monta trabalha no mesmo ateliê.
            </li>
            <li>
              <strong className="text-foreground">Materiais rastreáveis.</strong> MDF de
              fornecedores certificados e ferragens com garantia do fabricante.
            </li>
          </ul>
          <dl className="mt-8 grid grid-cols-3 gap-4">
            {[
              { n: 18, s: "", l: "anos de casa" },
              { n: 26, s: "", l: "profissionais" },
              { n: 97, s: "%", l: "clientes indicam" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border bg-card p-4">
                <dd className="font-display text-2xl">
                  <CountUp to={s.n} suffix={s.s} />
                </dd>
                <dt className="text-xs text-muted-foreground">{s.l}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <Reveal>
          <div className="rounded-3xl border border-border bg-secondary/50 p-10 text-center">
            <h2 className="text-2xl md:text-3xl">Visite nosso showroom</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Traga suas medidas e conheça as amostras de MDF ao vivo. Agendamos de segunda a
              sábado.
            </p>
            <Link to="/contato" className="btn-primary mt-7">
              Agendar visita
            </Link>
          </div>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
