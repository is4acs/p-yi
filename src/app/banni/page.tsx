import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Compte suspendu",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Page d'information affichée quand un utilisateur banni tente une
 * action d'écriture. Elle montre le motif et la durée du ban, avec un
 * lien vers le formulaire de contact si l'utilisateur conteste.
 *
 * Si la personne n'est pas connectée, on redirige vers l'accueil — pas
 * de raison d'exposer cette page à qui n'est pas concerné.
 * Si elle est connectée mais pas bannie, idem — on évite les
 * screenshot mis en scène.
 */
export default async function BannedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.isBanned) redirect("/");

  // Auto-débannissement si le ban temporaire est expiré (même logique
  // que requireActiveUser — on évite qu'un utilisateur qui consulte
  // cette page voie un message obsolète).
  if (user.bannedUntil && user.bannedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isBanned: false,
        bannedUntil: null,
        banReason: null,
      },
    });
    redirect("/");
  }

  const isTemporary = Boolean(user.bannedUntil);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            <Ban className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-red-900">
              Compte suspendu
            </h1>
            <p className="text-sm text-red-800">@{user.username}</p>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm text-red-900">
          <p>
            Ton compte est actuellement suspendu — tu peux continuer à
            naviguer sur Péyi, mais tu ne peux plus publier d&apos;annonce,
            voter, commenter ni envoyer de messages.
          </p>

          {isTemporary && user.bannedUntil ? (
            <p className="rounded-md border border-red-300 bg-white px-3 py-2">
              <strong>Durée :</strong> jusqu&apos;au{" "}
              {new Intl.DateTimeFormat("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(user.bannedUntil)}
              .
            </p>
          ) : (
            <p className="rounded-md border border-red-300 bg-white px-3 py-2">
              <strong>Durée :</strong> permanent.
            </p>
          )}

          {user.banReason && (
            <p className="rounded-md border border-red-300 bg-white px-3 py-2">
              <strong>Motif :</strong> {user.banReason}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a
            href="mailto:contact@peyi.gf?subject=Contestation de suspension"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-900 hover:bg-red-100"
          >
            Contester
          </a>
          <Link
            href="/"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
