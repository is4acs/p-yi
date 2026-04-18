import type { Metadata } from "next";
import Link from "next/link";
import { Search, ShieldAlert, ShieldOff, Ban, Undo2 } from "lucide-react";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { formatRole, isSuperAdmin } from "@/lib/admin/roles";
import {
  adminBanUserAction,
  adminToggleShadowBanAction,
  adminUnbanUserAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Utilisateurs",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = {
  q?: string;
  page?: string;
  success?: string;
  error?: string;
  filter?: "all" | "banned" | "shadow" | "staff";
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // MODERATOR minimum pour voir la liste. On affichera les actions de
  // rôle (promouvoir/rétrograder) seulement si super-admin.
  const admin = await requireRole(UserRole.MODERATOR, "/admin/utilisateurs");

  const q = searchParams.q?.trim() || "";
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;
  const filter = searchParams.filter || "all";

  const where = {
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { fullName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(filter === "banned" ? { isBanned: true } : {}),
    ...(filter === "shadow" ? { shadowBanned: true } : {}),
    ...(filter === "staff"
      ? {
          role: {
            in: [UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
          },
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBanned: true,
        bannedUntil: true,
        banReason: true,
        shadowBanned: true,
        reportCount: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
            deals: true,
            comments: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filters: { key: SearchParams["filter"]; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "banned", label: "Bannis" },
    { key: "shadow", label: "Shadow" },
    { key: "staff", label: "Staff" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Utilisateurs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString("fr-FR")} compte{total > 1 ? "s" : ""}
            {q ? ` — filtré sur « ${q} »` : ""}.
          </p>
        </div>
        {isSuperAdmin(admin) && (
          <Link
            href="/admin/utilisateurs/roles"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-peyi-orange-300 bg-peyi-orange-50 px-3 text-sm font-medium text-peyi-orange-900 hover:bg-peyi-orange-100"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Gérer les rôles
          </Link>
        )}
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

      <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Username, email, nom…"
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {filters.map((f) => {
            const isActive = filter === f.key;
            return (
              <Link
                key={f.key}
                href={`/admin/utilisateurs?${new URLSearchParams({
                  ...(q && { q }),
                  ...(f.key !== "all" && { filter: f.key as string }),
                }).toString()}`}
                className={`inline-flex h-9 shrink-0 items-center rounded-md border px-3 text-xs font-medium ${
                  isActive
                    ? "border-peyi-orange-500 bg-peyi-orange-50 text-peyi-orange-900"
                    : "border-border bg-background text-muted-foreground hover:border-peyi-orange-300"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-peyi-orange-600"
        >
          Filtrer
        </button>
      </form>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Aucun utilisateur.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => {
            const isSelf = u.id === admin.id;
            const isBannedActive =
              u.isBanned && (!u.bannedUntil || u.bannedUntil > new Date());
            return (
              <li
                key={u.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        @{u.username}
                      </span>
                      {u.role !== UserRole.USER && (
                        <span className="inline-flex items-center rounded-full border border-peyi-orange-300 bg-peyi-orange-50 px-2 py-0.5 text-xs font-medium text-peyi-orange-900">
                          {formatRole(u.role)}
                        </span>
                      )}
                      {isBannedActive && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-900">
                          <Ban className="h-3 w-3" aria-hidden /> Banni
                          {u.bannedUntil
                            ? ` jusqu'au ${new Intl.DateTimeFormat("fr-FR", {
                                day: "2-digit",
                                month: "short",
                              }).format(u.bannedUntil)}`
                            : ""}
                        </span>
                      )}
                      {u.shadowBanned && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                          <ShieldOff className="h-3 w-3" aria-hidden /> Shadow
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-xs text-muted-foreground">
                          (toi)
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="truncate max-w-[240px]">{u.email}</span>
                      <span>·</span>
                      <span>
                        inscrit le{" "}
                        {new Intl.DateTimeFormat("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(u.createdAt)}
                      </span>
                      <span>·</span>
                      <span>
                        {u._count.listings} annonces · {u._count.deals} bons
                        plans · {u._count.comments} comm.
                      </span>
                      {u.reportCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-red-700">
                            {u.reportCount} signalement{u.reportCount > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </p>
                    {u.banReason && (
                      <p className="mt-1 text-xs italic text-red-800">
                        Motif ban : {u.banReason}
                      </p>
                    )}
                  </div>

                  {!isSelf && (
                    <div className="flex flex-col gap-2 sm:items-end">
                      {isBannedActive ? (
                        <form action={adminUnbanUserAction} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <input
                            type="text"
                            name="reason"
                            placeholder="Motif (optionnel)"
                            className="h-7 w-36 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-peyi-green-500"
                          />
                          <button
                            type="submit"
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-peyi-green-600 px-2.5 text-xs font-semibold text-white hover:bg-peyi-green-700"
                          >
                            <Undo2 className="h-3 w-3" aria-hidden /> Débannir
                          </button>
                        </form>
                      ) : (
                        <form action={adminBanUserAction} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <input
                            type="number"
                            name="days"
                            min={0}
                            placeholder="Jours"
                            className="h-7 w-16 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                          />
                          <input
                            type="text"
                            name="reason"
                            placeholder="Motif"
                            className="h-7 w-32 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                          />
                          <button
                            type="submit"
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            <Ban className="h-3 w-3" aria-hidden /> Bannir
                          </button>
                        </form>
                      )}
                      <form
                        action={adminToggleShadowBanAction}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="Motif (optionnel)"
                          className="h-7 w-36 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                        />
                        <button
                          type="submit"
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          <ShieldOff className="h-3 w-3" aria-hidden />
                          {u.shadowBanned ? "Rétablir" : "Shadow"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
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
              href={`/admin/utilisateurs?${new URLSearchParams({
                ...(q && { q }),
                ...(filter !== "all" && { filter }),
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
              href={`/admin/utilisateurs?${new URLSearchParams({
                ...(q && { q }),
                ...(filter !== "all" && { filter }),
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
