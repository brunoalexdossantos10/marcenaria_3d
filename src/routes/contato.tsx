import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Mail, MapPin, Phone } from "lucide-react";
import SiteLayout, { PageHero } from "@/components/site/SiteLayout";
import Reveal from "@/components/site/Reveal";
import { FURNITURE_TYPES } from "@/lib/furniture/types";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato e orçamento | Ateliê Nogal Marcenaria" },
      {
        name: "description",
        content:
          "Fale com o Ateliê Nogal: agende visita técnica, tire dúvidas sobre acabamentos ou envie seu projeto do configurador 3D.",
      },
      {
        property: "og:title",
        content: "Contato e orçamento | Ateliê Nogal Marcenaria",
      },
      {
        property: "og:description",
        content: "Atendimento de segunda a sábado em São Paulo. Resposta em até 1 dia útil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const [sent, setSent] = useState(false);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contato"
        title="Vamos conversar sobre o seu ambiente"
        description="Responda em um minuto e nossa equipe retorna com a próxima etapa: visita técnica ou refinamento do projeto 3D."
      />

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.2fr_0.8fr]">
        <Reveal>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Nome</span>
                <input required className="field" placeholder="Seu nome completo" />
              </label>
              <label className="block">
                <span className="field-label">WhatsApp</span>
                <input required className="field" placeholder="(11) 90000-0000" />
              </label>
              <label className="block">
                <span className="field-label">E-mail</span>
                <input required type="email" className="field" placeholder="voce@email.com" />
              </label>
              <label className="block">
                <span className="field-label">Cidade</span>
                <input className="field" placeholder="São Paulo" />
              </label>
            </div>
            <label className="block">
              <span className="field-label">Tipo de móvel</span>
              <select className="field">
                {FURNITURE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
                <option value="outro">Outro / mais de um ambiente</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Conte sobre o projeto</span>
              <textarea
                rows={4}
                className="field resize-none"
                placeholder="Medidas aproximadas, prazo desejado, referências..."
              />
            </label>

            <button type="submit" className="btn-primary w-full">
              {sent ? "Recebido!" : "Enviar mensagem"}
            </button>

            <div
              className={`overflow-hidden transition-all duration-500 ${sent ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}
            >
              <p className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                <Check className="size-4 text-primary" /> Obrigado! Retornamos em até 1 dia útil.
              </p>
            </div>
          </form>
        </Reveal>

        <Reveal delay={120}>
          <div className="space-y-4">
            {[
              { icon: Phone, t: "Telefone e WhatsApp", d: "(11) 4002-8922" },
              { icon: Mail, t: "E-mail", d: "projetos@atelienogal.com.br" },
              {
                icon: MapPin,
                t: "Ateliê e showroom",
                d: "Rua das Marcenarias, 180 — Vila Leopoldina, São Paulo/SP",
              },
            ].map((c) => (
              <article key={c.t} className="card-lift rounded-2xl border border-border bg-card p-6">
                <c.icon className="size-5 text-primary" />
                <h2 className="mt-3 text-lg">{c.t}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
              </article>
            ))}
            <article className="rounded-2xl border border-border bg-secondary/50 p-6">
              <h2 className="text-lg">Horários</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Segunda a sexta, 8h às 18h · Sábado, 9h às 13h
              </p>
            </article>
          </div>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
