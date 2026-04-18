import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Flag,
  MessageSquare,
  Newspaper,
  Tag,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Tableau de bord admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Page d'accueil de l'interface admin. Affiche des compteurs rapides
 * qui permettent de repérer visuellement une situation anormale (ex:
 * pile de signalements non traités qui s'accumule).
 *
 * Les requêtes sont `count()` — ultra-cheap, chacune est un scan d'index.
 * Envoi parallèle pour que la page se rende en ~1 aller-retour.
 */
export default async function AdminDashboardPage() {
  const [
    listingsCount,
    dealsCount,
    commentsCount,
    messagesCount,
    usersCount,
    bannedCount,
    pendingReports,
  ] = await Promise.all([
    prisma.listing.count(),
    prisma.deal.count(),
    prisma.comment.count({ where: { isDeleted: false } }),
    prisma.message.count(),
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.report.count({ where: { status: ReportStatus.PENDING } }),
  ]);

  const cards: Array<{
    href: string;
    label: string;
    value: number;
    icon: typeof Tag;
    tone?: "default" | "warn";
    hint?: string;
  }> = [
    { href: "/admin/signalements", label: "Signalements en attente", value: pendingReports, icon: Flag, tone: pendingReports > 0 ? "warn" : "default", hint: "À traiter" },
    { href: "/admin/annonces", label: "Annonces", value: listingsCount, icon: Tag },
    { href: "/admin/bons-plans", label: "Bons plans", value: dealsCount, icon: Newspaper },
    { href: "/admin/commentaires", label: "Commentaires", value: commentsCount, icon: MessageSquare, hint: "hors supprimés" },
    { href: "/admin/messages", label: "Messages", value: messagesCount, icon: MessageSquare },
    { href: "/admin/utilisateurs", label: "Utilisateurs", value: usersCount, icon: Users, hint: bannedCount > 0 ? `${bannedCount} banni${bannedCount > 1 ? "s" : ""}` : undefined },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d&apos;ensemble de la modération. Les chiffres sont recalculés
          à chaque chargement.
        </p>
      </header>

      {pendingReports > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-peyi-orange-300 bg-peyi-orange-50 px-4 py-3 text-sm">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-peyi-orange-600"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-semibold text-peyi-orange-900">
              {pendingReports} signalement{pendingReports > 1 ? "s" : ""} en
              attente
            </p>
            <p className="mt-0.5 text-peyi-orange-800">
              <Link
                href="/admin/signalements"
                className="underline underline-offset-2"
              >
                Traite la queue
              </Link>{" "}
              pour garder la qualité de la plateforme.
            </p>
          </div>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isWarn = card.tone === "warn";
          return (
            <li key={card.href}>
              <Link
                href={card.href}
                className={
                  "block rounded-lg border p-4 transition " +
                  (isWarn
                    ? "border-peyi-orange-300 bg-peyi-orange-50 hover:border-peyi-orange-400"
                    : "border-border bg-card hover:border-peyi-orange-300")
                }
              >
                <div className="flex items-center justify-between">
                  <Icon
                    className={
                      "h-5 w-5 " +
                      (isWarn
                        ? "text-peyi-orange-600"
                        : "text-muted-foreground")
                    }
                    aria-hidden
                  />
                </div>
                <p className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {card.value.toLocaleString("fr-FR")}
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {card.label}
                </p>
                {card.hint && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {card.hint}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
