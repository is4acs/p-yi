import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, History, Send } from "lucide-react";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";

import { adminBroadcastNotificationAction } from "./actions";

export const metadata: Metadata = {
  title: "Broadcasts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = {
  success?: string;
  error?: string;
};

/**
 * Outil admin de broadcast de notifications SYSTEM / PROMOTIONAL.
 *
 * Usage typique :
 *  - SYSTEM   : maintenance prévue, changement de CGU, annonce importante
 *  - PROMOTIONAL : campagne saisonnière ("Black Friday"), nouvelle feature
 *
 * Pré-calcul des audiences à chaque chargement (count × 4, index scan,
 * ~ms). L'admin voit immédiatement combien de personnes va recevoir
 * avant de valider.
 */
export default async function AdminBroadcastPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(UserRole.ADMIN, "/admin/notifications");
  const searchParams = await props.searchParams;

  const [countAll, countUser, countPro, countAmbassador] = await Promise.all([
    prisma.user.count({ where: { isBanned: false } }),
    prisma.user.count({ where: { isBanned: false, role: UserRole.USER } }),
    prisma.user.count({ where: { isBanned: false, role: UserRole.PRO } }),
    prisma.user.count({
      where: { isBanned: false, role: UserRole.AMBASSADOR },
    }),
  ]);

  const audiences = [
    { value: "all", label: "Tous les utilisateurs", count: countAll },
    { value: "role:USER", label: "Utilisateurs standard", count: countUser },
    { value: "role:PRO", label: "Comptes Pro", count: countPro },
    {
      value: "role:AMBASSADOR",
      label: "Ambassadeurs",
      count: countAmbassador,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Broadcasts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envoie une notification SYSTEM ou PROMOTIONAL à un segment
            d&apos;utilisateurs. Chaque destinataire reçoit une entrée
            in-app, un push (si activé) et un email (si activé).
          </p>
        </div>
        <Link
          href="/admin/logs?action=BROADCAST_NOTIFICATION"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          <History className="h-4 w-4" aria-hidden />
          Historique
        </Link>
      </header>

      {searchParams.success && (
        <div className="rounded-lg border border-peyi-green-300 bg-peyi-green-50 px-4 py-3 text-sm text-peyi-green-900">
          {searchParams.success}
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {searchParams.error}
        </div>
      )}

      <div className="rounded-lg border border-peyi-orange-200 bg-peyi-orange-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-peyi-orange-600"
            aria-hidden
          />
          <div className="text-sm text-peyi-orange-900">
            <p className="font-semibold">Action irréversible.</p>
            <p className="mt-1">
              Un broadcast déclenche un push et un email pour chaque
              destinataire qui a activé ces canaux. Pas de brouillon, pas
              d&apos;annulation après envoi. Relis ton titre + message avant
              de valider.
            </p>
          </div>
        </div>
      </div>

      <form action={adminBroadcastNotificationAction} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground">
            Type
          </label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-peyi-orange-300">
              <input
                type="radio"
                name="type"
                value="SYSTEM"
                required
                defaultChecked
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  SYSTEM
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Annonce technique (maintenance, CGU, incident…).
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-peyi-orange-300">
              <input
                type="radio"
                name="type"
                value="PROMOTIONAL"
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  PROMOTIONAL
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Campagne marketing, nouvelle feature.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label
            htmlFor="audience"
            className="block text-sm font-semibold text-foreground"
          >
            Audience
          </label>
          <select
            id="audience"
            name="audience"
            required
            defaultValue="all"
            className="mt-2 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {audiences.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label} — {a.count.toLocaleString("fr-FR")} personne
                {a.count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Les comptes bannis sont automatiquement exclus.
          </p>
        </div>

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-foreground"
          >
            Titre <span className="text-muted-foreground">(max 80)</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={80}
            placeholder="Ex: Maintenance prévue dimanche 21h"
            className="mt-2 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-semibold text-foreground"
          >
            Message <span className="text-muted-foreground">(max 500)</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={500}
            rows={5}
            placeholder="Le site sera indisponible 30 minutes pour mise à jour…"
            className="mt-2 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="actionPath"
            className="block text-sm font-semibold text-foreground"
          >
            Lien (optionnel)
          </label>
          <input
            id="actionPath"
            name="actionPath"
            type="text"
            pattern="^/.*"
            maxLength={200}
            placeholder="/a-propos"
            className="mt-2 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Chemin relatif commençant par <code>/</code>. Affiche un bouton
            « Voir sur Péyi » dans l&apos;email et ouvre l&apos;URL au clic
            sur la notif push.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <input
            type="checkbox"
            name="confirmed"
            value="1"
            required
            className="mt-0.5"
          />
          <span className="text-sm text-foreground">
            Je confirme avoir relu le titre et le message, et je comprends
            que l&apos;envoi est immédiat et irréversible.
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-peyi-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
        >
          <Send className="h-4 w-4" aria-hidden />
          Envoyer le broadcast
        </button>
      </form>
    </div>
  );
}
