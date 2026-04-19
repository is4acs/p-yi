import type { Metadata } from "next";
import Link from "next/link";
import { AdminActionType, AdminTargetType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Journal d'administration",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = {
  page?: string;
  adminId?: string;
  action?: string;
  targetType?: string;
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

const ACTION_LABEL: Record<AdminActionType, string> = {
  DELETE_LISTING: "Supprime annonce",
  DELETE_DEAL: "Supprime bon plan",
  DELETE_COMMENT: "Supprime commentaire",
  DELETE_MESSAGE: "Supprime message",
  BAN_USER: "Bannit",
  UNBAN_USER: "Débannit",
  SHADOW_BAN_USER: "Shadow-bannit",
  UNSHADOW_BAN_USER: "Rétablit (shadow)",
  SET_ROLE: "Change rôle",
  RESOLVE_REPORT: "Résout signalement",
  DISMISS_REPORT: "Rejette signalement",
};

const TARGET_LABEL: Record<AdminTargetType, string> = {
  LISTING: "Annonce",
  DEAL: "Bon plan",
  COMMENT: "Commentaire",
  MESSAGE: "Message",
  USER: "Utilisateur",
  REPORT: "Signalement",
};

const ACTION_COLORS: Record<AdminActionType, string> = {
  DELETE_LISTING: "text-red-700 bg-red-50 border-red-200",
  DELETE_DEAL: "text-red-700 bg-red-50 border-red-200",
  DELETE_COMMENT: "text-red-700 bg-red-50 border-red-200",
  DELETE_MESSAGE: "text-red-700 bg-red-50 border-red-200",
  BAN_USER: "text-red-800 bg-red-100 border-red-300",
  UNBAN_USER: "text-peyi-green-800 bg-peyi-green-50 border-peyi-green-200",
  SHADOW_BAN_USER: "text-amber-800 bg-amber-50 border-amber-200",
  UNSHADOW_BAN_USER: "text-peyi-green-800 bg-peyi-green-50 border-peyi-green-200",
  SET_ROLE: "text-peyi-orange-800 bg-peyi-orange-50 border-peyi-orange-200",
  RESOLVE_REPORT: "text-peyi-green-800 bg-peyi-green-50 border-peyi-green-200",
  DISMISS_REPORT: "text-muted-foreground bg-muted border-border",
};

export default async function AdminLogsPage(
  props: {
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  // Réservé aux super-admins : les logs sont sensibles (listent qui
  // modère quoi), on ne veut pas qu'un modérateur débutant puisse
  // auditer ses pairs.
  await requireRole(UserRole.SUPER_ADMIN, "/admin/logs");

  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(searchParams.adminId ? { adminId: searchParams.adminId } : {}),
    ...(searchParams.action &&
    (Object.values(AdminActionType) as string[]).includes(searchParams.action)
      ? { action: searchParams.action as AdminActionType }
      : {}),
    ...(searchParams.targetType &&
    (Object.values(AdminTargetType) as string[]).includes(
      searchParams.targetType,
    )
      ? { targetType: searchParams.targetType as AdminTargetType }
      : {}),
  };

  const [logs, total, admins] = await Promise.all([
    prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        reason: true,
        metadata: true,
        createdAt: true,
        admin: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    }),
    prisma.adminActionLog.count({ where }),
    prisma.user.findMany({
      where: {
        role: {
          in: [
            UserRole.MODERATOR,
            UserRole.ADMIN,
            UserRole.SUPER_ADMIN,
          ],
        },
      },
      select: { id: true, username: true, role: true },
      orderBy: { username: "asc" },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = (patch: Partial<SearchParams>) => {
    const merged = { ...searchParams, ...patch };
    const p = new URLSearchParams();
    if (merged.adminId) p.set("adminId", merged.adminId);
    if (merged.action) p.set("action", merged.action);
    if (merged.targetType) p.set("targetType", merged.targetType);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    return p.toString();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Journal d&apos;administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trace de toutes les actions admin. {total.toLocaleString("fr-FR")}{" "}
          entrée{total > 1 ? "s" : ""} au total.
        </p>
      </header>

      <form className="flex flex-wrap items-center gap-2">
        <select
          name="adminId"
          defaultValue={searchParams.adminId || ""}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
        >
          <option value="">Tous les admins</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              @{a.username} ({a.role})
            </option>
          ))}
        </select>
        <select
          name="action"
          defaultValue={searchParams.action || ""}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
        >
          <option value="">Toutes actions</option>
          {Object.values(AdminActionType).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]}
            </option>
          ))}
        </select>
        <select
          name="targetType"
          defaultValue={searchParams.targetType || ""}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
        >
          <option value="">Toutes cibles</option>
          {Object.values(AdminTargetType).map((t) => (
            <option key={t} value={t}>
              {TARGET_LABEL[t]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-peyi-orange-600"
        >
          Filtrer
        </button>
        {(searchParams.adminId ||
          searchParams.action ||
          searchParams.targetType) && (
          <Link
            href="/admin/logs"
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:border-peyi-orange-300"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Aucune action enregistrée.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((l) => (
            <li
              key={l.id}
              className="rounded-lg border border-border bg-card p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[l.action]}`}
                  >
                    {ACTION_LABEL[l.action]}
                  </span>
                  <span>·</span>
                  <span>{TARGET_LABEL[l.targetType]}</span>
                  <span>·</span>
                  <span>
                    par{" "}
                    <span className="font-medium text-foreground">
                      @{l.admin.username}
                    </span>{" "}
                    <span className="text-xs">({l.admin.role})</span>
                  </span>
                </div>
                <span>
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(l.createdAt)}
                </span>
              </div>
              {l.reason && (
                <p className="mt-1.5 text-xs italic text-muted-foreground">
                  Motif : {l.reason}
                </p>
              )}
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                target : {l.targetId}
              </p>
              {l.metadata &&
                typeof l.metadata === "object" &&
                !Array.isArray(l.metadata) && (
                  <pre className="mt-1.5 overflow-x-auto rounded-md border border-border bg-muted/30 p-2 text-[11px] text-foreground">
                    {JSON.stringify(l.metadata, null, 2)}
                  </pre>
                )}
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
              href={`/admin/logs?${buildQuery({ page: String(page - 1) })}`}
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
              href={`/admin/logs?${buildQuery({ page: String(page + 1) })}`}
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
