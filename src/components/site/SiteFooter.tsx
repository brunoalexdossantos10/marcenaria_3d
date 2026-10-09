import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl">Ateliê Nogal</p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Marcenaria sob medida em MDF e madeira nobre. Projeto, produção e montagem próprios, com
            configurador 3D para você visualizar antes de aprovar.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Navegar
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/servicos" className="hover:text-primary">
                Serviços
              </Link>
            </li>
            <li>
              <Link to="/portfolio" className="hover:text-primary">
                Portfólio
              </Link>
            </li>
            <li>
              <Link to="/sobre" className="hover:text-primary">
                Sobre o ateliê
              </Link>
            </li>
            <li>
              <Link to="/configurador" className="hover:text-primary">
                Configurador 3D
              </Link>
            </li>
            <li>
              <Link to="/meus-projetos" className="hover:text-primary">
                Meus projetos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Contato
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-primary" /> (11) 4002-8922
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-primary" /> projetos@atelienogal.com.br
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" /> São Paulo · SP
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="size-4 text-primary" /> @atelienogal
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-5 py-5">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} Ateliê Nogal Marcenaria. Estimativas geradas no configurador
          são aproximadas e confirmadas após visita técnica.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
