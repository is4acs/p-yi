import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Download,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Confidentialité & données",
  description: "Exerce tes droits RGPD — accès, rectification, portabilité, suppression.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { success?: string; error?: string };
};

/**
 * Hub des droits RGPD pour l'utilisateur connecté. On regroupe ici :
 *  - Rectification (lien vers /profil/edit)
 *  - Préférences notifications (lien vers /notifications)
 *  - Portabilité : téléchargement JSON via /api/me/export
 *  - Effacement : lien vers la page de suppression de compte
 *  - Rappels légaux (politique de confidentialité, CGU)
 *
 * Chaque section est un bloc autonome avec une explication courte et
 * un CTA. On ne met PAS de toggle "profil public/privé" pour l'instant
 * — le schéma ne le supporte pas et Péyi fonctionne par design comme
 * un réseau semi-public (les annonces et bons plans sont publics par
 * nature). On ajoutera ça plus tard si Isaac le demande.
 */
export default async function ConfidentialitePage({ searchParams }: Props) {
  const user = await requireUser("/profil/confidentialite");

  // Aperçu rapide du volume de données de l'utilisateur — utile pour
  // situer avant un export ou une suppression.
  const [listingCount, dealCount, commentCount, messageCount] = await Promise.all([
    prisma.listing.count({ where: { authorId: user.id } }),
    prisma.deal.count({ where: { authorId: user.id } }),
    prisma.comment.count({ where: { authorId: user.id, isDeleted: false } }),
    prisma.message.count({
      where: {
        OR: [{ senderId: user.id }, { recipientId: user.id }],
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link
          href="/profil"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Profil
        </Link>
      </nav>

      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Confidentialité & données
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Exerce tes droits sur tes données : consulter, modifier, exporter
          ou supprimer.
        </p>
      </header>

      {searchParams?.success && (
        <p className="mt-4 rounded-md border border-peyi-green-300 bg-peyi-green-50 px-3 py-2 text-sm text-peyi-green-900">
          {searchParams.success}
        </p>
      )}
      {searchParams?.error && (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {searchParams.error}
        </p>
      )}

      {/* Aperçu du volume */}
      <section className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
        <h2 className="text-sm font-semibold">Aperçu de mes données</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Annonces</dt>
            <dd className="font-mono text-foreground">{listingCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Bons plans</dt>
            <dd className="font-mono text-foreground">{dealCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Commentaires</dt>
            <dd className="font-mono text-foreground">{commentCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Messages</dt>
            <dd className="font-mono text-foreground">{messageCount}</dd>
          </div>
        </dl>
      </section>

      {/* Rectification */}
      <section className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
            <Pencil className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Rectifier mes informations</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Modifier ton nom d&apos;utilisateur, ton avatar, ta bio, ta
              commune ou ton téléphone. Tu peux corriger ou compléter ces
              informations à tout moment.
            </p>
            <Link
              href="/profil/edit"
              className="mt-2 inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:border-peyi-orange-300"
            >
              Modifier mon profil
            </Link>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mt-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
            <Bell className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Préférences de notifications</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choisis ce pour quoi tu veux être notifié (nouveaux messages,
              bons plans qui matchent tes alertes, réponses à tes
              commentaires).
            </p>
            <Link
              href="/notifications"
              className="mt-2 inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:border-peyi-orange-300"
            >
              Gérer mes notifications
            </Link>
          </div>
        </div>
      </section>

      {/* Portabilité */}
      <section className="mt-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peyi-green-100 text-peyi-green-700">
            <Download className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">
              Télécharger mes données (portabilité)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Exporte l&apos;ensemble de tes données dans un fichier JSON
              structuré : profil, contenus publiés, messages envoyés et
              reçus, favoris, alertes. Tu peux en faire ce que tu veux —
              les conserver, les importer ailleurs, ou juste les consulter.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pour des raisons de performance, tu peux exporter tes
              données une fois par 24 heures.
            </p>
            <a
              href="/api/me/export"
              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-peyi-green-600 px-3 text-xs font-semibold text-white hover:bg-peyi-green-700"
            >
              <Download className="h-3 w-3" aria-hidden />
              Télécharger (JSON)
            </a>
          </div>
        </div>
      </section>

      {/* Effacement */}
      <section className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            <Trash2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-red-900">
              Supprimer mon compte
            </h2>
            <p className="mt-1 text-xs text-red-800">
              La suppression est <strong>définitive</strong>. Ton profil,
              tes annonces, tes bons plans, tes favoris et tes alertes
              seront effacés. Les commentaires avec réponses tierces et les
              messages privés sont anonymisés (remplacés par «&nbsp;[compte
              supprimé]&nbsp;») pour préserver la cohérence des échanges
              des autres utilisateurs.
            </p>
            <Link
              href="/profil/confidentialite/supprimer"
              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 text-xs font-semibold text-red-900 hover:bg-red-100"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
              Continuer vers la suppression
            </Link>
          </div>
        </div>
      </section>

      {/* Rappel légaux */}
      <section className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            <p>
              Pour plus de détails, consulte la{" "}
              <Link
                href="/confidentialite"
                className="text-peyi-orange-700 hover:underline"
              >
                politique de confidentialité
              </Link>{" "}
              ou écris à{" "}
              <a
                href="mailto:contact@peyi.gf"
                className="text-peyi-orange-700 hover:underline"
              >
                contact@peyi.gf
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
