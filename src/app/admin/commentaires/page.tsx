import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { adminDeleteCommentAction } from "./actions";

export const metadata: Metadata = {
  title: "Modération des commentaires",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

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

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = searchParams.q?.trim() || "";
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    isDeleted: false,
    ...(q
      ? {
          OR: [
            { content: { contains: q, mode: "insensitive" as const } },
            {
              author: {
                username: { contains: q, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { username: true } },
        deal: { select: { slug: true, title: true } },
      },
    }),
    prisma.comment.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Commentaires
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total.toLocaleString("fr-FR")} commentaire{total > 1 ? "s" : ""}{" "}
          visible{total > 1 ? "s" : ""}
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
            placeholder="Contenu ou @username…"
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

      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Aucun commentaire.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-card p-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {c.content}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span>@{c.author.username}</span>
                  {c.deal && (
                    <>
                      <span>·</span>
                      <Link
                        href={`/bons-plans/${c.deal.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-peyi-orange-700"
                      >
                        <span className="truncate max-w-[220px]">
                          {c.deal.title}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                      </Link>
                    </>
                  )}
                  <span>·</span>
                  <span>
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(c.createdAt)}
                  </span>
                </div>
                <form action={adminDeleteCommentAction} className="flex items-center gap-2">
                  <input type="hidden" name="commentId" value={c.id} />
                  <input
                    type="text"
                    name="reason"
                    placeholder="Motif"
                    className="h-7 w-32 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-7 items-center rounded-md bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700"
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
              href={`/admin/commentaires?${new URLSearchParams({ ...(q && { q }), page: String(page - 1) }).toString()}`}
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
              href={`/admin/commentaires?${new URLSearchParams({ ...(q && { q }), page: String(page + 1) }).toString()}`}
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
