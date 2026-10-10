import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Menu,
  MoveUpRight,
  Palette,
  Ruler,
  ScanLine,
  X,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import heroImage from "@/assets/hero-marcenaria.jpg";
import kitchenImage from "@/assets/cozinha.jpg";
import officeImage from "@/assets/home-office.jpg";
import workshopImage from "@/assets/oficina.jpg";
import movaLogoWhite from "@/assets/mova-logo-white.png";
import { encodeConfiguration } from "@/lib/furniture/configValidation";
import { DEMO_CONFIG } from "@/lib/furniture/demo";

const MovaCabinetScene = lazy(() => import("@/components/landing/MovaCabinetScene"));

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
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`mova-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function CabinetExperience() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px 0px", threshold: 0.05 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className="mova-3d-stage">
      <div className="mova-3d-grid" />
      <div className="mova-3d-glow" />
      {active ? (
        <Suspense fallback={<div className="mova-scene-loading">Preparando matéria…</div>}>
          <MovaCabinetScene cycle={0} reducedMotion={reducedMotion} config={DEMO_CONFIG} />
        </Suspense>
      ) : (
        <div className="mova-scene-loading">A cena aparece ao entrar no quadro.</div>
      )}
      <div className="mova-scene-caption">
        <span>cena MOVA / 01</span>
        <span>madeira natural · nogueira</span>
      </div>
      <a
        href={`/configurador?c=${encodeURIComponent(encodeConfiguration(DEMO_CONFIG))}`}
        className="mova-replay"
        aria-label="Repetir construção no modelador 3D"
      >
        <MoveUpRight size={14} /> repetir construção
      </a>
    </div>
  );
}

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <main className="mova-landing overflow-hidden bg-[#f2efe8] text-[#26231f]">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/20 text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 lg:px-10">
          <Link to="/" className="group flex items-center" aria-label="MOVA início">
            <img src={movaLogoWhite} alt="MOVA" className="mova-brand-logo mova-brand-logo-light" />
          </Link>
          <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.2em] text-white/75 lg:flex">
            <a className="mova-nav-link" href="#processo">
              O processo
            </a>
            <a className="mova-nav-link" href="#valor">
              O valor
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
              <a href="#processo" onClick={closeMenu}>
                O processo
              </a>
              <a href="#valor" onClick={closeMenu}>
                O valor
              </a>
              <Link to="/configurador" onClick={closeMenu}>
                Modelador 3D
              </Link>
              <Link to="/login" onClick={closeMenu}>
                Entrar
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
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,20,17,.78),rgba(21,20,17,.22)_62%,rgba(21,20,17,.12))]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#1d1b18]/65 to-transparent" />
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
              <a href="#processo" className="mova-button-line">
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
        id="processo"
        className="mova-process-section relative overflow-hidden bg-[#d9d0c2] px-6 py-24 lg:px-10 lg:py-36"
      >
        <div className="mova-transition-top" />
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="mova-kicker">01 — Do traço à presença</p>
                <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.8rem,6vw,7rem)] leading-[.9] tracking-[-.055em]">
                  Uma ideia,
                  <br />
                  <em className="text-[#9b7958]">em construção.</em>
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-[#6f655a]">
                Uma única cena. Estrutura, matéria e detalhe revelados na medida certa.
              </p>
            </div>
          </Reveal>
          <div className="mt-14 grid items-center gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <Reveal className="relative z-10" delay={120}>
              <div className="mova-specimen-note">
                <span className="mova-kicker">Gabinete contemporâneo</span>
                <h3 className="mt-4 font-display text-4xl leading-none">
                  A forma aparece
                  <br />
                  antes da obra.
                </h3>
                <p className="mt-5 text-sm leading-6 text-[#6f655a]">
                  Portas, gavetas e prateleiras se encaixam em uma estrutura de proporções reais,
                  com acabamento de nogueira.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#b9ad9d] pt-5 text-[11px] uppercase tracking-[0.14em] text-[#806c56]">
                  <span>
                    <strong className="block text-lg font-normal text-[#26231f]">180</strong>{" "}
                    largura cm
                  </span>
                  <span>
                    <strong className="block text-lg font-normal text-[#26231f]">02</strong> portas
                  </span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={220}>
              <CabinetExperience />
            </Reveal>
          </div>
          <div className="mt-12 grid gap-5 border-t border-[#b9ad9d] pt-6 text-sm text-[#6f655a] md:grid-cols-4">
            {["Estrutura", "Prateleiras", "Portas", "Gavetas"].map((item, index) => (
              <div key={item} className="flex items-center gap-4">
                <span className="font-display text-2xl text-[#9b7958]">0{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="valor"
        className="mova-value-section relative overflow-hidden bg-[#f2efe8] px-6 py-24 lg:px-10 lg:py-36"
      >
        <div className="mova-transition-clay" />
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr]">
            <Reveal>
              <p className="mova-kicker">02 — O valor do MOVA</p>
              <h2 className="mt-5 max-w-xl font-display text-[clamp(2.8rem,5vw,6rem)] leading-[.92] tracking-[-.055em]">
                Apresentar bem também é parte da <em className="text-[#9b7958]">entrega.</em>
              </h2>
              <p className="mt-7 max-w-md text-sm leading-7 text-[#766f65]">
                Para quem escolhe, um jeito mais claro de decidir. Para quem produz, um projeto mais
                próximo da realidade.
              </p>
              <Link
                to="/configurador"
                className="mt-9 inline-flex items-center gap-3 text-sm font-semibold"
              >
                Criar seu primeiro projeto <ArrowUpRight size={17} />
              </Link>
            </Reveal>
            <Reveal delay={140}>
              <div className="grid gap-4 md:grid-cols-12 md:grid-rows-[220px_220px]">
                <div className="group relative overflow-hidden md:col-span-7 md:row-span-2">
                  <img
                    src={kitchenImage}
                    alt="Cozinha planejada em madeira natural"
                    className="size-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#26231f]/70 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <span className="mova-kicker text-white/60">01 · ambiente</span>
                    <p className="mt-2 font-display text-3xl">
                      A matéria encontra
                      <br />o cotidiano.
                    </p>
                  </div>
                </div>
                <div className="group relative overflow-hidden md:col-span-5">
                  <img
                    src={officeImage}
                    alt="Home office planejado"
                    className="size-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#26231f]/70 to-transparent" />
                  <span className="absolute bottom-5 left-5 font-display text-2xl text-white">
                    Trabalho com espaço.
                  </span>
                </div>
                <div className="flex items-center bg-[#26231f] p-7 text-[#f2efe8] md:col-span-5">
                  <div>
                    <span className="mova-kicker text-[#c6a47e]">Para marcenarias</span>
                    <p className="mt-4 font-display text-3xl leading-none">
                      Seu catálogo.
                      <br />
                      Sua linguagem.
                    </p>
                    <Link
                      to="/cadastro"
                      className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[.14em] text-[#c6a47e]"
                    >
                      Leve o MOVA para sua marcenaria <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
          <div
            id="modelador"
            className="mt-20 grid gap-6 border-t border-[#cfc7ba] pt-7 text-sm text-[#766f65] md:grid-cols-4"
          >
            <span className="flex gap-2">
              <Ruler size={16} className="text-[#9b7958]" /> dimensões reais
            </span>
            <span className="flex gap-2">
              <Palette size={16} className="text-[#9b7958]" /> materiais e acabamentos
            </span>
            <span className="flex gap-2">
              <Check size={16} className="text-[#9b7958]" /> portas, gavetas e componentes
            </span>
            <span className="flex gap-2">
              <ScanLine size={16} className="text-[#9b7958]" /> visualização em AR
            </span>
          </div>
        </div>
      </section>

      <section className="mova-final-cta relative overflow-hidden px-6 py-28 text-center text-white lg:py-44">
        <img
          src={workshopImage}
          alt="Oficina de marcenaria e trabalho artesanal"
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[#26231f]/70" />
        <div className="mova-transition-dark" />
        <Reveal className="relative z-10 mx-auto max-w-4xl">
          <p className="mova-kicker text-white/65">03 — Próximo capítulo</p>
          <h2 className="mt-6 font-display text-[clamp(3.2rem,7vw,8rem)] leading-[.88] tracking-[-.06em]">
            Seu próximo projeto começa com uma ideia.
          </h2>
          <Link to="/configurador" className="mova-button-light mt-10">
            Experimentar o MOVA <ArrowUpRight size={17} />
          </Link>
        </Reveal>
        <footer className="relative z-10 mx-auto mt-24 flex max-w-[1440px] flex-col gap-8 border-t border-white/20 pt-7 text-left md:flex-row md:items-end md:justify-between">
          <div>
            <Link to="/" className="inline-flex" aria-label="MOVA início">
              <img
                src={movaLogoWhite}
                alt="MOVA"
                className="mova-brand-logo mova-brand-logo-footer"
              />
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-5 text-white/50">
              Experiência de projeto 3D para móveis que pertencem ao seu espaço.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[11px] uppercase tracking-[0.16em] text-white/60">
            <Link to="/portfolio">Projetos</Link>
            <Link to="/servicos">Serviços</Link>
            <Link to="/sobre">Sobre</Link>
            <Link to="/contato">Contato</Link>
            <Link to="/login">Entrar</Link>
          </div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
            © {new Date().getFullYear()} MOVA
          </p>
        </footer>
      </section>
    </main>
  );
}
