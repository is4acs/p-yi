import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ExternalLink, X } from "lucide-react";
import { ReportReason, ReportStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { adminResolveReportAction } from "./actions";

export const metadata: Metadata = {
  title: "Signalements",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = {
  status?: "pending" | "resolved" | "dismissed" | "all";
  page?: string;
  success?: string;
  error?: string;
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

const REASON_LABEL: Record<ReportReason, string> = {
  SCAM: "Arnaque",
  DUPLICATE: "Doublon",
  OFFENSIVE: "Offensant",
  FAKE_PRICE: "Prix faux",
  EXPIRED: "Expiré",
  WRONG_CATEGORY: "Mauvaise catégorie",
  SPAM: "Spam",
  ILLEGAL: "Illégal",
  OTHER: "Autre",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: "En attente",
  REVIEWING: "En cours",
  RESOLVED: "Résolu",
  DISMISSED: "Rejeté",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const status = searchParams.status || "pending";
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where =
    status === "pending"
      ? { status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWING] } }
      : status === "resolved"
      ? { status: ReportStatus.RESOLVED }
      : status === "dismissed"
      ? { status: ReportStatus.DISMISSED }
      : {};

  const [reports, total, counts] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        reason: true,
        description: true,
        status: true,
        action: true,
        createdAt: true,
        reviewedAt: true,
        reporter: { select: { username: true } },
        reportedUser: { select: { username: true, id: true } },
        deal: { select: { slug: true, title: true } },
        listing: { select: { slug: true, title: true } },
        comment: {
          select: {
            id: true,
            content: true,
            deal: { select: { slug: true } },
          },
        },
      },
    }),
    prisma.report.count({ where }),
    prisma.report.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Partial<Record<ReportStatus, number>>;

  const pendingCount =
    (countByStatus.PENDING || 0) + (countByStatus.REVIEWING || 0);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabs: { key: SearchParams["status"]; label: string; badge?: number }[] =
    [
      {
        key: "pending",
        label: "À traiter",
        badge: pendingCount,
      },
      { key: "resolved", label: "Résolus", badge: countByStatus.RESOLVED },
      { key: "dismissed", label: "Rejetés", badge: countByStatus.DISMISSED },
      { key: "all", label: "Tous" },
    ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Signalements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          File d&apos;attente des signalements utilisateurs.
        </p>
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

      <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Filtres">
        {tabs.map((t) => {
          const isActive = status === t.key;
          return (
            <Link
              key={t.key}
              href={`/admin/signalements?${new URLSearchParams(
                t.key !== "pending" ? { status: t.key as string } : {},
              ).toString()}`}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium ${
                isActive
                  ? "border-peyi-orange-500 bg-peyi-orange-50 text-peyi-orange-900"
                  : "border-border bg-background text-muted-foreground hover:border-peyi-orange-300"
              }`}
            >
              {t.label}
              {t.badge && t.badge > 0 ? (
                <span
                  className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    isActive
                      ? "bg-peyi-orange-500 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {t.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Aucun signalement dans cette vue.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => {
            const isPending =
              r.status === ReportStatus.PENDING ||
              r.status === ReportStatus.REVIEWING;
            const targetLink =
              r.listing
                ? {
                    href: `/annonces/${r.listing.slug}`,
                    label: r.listing.title,
                    kind: "annonce",
                  }
                : r.deal
                ? {
                    href: `/bons-plans/${r.deal.slug}`,
                    label: r.deal.title,
                    kind: "bon plan",
                  }
                : r.comment?.deal
                ? {
                    href: `/bons-plans/${r.comment.deal.slug}#comment-${r.comment.id}`,
                    label:
                      r.comment.content.slice(0, 60) +
                      (r.comment.content.length > 60 ? "…" : ""),
                    kind: "commentaire",
                  }
                : r.reportedUser
                ? {
                    href: `/u/${r.reportedUser.username}`,
                    label: `@${r.reportedUser.username}`,
                    kind: "utilisateur",
                  }
                : null;

            return (
              <li
                key={r.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 font-medium text-red-900">
                      {REASON_LABEL[r.reason]}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-medium text-foreground">
                      {STATUS_LABEL[r.status]}
                    </span>
                    {targetLink && (
                      <span className="text-muted-foreground">
                        sur{" "}
                        <Link
                          href={targetLink.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-foreground hover:text-peyi-orange-700"
                        >
                          <span className="truncate max-w-[260px] inline-block align-bottom">
                            {targetLink.kind} : {targetLink.label}
                          </span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                        </Link>
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(r.createdAt)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Signalé par <span className="font-medium text-foreground">@{r.reporter.username}</span>
                </p>

                {r.description && (
                  <p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                    {r.description}
                  </p>
                )}

                {!isPending && r.action && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Action enregistrée :{" "}
                    <span className="font-medium text-foreground">{r.action}</span>
                    {r.reviewedAt && (
                      <>
                        {" · "}
                        le{" "}
                        {new Intl.DateTimeFormat("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(r.reviewedAt)}
                      </>
                    )}
                  </p>
                )}

                {isPending && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form
                      action={adminResolveReportAction}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="reportId" value={r.id} />
                      <input
                        type="text"
                        name="resolution"
                        placeholder="Action (ex. supprimé, averti, banni 7j)"
                        className="h-8 w-64 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-peyi-green-500"
                      />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-peyi-green-600 px-2.5 text-xs font-semibold text-white hover:bg-peyi-green-700"
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> Résoudre
                      </button>
                    </form>
                    <form action={adminResolveReportAction}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <input type="hidden" name="dismiss" value="1" />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-muted-foreground hover:border-red-300 hover:text-red-700"
                      >
                        <X className="h-3 w-3" aria-hidden /> Rejeter
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          className="flex items-center justify-between pt-2 text-sm"
          aria-label="Pagination"
        >
          {page > 1 ? (
            <Link
              href={`/admin/signalements?${new URLSearchParams({
                ...(status !== "pending" && { status: status as string }),
                page: String(page - 1),
              }).toString()}`}
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
              href={`/admin/signalements?${new URLSearchParams({
                ...(status !== "pending" && { status: status as string }),
                page: String(page + 1),
              }).toString()}`}
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
