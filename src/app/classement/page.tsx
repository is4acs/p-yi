import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Trophy } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { LEVEL_META } from "@/lib/gamification/levels";
import {
  fetchLeaderboard,
  fetchUserRank,
  type LeaderboardEntry,
} from "@/lib/gamification/queries";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Classement des contributeurs",
  description:
    "Les Péyi-lovers qui partagent le plus de bons plans en Guyane. Grimpe dans le classement en participant !",
  alternates: { canonical: "/classement" },
};

export const dynamic = "force-dynamic";

export default async function ClassementPage() {
  const me = await getCurrentUser();
  const [entries, myRank] = await Promise.all([
    fetchLeaderboard(50),
    me ? fetchUserRank(me.id) : Promise.resolve(null),
  ]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
          <Trophy className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Top contributeurs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les membres qui font vivre Péyi en partageant les meilleurs bons
            plans de Guyane.
          </p>
        </div>
      </header>

      {myRank && me && (
        <div className="mt-5 rounded-lg border border-peyi-orange-200 bg-peyi-orange-50 p-3 text-sm">
          <p className="text-peyi-orange-900">
            Tu es{" "}
            <span className="font-bold">
              #{myRank.rank} sur {myRank.total}
            </span>{" "}
            contributeurs actifs avec{" "}
            <span className="font-bold tabular-nums">
              {me.karma.toLocaleString("fr-FR")}
            </span>{" "}
            karma.{" "}
            <Link
              href="/profil/recompenses"
              className="font-semibold underline"
            >
              Voir mes récompenses
            </Link>
          </p>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 space-y-6">
          {top3.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">🏆 Podium</h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {top3.map((entry) => (
                  <li key={entry.id}>
                    <PodiumCard entry={entry} isMe={me?.id === entry.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">Top 50</h2>
              <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
                {rest.map((entry) => (
                  <li key={entry.id}>
                    <LeaderboardRow entry={entry} isMe={me?.id === entry.id} />
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function PodiumCard({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
}) {
  const medal = ["🥇", "🥈", "🥉"][entry.rank - 1] ?? "🏅";
  const levelMeta = LEVEL_META[entry.level];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        isMe
          ? "border-peyi-orange-400 bg-peyi-orange-50"
          : "border-peyi-orange-200 bg-card",
      )}
    >
      <span className="text-2xl" aria-hidden>
        {medal}
      </span>
      <UserAvatar
        username={entry.username}
        avatarUrl={entry.avatarUrl}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">@{entry.username}</p>
        <p className="text-[11px] text-muted-foreground">
          {levelMeta.emoji} {levelMeta.label}
        </p>
      </div>
      <p className="text-right text-sm font-bold tabular-nums text-peyi-orange-600">
        {entry.karma.toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function LeaderboardRow({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
}) {
  const levelMeta = LEVEL_META[entry.level];
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 transition",
        isMe ? "bg-peyi-orange-50" : "hover:bg-peyi-orange-50/40",
      )}
    >
      <span
        className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground"
        aria-hidden
      >
        #{entry.rank}
      </span>
      <UserAvatar
        username={entry.username}
        avatarUrl={entry.avatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          @{entry.username}
          {isMe && (
            <span className="ml-1.5 rounded-full bg-peyi-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Toi
            </span>
          )}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>
            {levelMeta.emoji} {levelMeta.label}
          </span>
          {entry.cityName && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden />
                {entry.cityName}
              </span>
            </>
          )}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums text-peyi-orange-600">
        {entry.karma.toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
      <p className="text-sm font-medium">
        Personne n&apos;a encore de karma sur Péyi.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sois le premier à partager un bon plan !
      </p>
      <Link
        href="/poster"
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
      >
        Poster un bon plan
      </Link>
    </div>
  );
}
