import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Conditions générales d'utilisation du service Péyi — règles, engagements, sanctions.",
};

export default function CguPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Accueil
        </Link>{" "}
        / CGU
      </nav>

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Conditions générales d&apos;utilisation
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : 17 avril 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-6 text-foreground">
        <section>
          <h2 className="font-display text-xl font-bold">1. Objet</h2>
          <p className="mt-2">
            Les présentes conditions générales d&apos;utilisation (ci-après
            «&nbsp;CGU&nbsp;») régissent l&apos;accès et l&apos;usage du
            service Péyi, une application web et progressive (PWA) dédiée aux
            bons plans et petites annonces en Guyane. En créant un compte ou
            en utilisant le service, l&apos;utilisateur accepte sans réserve
            les présentes CGU.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">2. Accès au service</h2>
          <p className="mt-2">
            Le service est accessible gratuitement à toute personne disposant
            d&apos;un accès internet. La consultation des contenus publics ne
            requiert pas de compte. La publication de contenu (annonces, bons
            plans, commentaires, messages) nécessite un compte utilisateur
            validé par email ou numéro de téléphone.
          </p>
          <p className="mt-2">
            L&apos;utilisateur doit avoir au moins 16 ans pour créer un compte.
            Les mineurs de 16 à 18 ans doivent disposer du consentement de
            leur représentant légal.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">3. Compte utilisateur</h2>
          <p className="mt-2">
            L&apos;utilisateur s&apos;engage à fournir des informations
            exactes lors de l&apos;inscription (email ou téléphone valide,
            nom d&apos;utilisateur). Il est responsable de la confidentialité
            de ses identifiants et de toute activité effectuée depuis son
            compte.
          </p>
          <p className="mt-2">
            En cas de suspicion d&apos;accès non autorisé, l&apos;utilisateur
            doit informer Péyi sans délai via{" "}
            <a href="mailto:contact@peyi.gf" className="text-peyi-orange-700 hover:underline">
              contact@peyi.gf
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">4. Règles de publication</h2>
          <p className="mt-2">En utilisant Péyi, l&apos;utilisateur s&apos;engage à :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Publier des contenus véridiques, non trompeurs et respectueux</li>
            <li>
              Ne pas publier de contenu illégal, violent, discriminatoire,
              diffamatoire, pornographique, ou portant atteinte aux droits
              d&apos;autrui
            </li>
            <li>
              Ne pas publier de contenus faisant la promotion de produits
              illégaux, de stupéfiants, d&apos;armes ou de contrefaçons
            </li>
            <li>Ne pas spammer, dupliquer ou détourner le service de son objet</li>
            <li>
              Ne pas collecter ou utiliser les données d&apos;autres
              utilisateurs (scraping, envoi massif, etc.)
            </li>
            <li>
              Respecter les autres utilisateurs dans les messages privés et
              les commentaires
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">5. Modération et sanctions</h2>
          <p className="mt-2">
            Péyi se réserve le droit, sans préavis, de :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Supprimer tout contenu contraire aux présentes CGU ou à la loi
            </li>
            <li>
              Suspendre temporairement ou définitivement un compte en cas de
              manquement répété ou grave
            </li>
            <li>
              Mettre en œuvre un «&nbsp;shadow-ban&nbsp;» (masquage silencieux
              des contenus d&apos;un utilisateur) pour les comportements de
              troll persistant
            </li>
            <li>
              Signaler aux autorités compétentes tout contenu manifestement
              illégal
            </li>
          </ul>
          <p className="mt-2">
            L&apos;utilisateur sanctionné peut contester la décision en écrivant à{" "}
            <a href="mailto:contact@peyi.gf" className="text-peyi-orange-700 hover:underline">
              contact@peyi.gf
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">6. Responsabilité</h2>
          <p className="mt-2">
            Péyi est une plateforme de mise en relation. L&apos;éditeur
            n&apos;est pas partie aux transactions qui peuvent résulter d&apos;une
            annonce ou d&apos;un bon plan. L&apos;utilisateur est responsable
            des échanges, paiements et éventuels litiges avec les autres
            utilisateurs.
          </p>
          <p className="mt-2">
            Péyi met tout en œuvre pour garantir la disponibilité du service
            mais ne peut être tenu responsable des interruptions dues à des
            causes techniques, des maintenances, ou des tiers (hébergeur,
            fournisseur d&apos;accès internet).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">7. Suppression du compte</h2>
          <p className="mt-2">
            L&apos;utilisateur peut supprimer son compte à tout moment depuis
            la page{" "}
            <Link href="/profil/confidentialite" className="text-peyi-orange-700 hover:underline">
              Confidentialité & données
            </Link>
            . La suppression est définitive : les annonces, bons plans et
            favoris sont supprimés ; les commentaires avec réponses et les
            messages privés sont anonymisés pour préserver la cohérence des
            échanges tiers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">8. Évolution des CGU</h2>
          <p className="mt-2">
            Péyi peut modifier les CGU à tout moment. Les utilisateurs sont
            informés des modifications substantielles par email ou via une
            notification dans l&apos;application. L&apos;usage continu du
            service après modification vaut acceptation.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">9. Droit applicable et juridiction</h2>
          <p className="mt-2">
            Les présentes CGU sont soumises au droit français. Tout litige
            relatif à l&apos;exécution ou à l&apos;interprétation des CGU
            relève de la compétence des tribunaux de Cayenne, sauf disposition
            d&apos;ordre public contraire.
          </p>
        </section>
      </div>
    </main>
  );
}
