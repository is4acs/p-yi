import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { formatRole } from "@/lib/admin/roles";
import { adminSetRoleAction } from "./actions";

export const metadata: Metadata = {
  title: "Attribution de rôles",
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

// Rôles sélectionnables dans l'UI. SUPER_ADMIN volontairement exclu :
// l'ajout se fait en CLI pour éviter qu'une session compromise ne
// puisse créer un pair.
const SELECTABLE_ROLES: UserRole[] = [
  UserRole.USER,
  UserRole.PRO,
  UserRole.AMBASSADOR,
  UserRole.MODERATOR,
  UserRole.ADMIN,
];

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireRole(
    UserRole.SUPER_ADMIN,
    "/admin/utilisateurs/roles",
  );

  const q = searchParams.q?.trim() || "";
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { username: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total, superAdmins] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "desc" }, { createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where: { role: UserRole.SUPER_ADMIN },
      select: { id: true, username: true, email: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Attribution de rôles
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accessible uniquement aux super-admins. L&apos;action est
          tracée dans le journal.
        </p>
      </header>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>Les super-admins ne s&apos;ajoutent pas ici.</strong>{" "}
            Pour promouvoir un compte en SUPER_ADMIN, utilise le script
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs">
              npm run promote-super-admin -- &lt;email&gt;
            </code>
            en ligne de commande. Cette restriction protège contre le vol
            de session d&apos;un super-admin qui pourrait créer un pair.
          </span>
        </p>
        {superAdmins.length > 0 && (
          <p className="mt-2 text-xs">
            <strong>Super-admin{superAdmins.length > 1 ? "s" : ""} actuel
            {superAdmins.length > 1 ? "s" : ""} :</strong>{" "}
            {superAdmins.map((s) => `@${s.username}`).join(", ")}
          </p>
        )}
      </div>

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
            placeholder="Username ou email…"
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

      <p className="text-xs text-muted-foreground">
        {total.toLocaleString("fr-FR")} compte{total > 1 ? "s" : ""} affiché
        {total > 1 ? "s" : ""}.
      </p>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Aucun utilisateur.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => {
            const isSelf = u.id === admin.id;
            const isSuperAdmin = u.role === UserRole.SUPER_ADMIN;
            const locked = isSelf || isSuperAdmin;
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
                      <span className="inline-flex items-center rounded-full border border-peyi-orange-300 bg-peyi-orange-50 px-2 py-0.5 text-xs font-medium text-peyi-orange-900">
                        {formatRole(u.role)}
                      </span>
                      {isSelf && (
                        <span className="text-xs text-muted-foreground">
                          (toi)
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>

                  {locked ? (
                    <p className="text-xs italic text-muted-foreground">
                      {isSelf
                        ? "Tu ne peux pas modifier ton propre rôle."
                        : "Super-admin — modification via CLI."}
                    </p>
                  ) : (
                    <form
                      action={adminSetRoleAction}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="h-7 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-peyi-orange-500"
                      >
                        {SELECTABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {formatRole(r)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="reason"
                        placeholder="Motif"
                        className="h-7 w-32 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-peyi-orange-500"
                      />
                      <button
                        type="submit"
                        className="inline-flex h-7 items-center rounded-md bg-peyi-orange-500 px-2.5 text-xs font-semibold text-white hover:bg-peyi-orange-600"
                      >
                        Appliquer
                      </button>
                    </form>
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
              href={`/admin/utilisateurs/roles?${new URLSearchParams({
                ...(q && { q }),
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
              href={`/admin/utilisateurs/roles?${new URLSearchParams({
                ...(q && { q }),
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
