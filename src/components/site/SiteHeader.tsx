import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/servicos", label: "Serviços" },
  { to: "/portfolio", label: "Portfólio" },
  { to: "/sobre", label: "Sobre" },
  { to: "/meus-projetos", label: "Meus projetos" },
  { to: "/contato", label: "Contato" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform duration-300 group-hover:rotate-6">
            <span className="font-display text-base leading-none">N</span>
          </span>
          <span className="font-display text-lg leading-none">
            Ateliê Nogal
            <span className="block text-[10px] font-sans uppercase tracking-[0.24em] text-muted-foreground">
              marcenaria sob medida
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="nav-link"
              activeProps={{ className: "nav-link nav-link-active" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
          <Link to="/configurador" className="btn-primary ml-3 h-11 text-sm">
            Configurador 3D
          </Link>
        </nav>

        <button
          type="button"
          className="step-btn lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={`overflow-hidden border-border bg-background/95 backdrop-blur transition-[max-height,opacity] duration-300 lg:hidden ${
          open ? "max-h-96 border-t opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="nav-link py-2.5 text-base"
            >
              {n.label}
            </Link>
          ))}
          <Link to="/configurador" onClick={() => setOpen(false)} className="btn-primary mt-2">
            Configurador 3D
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
