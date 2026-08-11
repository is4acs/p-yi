import Link from "next/link";

import { SunArc } from "@/components/brand/SunArc";

/**
 * Pied de page — refonte « Soleil péyi ».
 *
 * La maquette ne montre qu'une signature centrée « Péyi — fait en
 * Guyane ». On garde en plus les liens légaux : la CNIL exige qu'ils
 * soient atteignables depuis n'importe quelle page, ce n'est pas un
 * choix graphique. Ils passent au-dessus de la signature sur mobile, et
 * à gauche sur desktop, comme les liens de communes de la maquette
 * desktop.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-border px-5 py-7 text-xs text-muted-foreground sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5"
          aria-label="Pied de page"
        >
          <Link href="/mentions-legales" className="hover:text-foreground">
            Mentions légales
          </Link>
          <Link href="/cgu" className="hover:text-foreground">
            CGU
          </Link>
          <Link href="/confidentialite" className="hover:text-foreground">
            Confidentialité
          </Link>
          <Link href="/cookies" className="hover:text-foreground">
            Cookies
          </Link>
          <a href="mailto:contact@peyi.gf" className="hover:text-foreground">
            Contact
          </a>
        </nav>

        <p className="flex items-end gap-1.5 font-semibold text-subtle">
          <SunArc width={14} className="mb-[3px]" />
          Péyi — fait en Guyane
          <span className="sr-only"> · © {year}</span>
        </p>
      </div>
    </footer>
  );
}
