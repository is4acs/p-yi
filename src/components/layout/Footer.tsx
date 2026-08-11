import Link from "next/link";

/**
 * Footer discret en bas de chaque page. Regroupe les liens légaux RGPD
 * (CNIL exige qu'ils soient accessibles depuis n'importe quelle page),
 * un lien de contact et le copyright. Pas de newsletter ni de réseaux
 * sociaux ici — c'est volontairement minimal pour ne pas parasiter
 * l'app mobile-first.
 *
 * Surfaces : fond crème/nuit posé SUR le footer lui-même, et l'espace
 * au-dessus est du `pt-*` (padding, qui peint le fond) et non un
 * `mt-*` — une marge est transparente et collapse à travers les
 * wrappers, ce qui laissait une bande blanche au-dessus du footer sur
 * iPhone.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-soleil-line bg-soleil-cream px-4 py-6 text-xs text-soleil-muted2 dark:border-soleil-line-d dark:bg-soleil-night dark:text-soleil-muted-d">
      <div className="mx-auto max-w-6xl space-y-3 sm:flex sm:items-center sm:justify-between sm:space-y-0">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Pied de page">
          <Link
            href="/mentions-legales"
            className="hover:text-soleil-forest dark:hover:text-soleil-cream"
          >
            Mentions légales
          </Link>
          <Link
            href="/cgu"
            className="hover:text-soleil-forest dark:hover:text-soleil-cream"
          >
            CGU
          </Link>
          <Link
            href="/confidentialite"
            className="hover:text-soleil-forest dark:hover:text-soleil-cream"
          >
            Confidentialité
          </Link>
          <Link
            href="/cookies"
            className="hover:text-soleil-forest dark:hover:text-soleil-cream"
          >
            Cookies
          </Link>
          <a
            href="mailto:contact@peyi.gf"
            className="hover:text-soleil-forest dark:hover:text-soleil-cream"
          >
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
