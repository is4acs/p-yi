import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Flag,
  MessageSquare,
  Newspaper,
  Tag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { DealStatus, ListingStatus, ReportStatus } from "@prisma/client";

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
// Fenêtres temporelles pour les KPIs. On compare 7 derniers jours vs
// les 7 précédents pour faire ressortir une tendance lisible sans
// graphe. Les bornes sont strictes (ne se chevauchent pas) pour que
// la somme des deux = 14 derniers jours.
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  const now = new Date();
  const since24h = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since14d = new Date(now.getTime() - 14 * DAY_MS);

  const [
    listingsCount,
    dealsCount,
    commentsCount,
    messagesCount,
    usersCount,
    bannedCount,
    pendingReports,
    // KPIs 7j / J-7..J-14
    dau,
    signups7d,
    signupsPrev7d,
    deals7d,
    dealsPrev7d,
    listings7d,
    listingsPrev7d,
  ] = await Promise.all([
    prisma.listing.count(),
    prisma.deal.count(),
    prisma.comment.count({ where: { isDeleted: false } }),
    prisma.message.count(),
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.report.count({ where: { status: ReportStatus.PENDING } }),
    // Daily active users : approximation via `lastActiveAt` — touché à
    // chaque requête server action authentifiée. Suffit pour un ordre
    // de grandeur, pas besoin de table `session_events` séparée tant
    // qu'on reste < 10k users.
    prisma.user.count({ where: { lastActiveAt: { gt: since24h } } }),
    prisma.user.count({ where: { createdAt: { gt: since7d } } }),
    prisma.user.count({
      where: { createdAt: { gt: since14d, lte: since7d } },
    }),
    prisma.deal.count({
      where: { createdAt: { gt: since7d }, status: DealStatus.PUBLISHED },
    }),
    prisma.deal.count({
      where: {
        createdAt: { gt: since14d, lte: since7d },
        status: DealStatus.PUBLISHED,
      },
    }),
    prisma.listing.count({
      where: { createdAt: { gt: since7d }, status: ListingStatus.PUBLISHED },
    }),
    prisma.listing.count({
      where: {
        createdAt: { gt: since14d, lte: since7d },
        status: ListingStatus.PUBLISHED,
      },
    }),
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

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">
          7 derniers jours
        </h2>
        <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { label: "DAU", value: dau, prev: null, hint: "actifs 24h" },
              {
                label: "Inscriptions",
                value: signups7d,
                prev: signupsPrev7d,
                hint: "7 j",
              },
              {
                label: "Bons plans",
                value: deals7d,
                prev: dealsPrev7d,
                hint: "7 j · publiés",
              },
              {
                label: "Annonces",
                value: listings7d,
                prev: listingsPrev7d,
                hint: "7 j · publiées",
              },
            ] as const
          ).map((k) => {
            // Variation vs 7j précédents : positive = vert, négative =
            // rouge. On ne s'affole pas pour les petites variations
            // (<5%) qui sont dans le bruit statistique d'une petite
            // base d'users.
            const delta =
              k.prev == null
                ? null
                : k.prev === 0
                ? k.value > 0
                  ? 100
                  : 0
                : Math.round(((k.value - k.prev) / k.prev) * 100);
            const tone =
              delta == null
                ? "neutral"
                : delta > 5
                ? "up"
                : delta < -5
                ? "down"
                : "flat";
            return (
              <li
                key={k.label}
                className="rounded-lg border border-border bg-card p-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
                <p className="mt-2 font-display text-2xl font-bold tracking-tight">
                  {k.value.toLocaleString("fr-FR")}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  {tone === "up" && (
                    <TrendingUp
                      className="h-3 w-3 text-peyi-green-600"
                      aria-hidden
                    />
                  )}
                  {tone === "down" && (
                    <TrendingDown className="h-3 w-3 text-red-600" aria-hidden />
                  )}
                  {delta != null && (
                    <span
                      className={
                        tone === "up"
                          ? "font-semibold text-peyi-green-700"
                          : tone === "down"
                          ? "font-semibold text-red-700"
                          : ""
                      }
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}%
                    </span>
                  )}
                  <span>{k.hint}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </section>

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
