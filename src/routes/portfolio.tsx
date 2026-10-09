import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import SiteLayout, { PageHero } from "@/components/site/SiteLayout";
import Reveal from "@/components/site/Reveal";
import heroImg from "@/assets/hero-marcenaria.jpg";
import cozinhaImg from "@/assets/cozinha.jpg";
import officeImg from "@/assets/home-office.jpg";
import oficinaImg from "@/assets/oficina.jpg";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfólio de móveis planejados | Ateliê Nogal" },
      {
        name: "description",
        content:
          "Projetos executados pelo Ateliê Nogal: guarda-roupas, cozinhas, home office e estantes sob medida em MDF e madeira nobre.",
      },
      {
        property: "og:title",
        content: "Portfólio de móveis planejados | Ateliê Nogal",
      },
      {
        property: "og:description",
        content: "Veja ambientes entregues e inspire-se para o seu projeto sob medida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

const WORKS = [
  {
    img: heroImg,
    title: "Guarda-roupa Nogueira",
    cat: "Dormitório",
    meta: "220 × 250 × 60 cm · 5 portas",
  },
  {
    img: cozinhaImg,
    title: "Cozinha Carvalho Claro",
    cat: "Cozinha",
    meta: "3,4 m lineares · torre quente",
  },
  {
    img: officeImg,
    title: "Home office Freijó",
    cat: "Escritório",
    meta: "180 × 210 × 50 cm · 8 nichos",
  },
  {
    img: oficinaImg,
    title: "Detalhe de acabamento",
    cat: "Ateliê",
    meta: "Fitagem e lixamento manual",
  },
];

const CATS = ["Todos", "Dormitório", "Cozinha", "Escritório", "Ateliê"] as const;

function PortfolioPage() {
  const [cat, setCat] = useState<string>("Todos");
  const list = cat === "Todos" ? WORKS : WORKS.filter((w) => w.cat === cat);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Portfólio"
        title="Projetos que saíram do 3D e viraram móvel"
        description="Uma seleção de ambientes entregues em São Paulo, com as mesmas peças e acabamentos disponíveis no configurador."
      />

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`chip ${cat === c ? "chip-active" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {list.map((w, i) => (
            <Reveal key={w.title} delay={i * 90}>
              <article className="group overflow-hidden rounded-3xl border border-border bg-card">
                <img
                  src={w.img}
                  alt={w.title}
                  loading="lazy"
                  width={1200}
                  height={900}
                  className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="p-6">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {w.cat}
                  </p>
                  <h2 className="mt-2 text-xl">{w.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{w.meta}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={80}>
          <div className="mt-14 rounded-3xl border border-border bg-secondary/50 p-10 text-center">
            <h2 className="text-2xl md:text-3xl">Quer algo parecido no seu espaço?</h2>
            <Link to="/configurador" className="btn-primary mt-6">
              Montar meu móvel <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
