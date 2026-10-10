import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Layers3,
  Menu,
  MoveUpRight,
  Palette,
  Ruler,
  ScanLine,
  X,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import heroImage from "@/assets/hero-marcenaria.jpg";
import kitchenImage from "@/assets/cozinha.jpg";
import officeImage from "@/assets/home-office.jpg";
import workshopImage from "@/assets/oficina.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOVA — O design do seu próximo móvel começa aqui" },
      {
        name: "description",
        content:
          "MOVA transforma ideias em móveis planejados com uma experiência de personalização 3D criada para aproximar o projeto da realidade.",
      },
      { property: "og:title", content: "MOVA — Móveis que começam como ideia" },
      {
        property: "og:description",
        content: "Uma experiência de projeto 3D para marcenarias e seus clientes.",
      },
    ],
  }),
  component: Landing,
});

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = document.querySelector(`[data-reveal-id="${delay}-${className.slice(0, 12)}"]`);
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [className, delay]);
  return (
    <div
      data-reveal-id={`${delay}-${className.slice(0, 12)}`}
      className={`mova-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

const environments = [
  {
    title: "Cozinha",
    caption: "Fluxo, matéria e precisão.",
    image: kitchenImage,
    className: "md:col-span-7 md:row-span-2",
  },
  {
    title: "Home office",
    caption: "Trabalho com espaço para pensar.",
    image: officeImage,
    className: "md:col-span-5",
  },
  {
    title: "Oficina",
    caption: "Onde a ideia encontra a mão.",
    image: workshopImage,
    className: "md:col-span-5",
  },
];

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <main className="mova-landing overflow-hidden bg-[#f2efe8] text-[#26231f]">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/20 text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 lg:px-10">
          <Link to="/" className="group flex items-center gap-3" aria-label="MOVA início">
            <span className="flex size-9 items-center justify-center border border-white/60 text-sm font-semibold tracking-[-0.08em] transition group-hover:bg-white group-hover:text-[#26231f]">
              M/
            </span>
            <span className="text-[15px] font-semibold tracking-[0.22em]">MOVA</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.2em] text-white/75 lg:flex">
            <a className="mova-nav-link" href="#manifesto">
              Manifesto
            </a>
            <a className="mova-nav-link" href="#processo">
              Processo
            </a>
            <a className="mova-nav-link" href="#ambientes">
              Ambientes
            </a>
            <a className="mova-nav-link" href="#modelador">
              Modelador 3D
            </a>
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            <Link
              to="/login"
              className="text-xs uppercase tracking-[0.16em] text-white/75 transition hover:text-white"
            >
              Entrar
            </Link>
            <Link to="/configurador" className="mova-header-cta">
              Explorar o modelador <ArrowUpRight size={15} />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="lg:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/15 bg-[#26231f]/95 px-6 py-6 backdrop-blur lg:hidden">
            <nav className="flex flex-col gap-5 text-xs uppercase tracking-[0.2em]">
              <a href="#manifesto" onClick={() => setMenuOpen(false)}>
                Manifesto
              </a>
              <a href="#processo" onClick={() => setMenuOpen(false)}>
                Processo
              </a>
              <a href="#ambientes" onClick={() => setMenuOpen(false)}>
                Ambientes
              </a>
              <Link to="/configurador" onClick={() => setMenuOpen(false)}>
                Modelador 3D
              </Link>
            </nav>
          </div>
        )}
      </header>

      <section className="mova-hero relative flex min-h-[760px] items-end overflow-hidden text-white lg:min-h-[92vh]">
        <img
          src={heroImage}
          alt="Ambiente contemporâneo com marcenaria em madeira natural"
          className="absolute inset-0 size-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,20,17,.76),rgba(21,20,17,.22)_62%,rgba(21,20,17,.15))]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#1d1b18]/55 to-transparent" />
        <div className="relative z-10 mx-auto grid w-full max-w-[1440px] gap-16 px-6 pb-14 pt-44 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-10 lg:pb-20">
          <Reveal className="max-w-4xl" delay={80}>
            <p className="mova-kicker text-white/65">Design, matéria, possibilidade</p>
            <h1 className="mt-6 max-w-4xl font-display text-[clamp(3.6rem,8vw,8.6rem)] leading-[.88] tracking-[-.065em]">
              O design do seu próximo móvel começa aqui.
            </h1>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/configurador" className="mova-button-light">
                Explorar o modelador <ArrowUpRight size={17} />
              </Link>
              <a href="#manifesto" className="mova-button-line">
                Conhecer o MOVA <ArrowDownRight size={16} />
              </a>
            </div>
          </Reveal>
          <Reveal className="flex items-end lg:pb-2" delay={240}>
            <p className="max-w-[270px] text-sm leading-7 text-white/72">
              Transforme ideias em móveis planejados com uma experiência de personalização 3D criada
              para aproximar o projeto da realidade.
            </p>
          </Reveal>
        </div>
        <div className="absolute bottom-7 right-6 z-10 hidden items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/60 md:flex lg:right-10">
          <span className="h-px w-12 bg-white/45" /> role seu olhar
        </div>
      </section>

      <section
        id="manifesto"
        className="mova-section mx-auto grid max-w-[1440px] gap-12 px-6 py-24 lg:grid-cols-[.7fr_1.3fr] lg:px-10 lg:py-36"
      >
        <Reveal>
          <p className="mova-kicker">01 — Manifesto</p>
          <p className="mt-8 max-w-[210px] text-sm leading-6 text-[#766f65]">
            Para quem entende que um móvel não ocupa apenas um espaço. Ele define como a vida
            acontece dentro dele.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="max-w-5xl font-display text-[clamp(2.8rem,6.5vw,7.4rem)] leading-[.92] tracking-[-.055em]">
            Antes de ser matéria,
            <br />
            <em className="text-[#9b7958]">é uma ideia.</em>
          </h2>
          <div className="mt-10 grid gap-8 border-t border-[#cfc7ba] pt-7 text-sm leading-7 text-[#766f65] md:grid-cols-2">
            <p>
              O MOVA aproxima o imaginado do possível. Um espaço onde medidas, acabamentos e
              escolhas ganham forma antes mesmo de chegarem à oficina.
            </p>
            <p>
              Uma ferramenta para clientes que querem participar do processo — e para marcenarias
              que sabem que apresentar bem também é parte do projeto.
            </p>
          </div>
        </Reveal>
      </section>

      <section
        id="processo"
        className="mova-process-section bg-[#d9d0c2] px-6 py-24 lg:px-10 lg:py-36"
      >
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="mova-kicker">02 — O móvel ganha forma</p>
                <h2 className="mt-5 max-w-2xl font-display text-[clamp(2.8rem,5.8vw,6.5rem)] leading-[.92] tracking-[-.055em]">
                  Do traço à presença.
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-[#6f655a]">
                Uma única ideia. Centenas de possibilidades. Acompanhe a construção de uma
                composição antes de abrir o modelador.
              </p>
            </div>
          </Reveal>
          <div className="mt-16 grid items-center gap-12 lg:grid-cols-[.75fr_1.25fr]">
            <Reveal className="relative z-10" delay={140}>
              <div className="mova-specimen-note">
                <span className="mova-kicker">Composição 01</span>
                <h3 className="mt-4 font-display text-4xl leading-none">
                  Gabinete
                  <br />
                  contemporâneo
                </h3>
                <p className="mt-5 text-sm leading-6 text-[#6f655a]">
                  Estrutura em nogueira, frentes precisas e espaço desenhado para o seu cotidiano.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#b9ad9d] pt-5 text-[11px] uppercase tracking-[0.14em] text-[#806c56]">
                  <span>
                    <strong className="block text-lg font-normal text-[#26231f]">180</strong>{" "}
                    largura cm
                  </span>
                  <span>
                    <strong className="block text-lg font-normal text-[#26231f]">04</strong> frentes
                  </span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={260}>
              <div
                className="mova-cabinet-stage"
                aria-label="Demonstração visual da construção de um móvel"
              >
                <div className="mova-stage-grid" />
                <div className="mova-cabinet-shadow" />
                <div className="mova-cabinet">
                  <div className="mova-cabinet-top" />
                  <div className="mova-cabinet-side left" />
                  <div className="mova-cabinet-side right" />
                  <div className="mova-cabinet-interior">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="mova-cabinet-door door-one">
                    <i />
                  </div>
                  <div className="mova-cabinet-door door-two">
                    <i />
                  </div>
                  <div className="mova-cabinet-drawer drawer-one" />
                  <div className="mova-cabinet-drawer drawer-two" />
                </div>
                <div className="mova-stage-label label-top">estrutura</div>
                <div className="mova-stage-label label-side">acabamento</div>
                <div className="mova-stage-label label-bottom">detalhe · nogueira</div>
              </div>
            </Reveal>
          </div>
          <div className="mt-16 grid gap-6 border-t border-[#b9ad9d] pt-6 text-sm text-[#6f655a] md:grid-cols-4">
            {["Estrutura", "Portas e gavetas", "Acabamentos", "Ambiente final"].map(
              (item, index) => (
                <div key={item} className="flex items-center gap-4">
                  <span className="font-display text-2xl text-[#9b7958]">0{index + 1}</span>
                  <span>{item}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section
        id="ambientes"
        className="mova-section mx-auto max-w-[1440px] px-6 py-24 lg:px-10 lg:py-36"
      >
        <Reveal>
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="mova-kicker">03 — Ambientes</p>
              <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.8rem,6vw,7rem)] leading-[.9] tracking-[-.055em]">
                Cada espaço,
                <br />
                <em className="text-[#9b7958]">uma linguagem.</em>
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-[#766f65]">
              A marcenaria sob medida não começa na peça. Começa na forma como ela pertence ao
              ambiente.
            </p>
          </div>
        </Reveal>
        <div className="mt-16 grid auto-rows-[230px] gap-4 md:grid-cols-12 md:auto-rows-[270px]">
          {environments.map((item, index) => (
            <Reveal
              key={item.title}
              className={`${item.className} group relative overflow-hidden`}
              delay={index * 90}
            >
              <img
                src={item.image}
                alt={`${item.title}: ${item.caption}`}
                className="size-full object-cover transition duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1d1b18]/70 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white md:p-7">
                <div>
                  <p className="mova-kicker text-white/60">0{index + 1}</p>
                  <h3 className="mt-2 font-display text-3xl">{item.title}</h3>
                  <p className="mt-1 text-xs text-white/70">{item.caption}</p>
                </div>
                <ArrowUpRight className="opacity-70 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </Reveal>
          ))}
          <Reveal
            className="relative flex items-center justify-center bg-[#27231f] p-8 text-center text-[#f2efe8] md:col-span-5"
            delay={260}
          >
            <div>
              <p className="mova-kicker text-[#c6a47e]">A matéria como ponto de partida</p>
              <p className="mt-5 font-display text-3xl leading-none">
                Madeira, luz,
                <br />
                <em>tempo.</em>
              </p>
              <Link
                to="/portfolio"
                className="mt-7 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#c6a47e]"
              >
                Ver projetos <ArrowRight size={14} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        id="modelador"
        className="mova-demo-section bg-[#26231f] px-6 py-24 text-[#f2efe8] lg:px-10 lg:py-36"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <Reveal>
              <p className="mova-kicker text-[#c6a47e]">04 — Modelador 3D</p>
              <h2 className="mt-5 max-w-xl font-display text-[clamp(2.8rem,5vw,6rem)] leading-[.92] tracking-[-.055em]">
                Projeto que você consegue <em className="text-[#c6a47e]">ver.</em>
              </h2>
              <p className="mt-7 max-w-md text-sm leading-7 text-white/55">
                Escolha dimensões, materiais, portas, gavetas, puxadores e acessórios. Gire,
                aproxime e experimente — antes de decidir.
              </p>
              <Link to="/configurador" className="mova-button-light mt-9">
                Criar seu primeiro projeto <MoveUpRight size={17} />
              </Link>
              <div className="mt-12 grid max-w-md grid-cols-2 gap-5 border-t border-white/15 pt-6 text-xs text-white/60">
                <span className="flex gap-2">
                  <Ruler size={15} className="text-[#c6a47e]" /> dimensões reais
                </span>
                <span className="flex gap-2">
                  <Palette size={15} className="text-[#c6a47e]" /> materiais
                </span>
                <span className="flex gap-2">
                  <Layers3 size={15} className="text-[#c6a47e]" /> componentes
                </span>
                <span className="flex gap-2">
                  <ScanLine size={15} className="text-[#c6a47e]" /> visualização AR
                </span>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="mova-product-window overflow-hidden border border-white/15 bg-[#e9e3d8] text-[#26231f] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#d3c9bb] bg-[#f5f1e9] px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-[#81776a]">
                  <span className="flex items-center gap-2">
                    <i className="size-2 rounded-full bg-[#a87c5a]" /> projeto sem título
                  </span>
                  <span>mova / configurador</span>
                </div>
                <div className="grid md:grid-cols-[1fr_190px]">
                  <div className="relative min-h-[330px] overflow-hidden bg-[#c8bbaa]">
                    <img
                      src={officeImage}
                      alt="Prévia de ambiente do modelador MOVA"
                      className="absolute inset-0 size-full object-cover mix-blend-multiply opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#775d48]/50 to-transparent" />
                    <div className="absolute left-[19%] top-[28%] h-[45%] w-[57%] border border-white/70 bg-[#9b7759]/45 shadow-xl">
                      <div className="absolute inset-x-0 top-1/2 border-t border-white/60" />
                      <div className="absolute inset-y-0 left-1/2 border-l border-white/60" />
                      <span className="absolute -left-2 -top-7 text-[9px] uppercase tracking-[0.12em] text-white">
                        180 cm
                      </span>
                      <span className="absolute -bottom-6 right-0 text-[9px] uppercase tracking-[0.12em] text-white">
                        60 cm
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 rounded-full border border-white/40 bg-[#26231f]/40 px-3 py-1 text-[9px] uppercase tracking-[0.14em] text-white backdrop-blur">
                      arraste para explorar
                    </div>
                  </div>
                  <div className="space-y-5 bg-[#f5f1e9] p-5 text-xs">
                    <div>
                      <span className="mova-ui-label">móvel</span>
                      <strong className="mt-2 block text-sm">Guarda-roupa</strong>
                    </div>
                    <div>
                      <span className="mova-ui-label">dimensões</span>
                      <div className="mt-2 flex gap-2">
                        <span className="mova-input">180</span>
                        <span className="mova-input">220</span>
                        <span className="mova-input">60</span>
                      </div>
                    </div>
                    <div>
                      <span className="mova-ui-label">acabamento</span>
                      <div className="mt-2 flex gap-2">
                        <span className="size-6 rounded-full bg-[#805b42] ring-2 ring-[#26231f] ring-offset-2 ring-offset-[#f5f1e9]" />
                        <span className="size-6 rounded-full bg-[#d0b18c]" />
                        <span className="size-6 rounded-full bg-[#e9e4db]" />
                      </div>
                    </div>
                    <div>
                      <span className="mova-ui-label">detalhes</span>
                      <p className="mt-2 text-[#81776a]">4 portas · 3 gavetas</p>
                    </div>
                    <Link
                      to="/configurador"
                      className="flex items-center justify-between border-t border-[#d3c9bb] pt-5 font-semibold"
                    >
                      Abrir modelador <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mova-section mx-auto grid max-w-[1440px] gap-12 px-6 py-24 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:py-36">
        <Reveal className="relative min-h-[480px] overflow-hidden">
          <img
            src={workshopImage}
            alt="Oficina de marcenaria com trabalho artesanal"
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#26231f]/75 to-transparent" />
          <div className="absolute bottom-7 left-7 text-white">
            <p className="mova-kicker text-white/60">Para marcenarias</p>
            <p className="mt-3 font-display text-4xl leading-none">
              Apresente antes
              <br />
              de produzir.
            </p>
          </div>
        </Reveal>
        <Reveal className="flex flex-col justify-center" delay={140}>
          <p className="mova-kicker">05 — Para quem faz</p>
          <h2 className="mt-5 font-display text-[clamp(2.8rem,5vw,5.8rem)] leading-[.92] tracking-[-.055em]">
            A experiência de projeto também é parte da <em className="text-[#9b7958]">entrega.</em>
          </h2>
          <p className="mt-7 max-w-md text-sm leading-7 text-[#766f65]">
            Dê ao seu cliente uma forma mais visual de escolher. Receba projetos mais claros, com
            decisões tomadas e espaço para a sua marcenaria fazer o que faz melhor.
          </p>
          <Link
            to="/cadastro"
            className="mt-9 inline-flex items-center gap-3 text-sm font-semibold"
          >
            Leve o MOVA para sua marcenaria <ArrowUpRight size={17} />
          </Link>
        </Reveal>
      </section>

      <section className="mova-final-cta relative overflow-hidden px-6 py-28 text-center text-white lg:py-44">
        <img
          src={kitchenImage}
          alt="Cozinha planejada em madeira natural"
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[#26231f]/65" />
        <Reveal className="relative z-10 mx-auto max-w-4xl">
          <p className="mova-kicker text-white/65">06 — Próximo capítulo</p>
          <h2 className="mt-6 font-display text-[clamp(3.2rem,7vw,8rem)] leading-[.88] tracking-[-.06em]">
            Seu próximo projeto começa com uma ideia.
          </h2>
          <Link to="/configurador" className="mova-button-light mt-10">
            Experimentar o MOVA <ArrowUpRight size={17} />
          </Link>
        </Reveal>
      </section>

      <footer className="bg-[#26231f] px-6 py-10 text-[#f2efe8] lg:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <Link to="/" className="text-lg font-semibold tracking-[0.22em]">
              MOVA
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-5 text-white/45">
              Experiência de projeto 3D para móveis que pertencem ao seu espaço.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-[11px] uppercase tracking-[0.16em] text-white/55">
            <a href="#manifesto">Manifesto</a>
            <a href="#ambientes">Ambientes</a>
            <Link to="/portfolio">Projetos</Link>
            <Link to="/configurador">Modelador 3D</Link>
            <Link to="/login">Entrar</Link>
          </div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
            © {new Date().getFullYear()} MOVA
          </p>
        </div>
      </footer>
    </main>
  );
}
