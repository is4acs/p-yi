import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales du service Péyi — éditeur, hébergeur, propriété intellectuelle.",
  alternates: { canonical: "/mentions-legales" },
};

// Page légale statique. Isaac : remplace tous les [À COMPLÉTER] par les
// informations réelles (adresse, SIRET si structure juridique, contact)
// avant la mise en production publique.
export default function MentionsLegalesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Accueil
        </Link>{" "}
        / Mentions légales
      </nav>

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Mentions légales
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : 17 avril 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-6 text-foreground">
        <section>
          <h2 className="font-display text-xl font-bold">Éditeur du site</h2>
          <p className="mt-2">
            Le service <strong>Péyi</strong> (accessible depuis
            https://peyi.gf et sous-domaines) est édité par :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Nom / raison sociale : [À COMPLÉTER — nom de la personne ou structure juridique]</li>
            <li>Statut juridique : [À COMPLÉTER — particulier / auto-entrepreneur / SAS / etc.]</li>
            <li>SIREN / SIRET : [À COMPLÉTER si applicable]</li>
            <li>Adresse du siège : [À COMPLÉTER]</li>
            <li>
              Contact : <a href="mailto:contact@peyi.gf" className="text-peyi-orange-700 hover:underline">contact@peyi.gf</a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Directeur de publication</h2>
          <p className="mt-2">
            [À COMPLÉTER — nom et prénom du directeur de publication]
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Hébergement</h2>
          <p className="mt-2">
            Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon
            Ave #4133, Walnut, CA 91789, États-Unis. Site web :{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-peyi-orange-700 hover:underline"
            >
              vercel.com
            </a>
            .
          </p>
          <p className="mt-2">
            La base de données et l&apos;authentification sont assurées par{" "}
            <strong>Supabase Inc.</strong>, 970 Toa Payoh North #07-04, Singapour
            318992. Site web :{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-peyi-orange-700 hover:underline"
            >
              supabase.com
            </a>
            .
          </p>
          <p className="mt-2">
            La limitation de débit (rate-limiting) est assurée par{" "}
            <strong>Upstash Inc.</strong>, 120 Hawthorne Ave, Palo Alto, CA
            94301, États-Unis.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Propriété intellectuelle</h2>
          <p className="mt-2">
            L&apos;ensemble des éléments composant le site (design, textes
            éditoriaux, logo Péyi, illustrations, structure de base de données)
            est la propriété exclusive de l&apos;éditeur ou de ses ayants
            droit. Toute reproduction ou représentation totale ou partielle
            sans autorisation préalable est interdite.
          </p>
          <p className="mt-2">
            Les contenus publiés par les utilisateurs (annonces, bons plans,
            commentaires, photos) restent la propriété de leurs auteurs. En
            publiant, l&apos;utilisateur accorde à Péyi une licence non
            exclusive, gratuite et mondiale pour l&apos;affichage, la
            diffusion et l&apos;archivage de ses contenus dans le cadre du
            service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Contact</h2>
          <p className="mt-2">
            Pour toute question relative au site, écris à{" "}
            <a href="mailto:contact@peyi.gf" className="text-peyi-orange-700 hover:underline">
              contact@peyi.gf
            </a>
            .
          </p>
          <p className="mt-2">
            Pour les questions relatives aux données personnelles, voir la{" "}
            <Link href="/confidentialite" className="text-peyi-orange-700 hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
