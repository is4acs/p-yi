import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité Péyi — données collectées, finalités, droits RGPD et exercice.",
  alternates: { canonical: "/confidentialite" },
};

// Politique de confidentialité RGPD-compliant. Les durées de conservation
// et les catégories de données reflètent l'état réel du schéma Prisma et
// des traitements implémentés. À mettre à jour si le schéma change.
export default function ConfidentialitePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Accueil
        </Link>{" "}
        / Confidentialité
      </nav>

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Politique de confidentialité
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : 17 avril 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-6 text-foreground">
        <section>
          <p>
            Cette politique explique quelles données personnelles Péyi
            collecte, pourquoi, combien de temps elles sont conservées et
            comment exercer tes droits (accès, rectification, suppression,
            portabilité, opposition).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">
            1. Responsable du traitement
          </h2>
          <p className="mt-2">
            Le responsable du traitement est l&apos;éditeur du service Péyi,
            dont les coordonnées figurent dans les{" "}
            <Link href="/mentions-legales" className="text-peyi-orange-700 hover:underline">
              mentions légales
            </Link>
            .
          </p>
          <p className="mt-2">
            Pour toute question relative à tes données, écris à{" "}
            <a href="mailto:contact@peyi.gf" className="text-peyi-orange-700 hover:underline">
              contact@peyi.gf
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">2. Données collectées</h2>
          <p className="mt-2">
            Péyi collecte les catégories de données suivantes, toutes
            directement fournies par l&apos;utilisateur ou générées par son
            usage :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Compte&nbsp;:</strong> email, numéro de téléphone
              (optionnel), nom d&apos;utilisateur, nom complet (optionnel),
              avatar, biographie, commune
            </li>
            <li>
              <strong>Contenus publiés&nbsp;:</strong> annonces, bons plans,
              commentaires, photos, votes, favoris, alertes
            </li>
            <li>
              <strong>Messages privés&nbsp;:</strong> contenu texte des
              messages envoyés et reçus entre utilisateurs
            </li>
            <li>
              <strong>Données techniques&nbsp;:</strong> adresse IP (pour la
              limitation de débit et la prévention des abus), user agent,
              logs d&apos;authentification
            </li>
            <li>
              <strong>Préférences&nbsp;:</strong> paramètres de notifications,
              langue préférée
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">3. Finalités et bases légales</h2>
          <p className="mt-2">
            Chaque traitement répond à une finalité et à une base légale
            spécifique au sens du RGPD&nbsp;:
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-2 font-semibold">Finalité</th>
                  <th className="py-2 pr-2 font-semibold">Base légale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-2">Création et gestion du compte</td>
                  <td className="py-2 pr-2">Exécution d&apos;un contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2">Publication et diffusion de contenus</td>
                  <td className="py-2 pr-2">Exécution d&apos;un contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2">Messagerie privée</td>
                  <td className="py-2 pr-2">Exécution d&apos;un contrat</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2">Limitation de débit, prévention des abus</td>
                  <td className="py-2 pr-2">Intérêt légitime</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2">Modération et signalements</td>
                  <td className="py-2 pr-2">Intérêt légitime, obligation légale</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2">Notifications push et email</td>
                  <td className="py-2 pr-2">
                    Consentement (désactivable dans les préférences)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">4. Durées de conservation</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Compte actif&nbsp;:</strong> les données sont
              conservées tant que le compte est actif
            </li>
            <li>
              <strong>Compte supprimé&nbsp;:</strong> la suppression est
              immédiate et définitive sur demande de l&apos;utilisateur ; les
              contenus avec réponses ou interlocuteurs tiers sont anonymisés
            </li>
            <li>
              <strong>Logs techniques&nbsp;:</strong> maximum 12 mois
            </li>
            <li>
              <strong>Journal de modération (AdminActionLog)&nbsp;:</strong>{" "}
              conservé pendant la durée de vie du service à des fins de
              sécurité et d&apos;audit
            </li>
            <li>
              <strong>Signalements résolus&nbsp;:</strong> 24 mois à compter de
              leur clôture
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">5. Destinataires et sous-traitants</h2>
          <p className="mt-2">
            Tes données ne sont jamais vendues ni louées. Elles sont
            accessibles à&nbsp;:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Toi-même et les autres utilisateurs pour les contenus que tu
              choisis de rendre publics
            </li>
            <li>
              L&apos;équipe de modération Péyi pour les besoins de
              modération
            </li>
            <li>
              Nos sous-traitants techniques strictement nécessaires au
              fonctionnement&nbsp;:{" "}
              <strong>Supabase</strong> (base de données, authentification,
              stockage de fichiers),
              <strong> Vercel</strong> (hébergement applicatif),
              <strong> Upstash</strong> (limitation de débit en mémoire)
            </li>
          </ul>
          <p className="mt-2">
            Ces sous-traitants sont engagés contractuellement à respecter la
            confidentialité et la sécurité des données. Certains ont leurs
            serveurs hors Union européenne (États-Unis, Singapour). Les
            transferts sont encadrés par les clauses contractuelles types
            (CCT) de la Commission européenne et, lorsqu&apos;applicable, par
            le Data Privacy Framework.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">6. Tes droits RGPD</h2>
          <p className="mt-2">
            Conformément aux articles 15 à 22 du RGPD, tu disposes des droits
            suivants&nbsp;:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Droit d&apos;accès&nbsp;:</strong> obtenir la copie des
              données te concernant
            </li>
            <li>
              <strong>Droit de rectification&nbsp;:</strong> corriger les
              données inexactes depuis{" "}
              <Link href="/profil/edit" className="text-peyi-orange-700 hover:underline">
                ton profil
              </Link>
            </li>
            <li>
              <strong>Droit à l&apos;effacement&nbsp;:</strong> supprimer ton
              compte et tes données
            </li>
            <li>
              <strong>Droit à la portabilité&nbsp;:</strong> télécharger tes
              données dans un format structuré (JSON)
            </li>
            <li>
              <strong>Droit d&apos;opposition&nbsp;:</strong> refuser certains
              traitements reposant sur l&apos;intérêt légitime
            </li>
            <li>
              <strong>Droit de limitation&nbsp;:</strong> demander la
              suspension d&apos;un traitement
            </li>
          </ul>
          <p className="mt-2">
            La plupart de ces droits s&apos;exercent directement depuis{" "}
            <Link href="/profil/confidentialite" className="text-peyi-orange-700 hover:underline">
              Confidentialité & données
            </Link>
            . Pour les demandes qui ne peuvent pas être automatisées, écris à{" "}
            <a href="mailto:contact@peyi.gf" className="text-peyi-orange-700 hover:underline">
              contact@peyi.gf
            </a>{" "}
            — une réponse sera apportée dans un délai maximum de 30 jours.
          </p>
          <p className="mt-2">
            Tu peux également introduire une réclamation auprès de la{" "}
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-peyi-orange-700 hover:underline"
            >
              CNIL
            </a>{" "}
            si tu estimes que le traitement de tes données ne respecte pas la
            réglementation.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">7. Sécurité</h2>
          <p className="mt-2">
            Péyi met en œuvre les mesures techniques et organisationnelles
            appropriées pour protéger tes données&nbsp;: chiffrement en
            transit (HTTPS/TLS), headers de sécurité stricts (CSP, HSTS,
            X-Frame-Options), hashage des mots de passe par le provider
            d&apos;authentification, limitation de débit sur les endpoints
            sensibles, journalisation des accès administrateurs.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">8. Cookies et traceurs</h2>
          <p className="mt-2">
            Péyi n&apos;utilise que des cookies strictement nécessaires au
            fonctionnement du service (session d&apos;authentification).
            Aucun cookie publicitaire ni traceur analytique tiers n&apos;est
            posé. Voir la{" "}
            <Link href="/cookies" className="text-peyi-orange-700 hover:underline">
              politique cookies
            </Link>{" "}
            pour le détail.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">9. Modification</h2>
          <p className="mt-2">
            Péyi peut faire évoluer cette politique pour refléter les
            évolutions du service ou de la réglementation. La date de
            dernière mise à jour figure en haut de page. Les modifications
            substantielles sont signalées par email ou notification.
          </p>
        </section>
      </div>
    </main>
  );
}
