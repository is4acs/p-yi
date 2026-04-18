import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

import { deleteMyAccountAction } from "./actions";

export const metadata: Metadata = {
  title: "Supprimer mon compte",
  description: "Confirmation de la suppression définitive du compte Péyi.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { error?: string };
};

/**
 * Écran de confirmation de suppression de compte (RGPD — droit à
 * l'effacement, art. 17). Affiche :
 *   1. Le détail de ce qui sera supprimé (contenus personnels)
 *   2. Le détail de ce qui sera anonymisé (contenus impliquant des
 *      tiers — commentaires avec réponses, messages, signalements)
 *   3. Un compteur de données perso pour situer l'ampleur
 *   4. Un formulaire avec double confirmation (checkbox + mot-clé
 *      "SUPPRIMER" à taper) pour éviter les suppressions accidentelles
 *
 * Le mot-clé est volontairement en MAJUSCULES et en français pour
 * forcer une action délibérée : un utilisateur pressé ou ayant cliqué
 * par inadvertance devra quand même faire cette saisie explicite.
 */
export default async function DeleteAccountPage({ searchParams }: Props) {
  const user = await requireUser("/profil/confidentialite/supprimer");

  const [listingCount, dealCount, commentCount, messageCount] =
    await Promise.all([
      prisma.listing.count({ where: { authorId: user.id } }),
      prisma.deal.count({ where: { authorId: user.id } }),
      prisma.comment.count({
        where: { authorId: user.id, isDeleted: false },
      }),
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
          href="/profil/confidentialite"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Confidentialité
        </Link>
      </nav>

      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-red-900 sm:text-3xl">
          Supprimer mon compte
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu es sur le point de supprimer définitivement ton compte{" "}
          <strong>@{user.username}</strong>. Cette action est irréversible.
        </p>
      </header>

      {searchParams?.error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {searchParams.error}
        </p>
      )}

      {/* Avertissement général */}
      <section className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Avant de continuer</p>
            <p className="mt-1 text-xs">
              Si tu veux juste faire une pause, tu n&apos;es pas obligé de
              supprimer ton compte. Tu peux désactiver tes notifications
              depuis la page{" "}
              <Link href="/notifications" className="underline">
                Notifications
              </Link>
              . Si tu veux conserver une copie de tes données avant
              suppression, télécharge-les depuis la{" "}
              <Link href="/profil/confidentialite" className="underline">
                page Confidentialité
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Ce qui sera supprimé */}
      <section className="mt-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Ce qui sera supprimé définitivement
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>
            Ton profil public (@{user.username}, avatar, bio, commune,
            téléphone)
          </li>
          <li>
            Tes <strong>{listingCount}</strong> annonce
            {listingCount > 1 ? "s" : ""} et les photos associées
          </li>
          <li>
            Tes <strong>{dealCount}</strong> bon{dealCount > 1 ? "s" : ""}{" "}
            plan{dealCount > 1 ? "s" : ""} et les images associées
          </li>
          <li>Tes favoris et tes alertes de recherche</li>
          <li>Tes votes sur les bons plans</li>
          <li>Tes notifications non lues</li>
          <li>Ton historique de karma et tes badges</li>
          <li>
            Tes commentaires <strong>sans réponse</strong> (
            {Math.max(0, commentCount)} au total, une partie peut être
            anonymisée — voir ci-dessous)
          </li>
          <li>Tes sessions actives (tu seras déconnecté de tous les appareils)</li>
        </ul>
      </section>

      {/* Ce qui sera anonymisé */}
      <section className="mt-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Ce qui sera anonymisé (remplacé par «&nbsp;[compte supprimé]&nbsp;»)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pour préserver la cohérence des échanges des autres utilisateurs,
          certains contenus ne peuvent pas être purement supprimés —
          sinon les réponses et messages des autres perdraient leur
          contexte. Ces contenus sont alors détachés de ton identité :
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>
            Tes commentaires auxquels d&apos;autres utilisateurs ont
            répondu
          </li>
          <li>
            Tes <strong>{messageCount}</strong> message
            {messageCount > 1 ? "s" : ""} privé
            {messageCount > 1 ? "s" : ""} (le contenu de tes messages
            envoyés est remplacé ; ceux reçus sont conservés pour
            l&apos;autre partie de la conversation)
          </li>
          <li>
            Tes signalements passés (pour préserver la trace de
            modération)
          </li>
        </ul>
      </section>

      {/* Formulaire de confirmation */}
      <form
        action={deleteMyAccountAction}
        className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4"
      >
        <h2 className="text-sm font-semibold text-red-900">
          Confirmation finale
        </h2>

        <label className="mt-3 flex items-start gap-2 text-sm text-red-900">
          <input
            type="checkbox"
            name="acknowledged"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-red-300 text-red-600 focus:ring-red-500"
          />
          <span>
            J&apos;ai compris que la suppression est{" "}
            <strong>définitive et immédiate</strong>, et que ni mon
            profil ni mes données ne pourront être restaurés.
          </span>
        </label>

        <div className="mt-3">
          <label
            htmlFor="confirmation"
            className="block text-xs font-medium text-red-900"
          >
            Tape <code className="rounded bg-white px-1 font-mono">SUPPRIMER</code>{" "}
            pour confirmer :
          </label>
          <input
            id="confirmation"
            name="confirmation"
            type="text"
            required
            autoComplete="off"
            autoCapitalize="characters"
            pattern="SUPPRIMER"
            placeholder="SUPPRIMER"
            className="mt-1 block w-full rounded-md border border-red-300 bg-white px-3 py-2 font-mono text-sm uppercase tracking-wider text-red-900 placeholder-red-300 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/profil/confidentialite"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium hover:bg-muted"
          >
            Annuler
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Supprimer définitivement mon compte
          </button>
        </div>
      </form>
    </main>
  );
}
