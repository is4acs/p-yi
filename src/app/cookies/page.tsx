import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique cookies",
  description:
    "Liste des cookies utilisés par Péyi — strictement nécessaires au fonctionnement.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Accueil
        </Link>{" "}
        / Cookies
      </nav>

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Politique cookies
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : 17 avril 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-6 text-foreground">
        <section>
          <p>
            Péyi n&apos;utilise que des cookies{" "}
            <strong>strictement nécessaires</strong> au fonctionnement du
            service. Ces cookies ne requièrent pas de consentement préalable
            conformément à l&apos;article 82 de la loi Informatique et
            Libertés (ils sont exemptés par la CNIL).
          </p>
          <p className="mt-2">
            Aucun cookie publicitaire, ni de traceur analytique tiers
            (Google Analytics, Meta Pixel, etc.) n&apos;est utilisé.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Cookies utilisés</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-2 font-semibold">Nom</th>
                  <th className="py-2 pr-2 font-semibold">Finalité</th>
                  <th className="py-2 pr-2 font-semibold">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-2 font-mono">sb-*-auth-token</td>
                  <td className="py-2 pr-2">
                    Session d&apos;authentification Supabase
                  </td>
                  <td className="py-2 pr-2">Session (jusqu&apos;à 30 jours)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 font-mono">sb-*-auth-token-code-verifier</td>
                  <td className="py-2 pr-2">
                    Anti-CSRF pour le flow OAuth / OTP
                  </td>
                  <td className="py-2 pr-2">Session (10 minutes max)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Stockage local (PWA)</h2>
          <p className="mt-2">
            L&apos;application progressive (PWA) utilise le stockage local du
            navigateur et un service worker pour&nbsp;:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Mettre en cache les ressources statiques (CSS, JavaScript,
              images) pour accélérer le chargement et permettre le mode hors
              ligne
            </li>
            <li>
              Enregistrer l&apos;état d&apos;installation de la bannière PWA
              pour ne pas la réafficher en boucle
            </li>
          </ul>
          <p className="mt-2">
            Tu peux effacer ce stockage à tout moment depuis les réglages de
            ton navigateur.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Gestion des préférences</h2>
          <p className="mt-2">
            Étant donné que seuls des cookies strictement nécessaires sont
            posés, aucune bannière de consentement n&apos;est affichée. Si tu
            refuses totalement les cookies via les réglages de ton navigateur,
            tu ne pourras plus te connecter à ton compte.
          </p>
        </section>
      </div>
    </main>
  );
}
