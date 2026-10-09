import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowRight,
  Boxes,
  Ruler,
  Palette,
  ScanLine,
  FolderOpen,
  Users,
  Check,
  ExternalLink,
} from "lucide-react";
import hero from "@/assets/hero-marcenaria.jpg";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Modelador 3D · Seu catálogo em uma nova dimensão" },
      {
        name: "description",
        content:
          "Configurador 3D para marcenarias: medidas, materiais, ambientes, AR e projetos em uma experiência com sua marca.",
      },
    ],
  }),
  component: Landing,
});
function Landing() {
  return (
    <main className="bg-[#f6f4ee] text-[#26312c]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-xl font-semibold tracking-tight">
          Modelador 3D <span className="text-[#a48b6c]">/</span>
        </Link>
        <nav className="hidden gap-8 text-sm text-[#68716a] md:flex">
          <a href="#recursos">Recursos</a>
          <a href="#sua-marca">Sua marca</a>
          <a href="#integracao">Integração</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm">
            Entrar
          </Link>
          <Link to="/cadastro" className="rounded-full bg-[#26312c] px-5 py-2.5 text-sm text-white">
            Começar agora
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 lg:grid-cols-[.95fr_1.05fr] lg:pb-28 lg:pt-20">
        <div>
          <span className="inline-flex rounded-full border border-[#d5d8cc] px-4 py-2 text-[11px] uppercase tracking-[.18em]">
            Tecnologia para marcenarias
          </span>
          <h1 className="mt-7 font-display text-5xl leading-[1.07] tracking-tight sm:text-6xl xl:text-7xl">
            Seu cliente imagina.
            <br />
            <span className="text-[#9a8060]">Você transforma.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-[#68716a]">
            Deixe seu cliente projetar o móvel antes da primeira conversa. Um configurador 3D com
            suas medidas, seu catálogo e a identidade da sua marcenaria.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-6 rounded-full bg-[#26312c] px-6 py-4 text-sm text-white"
            >
              Criar minha conta <ArrowUpRight size={18} />
            </Link>
            <Link
              to="/configurador"
              className="inline-flex items-center gap-3 rounded-full border border-[#c9cdc2] px-6 py-4 text-sm"
            >
              Ver demonstração <ArrowRight size={17} />
            </Link>
          </div>
          <p className="mt-5 text-xs text-[#7f877e]">Seu configurador. Seu site. Sua marca.</p>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-[24px] border border-[#dcded3] bg-white shadow-[0_25px_80px_-30px_#26312c55]">
            <div className="flex items-center justify-between border-b border-[#e8e9e0] px-5 py-4 text-xs">
              <span className="font-semibold">Seu showroom digital</span>
              <span className="rounded-full bg-[#eaf0e7] px-3 py-1 text-[#4c6550]">
                Configurador 3D
              </span>
            </div>
            <img
              src={hero}
              alt="Ambiente com móveis planejados em madeira, referência de aplicação do configurador"
              className="aspect-[5/4] w-full object-cover"
              fetchPriority="high"
            />
            <div className="grid grid-cols-3 gap-3 p-4 text-xs">
              <span className="rounded-xl bg-[#f5f4ef] p-3">
                Medidas
                <br />
                <strong className="mt-1 block">Do seu jeito</strong>
              </span>
              <span className="rounded-xl bg-[#f5f4ef] p-3">
                Materiais
                <br />
                <strong className="mt-1 block">Seu catálogo</strong>
              </span>
              <Link
                to="/configurador"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#26312c] p-3 text-white"
              >
                Testar em 3D <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="absolute -bottom-7 right-4 flex items-center gap-3 rounded-2xl border border-[#dcded3] bg-[#faf9f5] px-5 py-4 shadow-lg">
            <span className="rounded-full bg-[#e6eee2] p-2">
              <Check size={18} />
            </span>
            <div className="text-xs">
              <strong className="block">Da configuração ao orçamento</strong>
              <span className="text-[#7f877e]">O projeto chega completo para você.</span>
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-[#dedfd6] bg-[#efefe7] px-6 py-9">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-5 text-sm text-[#68716a]">
          <span>3D em tempo real</span>
          <span>Projetos personalizados</span>
          <span>Marca própria</span>
          <span>Cliente sem barreira de login</span>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-24">
        <p className="text-xs uppercase tracking-[.22em] text-[#9a8060]">Como funciona</p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">
          Uma jornada mais clara.
          <br />
          Para você e seu cliente.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-5">
          {[
            ["Seu catálogo", "Escolha os modelos, materiais, puxadores e acessórios disponíveis."],
            ["Seu cliente entra", "Compartilhe o endereço do configurador no seu site."],
            ["Personaliza em 3D", "Medidas, portas, gavetas e detalhes em tempo real."],
            ["Visualiza o projeto", "Explore ambientes e AR em aparelhos compatíveis."],
            ["Envia para você", "Receba o projeto e o contato no painel da marcenaria."],
          ].map(([title, text], i) => (
            <article key={title} className="border-t border-[#cdd2c6] pt-5">
              <span className="text-xs text-[#9a8060]">0{i + 1}</span>
              <h3 className="mt-5 text-base font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#68716a]">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="recursos" className="bg-[#26312c] px-6 py-24 text-[#f6f4ee]">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[.22em] text-[#bfa888]">
            Projetar. Apresentar. Vender.
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">
            O móvel é personalizado.
            <br />A experiência também.
          </h2>
          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {[
              [
                Boxes,
                "Modelagem 3D",
                "Portas, gavetas, prateleiras e acessórios com interação direta na cena.",
              ],
              [
                Ruler,
                "Medidas precisas",
                "Seu cliente ajusta as dimensões e acompanha a estimativa do projeto.",
              ],
              [
                Palette,
                "Materiais e detalhes",
                "Acabamentos, puxadores e componentes do seu catálogo.",
              ],
              [
                ScanLine,
                "Ambientes e AR",
                "Visualização em cenários e realidade aumentada em dispositivos compatíveis.",
              ],
              [
                FolderOpen,
                "Projetos completos",
                "A configuração acompanha o orçamento, com exportação e proposta PDF.",
              ],
              [
                Users,
                "Leads no seu painel",
                "Contato, projeto e status de atendimento reunidos no seu espaço.",
              ],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Boxes;
              return (
                <article key={String(title)} className="border-t border-white/15 pt-6">
                  <I size={24} className="text-[#bfa888]" />
                  <h3 className="mt-5 text-lg font-semibold">{String(title)}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{String(text)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section id="sua-marca" className="mx-auto grid max-w-7xl gap-14 px-6 py-24 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[.22em] text-[#9a8060]">
            Sua marca em cada detalhe
          </p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">
            O cliente entra
            <br />
            na sua marcenaria.
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-[#68716a]">
            Nome, logo, cores e catálogo próprios. Uma única plataforma atende diferentes
            marcenarias, com espaços administrativos e dados separados.
          </p>
          <Link
            to="/cadastro"
            className="mt-7 inline-flex items-center gap-4 text-sm font-semibold"
          >
            Criar meu espaço <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="rounded-3xl border border-[#d5d8cc] bg-white p-8">
          <div className="flex items-center gap-3 border-b border-[#e6e7dd] pb-6">
            <span className="flex size-12 items-center justify-center rounded-xl bg-[#ab9475] text-xl text-white">
              M
            </span>
            <div>
              <strong>Sua Marcenaria</strong>
              <p className="text-xs text-[#68716a]">Um endereço com sua identidade</p>
            </div>
          </div>
          <h3 className="mt-8 font-display text-3xl">Configure seu próximo móvel.</h3>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            {[
              "Logo e cores",
              "Catálogo próprio",
              "Materiais e puxadores",
              "WhatsApp da empresa",
            ].map((t) => (
              <span key={t} className="flex gap-2">
                <Check size={16} className="text-[#9a8060]" />
                {t}
              </span>
            ))}
          </div>
          <p className="mt-8 rounded-xl bg-[#f4f3ee] p-4 text-xs text-[#68716a]">
            seu-site.com → /m/sua-marcenaria
          </p>
        </div>
      </section>
      <section id="integracao" className="bg-[#eaece2] px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[.22em] text-[#9a8060]">Integração simples</p>
            <h2 className="mt-4 font-display text-4xl">
              Seu site continua.
              <br />A experiência evolui.
            </h2>
            <p className="mt-5 max-w-md text-[#68716a]">
              Adicione um botão “Configurar móvel em 3D” e direcione seus clientes ao configurador
              da sua marcenaria.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <div className="rounded-2xl border border-[#d2d7c7] bg-[#f8f8f3] p-5">
              <span className="text-xs text-[#68716a]">SITE DA SUA MARCENARIA</span>
              <p className="mt-3 flex items-center justify-between text-lg font-semibold">
                Configurar móvel em 3D <ExternalLink size={20} />
              </p>
            </div>
            <p className="text-center text-xs text-[#68716a]">
              Configurador personalizado → Projeto salvo → Lead no painel
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[.22em] text-[#9a8060]">Sua próxima dimensão</p>
        <h2 className="mt-5 font-display text-4xl sm:text-5xl">
          Dê forma ao próximo
          <br />
          projeto da sua marcenaria.
        </h2>
        <Link
          to="/cadastro"
          className="mt-8 inline-flex items-center gap-8 rounded-full bg-[#26312c] px-7 py-4 text-sm text-white"
        >
          Criar minha conta <ArrowUpRight size={18} />
        </Link>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 border-t border-[#d5d8cc] px-6 py-8 text-xs text-[#68716a]">
        <strong>Modelador 3D</strong>
        <span>Configuradores para marcenarias.</span>
        <div className="flex gap-5">
          <Link to="/configurador">Demonstração</Link>
          <Link to="/login">Entrar</Link>
        </div>
      </footer>
    </main>
  );
}
