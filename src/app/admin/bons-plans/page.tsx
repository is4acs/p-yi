import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Flame, Search } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { adminDeleteDealAction } from "./actions";

export const metadata: Metadata = {
  title: "Modération des bons plans",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = {
  q?: string;
  page?: string;
  success?: string;
  error?: string;
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export default async function AdminDealsPage(
  props: {
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() || "";
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
          { author: { username: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        temperature: true,
        commentCount: true,
        createdAt: true,
        author: { select: { username: true } },
      },
    }),
    prisma.deal.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Bons plans
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total.toLocaleString("fr-FR")} bon{total > 1 ? "s" : ""} plan
          {total > 1 ? "s" : ""} au total
          {q ? ` — filtré sur « ${q} »` : ""}.
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

      <form className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Titre, slug ou @username…"
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-peyi-orange-600"
        >
          Filtrer
        </button>
      </form>

      {deals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Aucun bon plan.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {deals.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/bons-plans/${d.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:text-peyi-orange-700"
                >
                  <span className="truncate">{d.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>@{d.author.username}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Flame className="h-3 w-3" aria-hidden />
                    {d.temperature}
                  </span>
                  <span>·</span>
                  <span>{d.commentCount} comm.</span>
                  <span>·</span>
                  <span>
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(d.createdAt)}
                  </span>
                </p>
              </div>

              <form action={adminDeleteDealAction} className="shrink-0">
                <input type="hidden" name="dealId" value={d.id} />
                <input
                  type="text"
                  name="reason"
                  placeholder="Motif (optionnel)"
                  className="h-8 w-44 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                />
                <button
                  type="submit"
                  className="ml-2 inline-flex h-8 items-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Supprimer
                </button>
              </form>
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
              href={`/admin/bons-plans?${new URLSearchParams({ ...(q && { q }), page: String(page - 1) }).toString()}`}
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
              href={`/admin/bons-plans?${new URLSearchParams({ ...(q && { q }), page: String(page + 1) }).toString()}`}
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
