import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, Flame, MessageCircle, Sparkles, Tag } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import {
  fetchBadgesForUser,
  fetchContributorStats,
  fetchKarmaHistory,
} from "@/lib/gamification/queries";
import { LevelProgress } from "@/components/gamification/LevelProgress";
import { BadgesGrid } from "@/components/gamification/BadgesGrid";
import { KarmaHistoryList } from "@/components/gamification/KarmaHistoryList";

export const metadata: Metadata = {
  title: "Mes récompenses",
  description:
    "Ton niveau, tes badges et ton historique de karma sur Péyi — partage des bons plans et progresse !",
};

export default async function RecompensesPage() {
  const user = await requireUser("/profil/recompenses");

  const [history, badges, stats] = await Promise.all([
    fetchKarmaHistory(user.id),
    fetchBadgesForUser(user.id),
    fetchContributorStats(user.id),
  ]);

  // On résout les slugs des deals référencés dans l'historique en un
  // seul round-trip, puis on splice. C'est utile pour permettre à l'user
  // de cliquer sur une ligne et retomber sur son deal d'origine.
  const dealIds = Array.from(
    new Set(
      history
        .map((h) => h.dealId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const deals =
    dealIds.length > 0
      ? await prisma.deal.findMany({
          where: { id: { in: dealIds } },
          select: { id: true, slug: true },
        })
      : [];
  const slugByDealId = new Map(deals.map((d) => [d.id, d.slug]));
  const rows = history.map((h) => ({
    ...h,
    dealSlug: h.dealId ? slugByDealId.get(h.dealId) ?? null : null,
  }));

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        Retour au profil
      </Link>

      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Mes récompenses
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gagne du karma en partageant des bons plans, en votant et en
        commentant. Atteins de nouveaux niveaux et débloque des badges.
      </p>

      <div className="mt-6 space-y-6">
        <LevelProgress karma={user.karma} level={user.level} />

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">
            Mes contributions
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              icon={<Tag className="h-4 w-4" />}
              label="Bons plans"
              value={stats.dealsPublished}
              color="orange"
            />
            <StatTile
              icon={<Flame className="h-4 w-4" />}
              label="Deals hot (+100°)"
              value={stats.hotDeals}
              color="red"
            />
            <StatTile
              icon={<MessageCircle className="h-4 w-4" />}
              label="Commentaires"
              value={stats.commentsPosted}
              color="green"
            />
            <StatTile
              icon={<Sparkles className="h-4 w-4" />}
              label="Annonces"
              value={stats.listingsPublished}
              color="blue"
            />
          </div>
        </section>

        <BadgesGrid badges={badges} />

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">
            Historique récent
          </h2>
          <KarmaHistoryList rows={rows} />
        </section>

        <section className="rounded-xl border border-peyi-orange-200 bg-peyi-orange-50 p-4">
          <h2 className="font-display text-base font-bold text-peyi-orange-900">
            💡 Comment gagner du karma ?
          </h2>
          <ul className="mt-2 space-y-1.5 text-xs text-peyi-orange-900/90">
            <li>
              <strong>+5 karma</strong> pour chaque bon plan publié
            </li>
            <li>
              <strong>+1 karma</strong> à chaque 🔥 reçu sur un de tes deals
            </li>
            <li>
              <strong>+20 karma</strong> quand un deal dépasse +100°
            </li>
            <li>
              <strong>+50 karma</strong> quand un deal dépasse +500°
            </li>
            <li>
              <strong>+2 karma</strong> pour chaque commentaire utile
            </li>
          </ul>
          <Link
            href="/classement"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-peyi-orange-700 transition hover:text-peyi-orange-900"
          >
            Voir le classement des contributeurs →
          </Link>
        </section>
      </div>
    </main>
  );
}

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "orange" | "red" | "green" | "blue";
}) {
  const colors: Record<typeof color, string> = {
    orange: "bg-peyi-orange-100 text-peyi-orange-700",
    red: "bg-red-100 text-red-700",
    green: "bg-peyi-green-100 text-peyi-green-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors[color]}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-bold tabular-nums">
          {value.toLocaleString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
