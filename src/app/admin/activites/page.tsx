import type { Metadata } from "next";
import Link from "next/link";
import { ActivityStatus, UserRole, type Prisma } from "@prisma/client";
import { ExternalLink, Eye, Plus, Search } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { ACTIVITY_CATEGORIES, ACTIVITY_STATUSES } from "@/lib/activities/labels";
import { cn } from "@/lib/utils";
import {
  adminDeleteActivityAction,
  adminSetActivityStatusAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Gestion des activités",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = {
  q?: string;
  statut?: string;
  page?: string;
  success?: string;
  error?: string;
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function parseStatus(raw: string | undefined): ActivityStatus | null {
  return raw && raw in ActivityStatus ? (raw as ActivityStatus) : null;
}

const STATUS_BADGE: Record<ActivityStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_REVIEW: "bg-warning/15 text-ink-700",
  PUBLISHED: "bg-peyi-green-50 text-peyi-green-700",
  HIDDEN: "bg-destructive/10 text-destructive",
};

/** Transitions proposées depuis chaque statut (workflow de modération). */
const NEXT_STATUSES: Record<ActivityStatus, ActivityStatus[]> = {
  DRAFT: [ActivityStatus.PENDING_REVIEW, ActivityStatus.PUBLISHED],
  PENDING_REVIEW: [ActivityStatus.PUBLISHED, ActivityStatus.DRAFT],
  PUBLISHED: [ActivityStatus.HIDDEN],
  HIDDEN: [ActivityStatus.PUBLISHED, ActivityStatus.DRAFT],
};

const STATUS_ACTION_LABEL: Record<ActivityStatus, string> = {
  DRAFT: "→ Brouillon",
  PENDING_REVIEW: "Soumettre",
  PUBLISHED: "Publier",
  HIDDEN: "Masquer",
};

export default async function AdminActivitiesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(UserRole.ADMIN, "/admin/activites");

  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() || "";
  const statut = parseStatus(searchParams.statut);
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.ActivityWhereInput = {
    ...(statut ? { status: statut } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            {
              city: {
                name: { contains: q, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        category: true,
        viewCount: true,
        updatedAt: true,
        city: { select: { name: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseParams = {
    ...(q && { q }),
    ...(statut && { statut }),
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Activités
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString("fr-FR")} activité{total > 1 ? "s" : ""}
            {q ? ` — filtré sur « ${q} »` : ""}
            {statut ? ` — statut ${ACTIVITY_STATUSES[statut].label}` : ""}.
          </p>
        </div>
        <Link
          href="/admin/activites/nouveau"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-peyi-orange-600"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouvelle activité
        </Link>
      </header>

      {searchParams.success && (
        <p className="rounded-md border border-peyi-green-300 bg-peyi-green-50 px-3 py-2 text-sm text-peyi-green-900">
          {searchParams.success}
        </p>
      )}
      {searchParams.error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {searchParams.error}
        </p>
      )}

      <form className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nom, slug ou commune…"
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
          />
        </div>
        <select
          name="statut"
          defaultValue={statut ?? ""}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(ACTIVITY_STATUSES) as ActivityStatus[]).map((value) => (
            <option key={value} value={value}>
              {ACTIVITY_STATUSES[value].label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-peyi-orange-600"
        >
          Filtrer
        </button>
      </form>

      {activities.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Aucune activité. Lance le seed (`npm run db:seed-activites`) ou crée
          la première fiche.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center lg:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/activites/${activity.id}`}
                    className="truncate font-medium text-foreground hover:text-peyi-orange-700"
                  >
                    {activity.name}
                  </Link>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                      STATUS_BADGE[activity.status],
                    )}
                  >
                    {ACTIVITY_STATUSES[activity.status].label}
                  </span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>
                    {ACTIVITY_CATEGORIES[activity.category].emoji}{" "}
                    {ACTIVITY_CATEGORIES[activity.category].label}
                  </span>
                  <span>·</span>
                  <span>{activity.city.name}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Eye className="h-3 w-3" aria-hidden />
                    {activity.viewCount}
                  </span>
                  <span>·</span>
                  <span>
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(activity.updatedAt)}
                  </span>
                  {activity.status === "PUBLISHED" && (
                    <>
                      <span>·</span>
                      <Link
                        href={`/activites/${activity.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 hover:text-peyi-orange-700"
                      >
                        Voir la fiche
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    </>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Link
                  href={`/admin/activites/${activity.id}`}
                  className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold hover:border-peyi-orange-300"
                >
                  Modifier
                </Link>
                {NEXT_STATUSES[activity.status].map((next) => (
                  <form key={next} action={adminSetActivityStatusAction}>
                    <input
                      type="hidden"
                      name="activityId"
                      value={activity.id}
                    />
                    <input type="hidden" name="status" value={next} />
                    <button
                      type="submit"
                      className={cn(
                        "inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold",
                        next === "PUBLISHED"
                          ? "bg-peyi-green-600 text-white hover:bg-peyi-green-700"
                          : "border border-border hover:border-peyi-orange-300",
                      )}
                    >
                      {STATUS_ACTION_LABEL[next]}
                    </button>
                  </form>
                ))}
                <form action={adminDeleteActivityAction}>
                  <input type="hidden" name="activityId" value={activity.id} />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          className="flex items-center justify-between pt-2 text-sm"
          aria-label="Pagination"
        >
          {page > 1 ? (
            <Link
              href={`/admin/activites?${new URLSearchParams({ ...baseParams, page: String(page - 1) }).toString()}`}
              className="rounded-md border border-border px-3 py-1.5 hover:border-peyi-orange-300"
            >
              ← Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={`/admin/activites?${new URLSearchParams({ ...baseParams, page: String(page + 1) }).toString()}`}
              className="rounded-md border border-border px-3 py-1.5 hover:border-peyi-orange-300"
            >
              Suivant →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
