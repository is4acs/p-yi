import Link from "next/link";

/**
 * Footer discret en bas de chaque page. Regroupe les liens légaux RGPD
 * (CNIL exige qu'ils soient accessibles depuis n'importe quelle page),
 * un lien de contact et le copyright. Pas de newsletter ni de réseaux
 * sociaux ici — c'est volontairement minimal pour ne pas parasiter
 * l'app mobile-first.
 *
 * On reste en simple lien texte plutôt qu'en icônes ou en boutons pour
 * rester dans une esthétique "note de bas de page" qui ne concurrence
 * pas la BottomNav mobile.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-border bg-muted/20 px-4 py-6 text-xs text-muted-foreground">
      <div className="mx-auto max-w-6xl space-y-3 sm:flex sm:items-center sm:justify-between sm:space-y-0">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Pied de page">
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
        <p className="text-[11px]">
          © {year} Péyi · Fait en Guyane
        </p>
      </div>
    </footer>
  );
}
