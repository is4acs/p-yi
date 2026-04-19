import Link from "next/link";
import {
  FileText,
  Flag,
  Gift,
  LayoutDashboard,
  ListTree,
  MessageSquare,
  Newspaper,
  ScrollText,
  Tag,
  Users,
} from "lucide-react";

import { requireRole } from "@/lib/auth/current-user";
import { isSuperAdmin } from "@/lib/admin/roles";
import { UserRole } from "@prisma/client";

/**
 * Toutes les pages sous `/admin/*` passent par ce layout. Il fait deux
 * choses :
 *
 *  1. Guard `requireRole(MODERATOR)` au niveau du layout — n'importe
 *     quelle sous-page est donc automatiquement protégée, on n'a pas à
 *     redoubler le check dans chaque `page.tsx`. Les actions sensibles
 *     (delete, ban, set role) remettront quand même leur propre guard
 *     avec un rôle plus élevé quand nécessaire.
 *
 *  2. Sidebar de navigation. Les liens super-admin only (logs, gestion
 *     des rôles) sont conditionnés par `isSuperAdmin(user)` — un
 *     modérateur ou admin ne les voit pas. Le guard côté page fera
 *     quand même le filet de sécurité si quelqu'un tape l'URL à la main.
 *
 * Mobile : la sidebar devient une barre horizontale scrollable au-dessus
 * du contenu. Pas de drawer dédié pour l'instant : l'interface est
 * destinée à peu d'utilisateurs (toi + tes modérateurs), desktop sera
 * le canal principal.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(UserRole.MODERATOR, "/admin");
  const superAdmin = isSuperAdmin(user);

  const navItems = [
    { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/admin/annonces", label: "Annonces", icon: Tag },
    { href: "/admin/bons-plans", label: "Bons plans", icon: Newspaper },
    { href: "/admin/commentaires", label: "Commentaires", icon: MessageSquare },
    { href: "/admin/messages", label: "Messages", icon: FileText },
    { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
    { href: "/admin/signalements", label: "Signalements", icon: Flag },
    { href: "/admin/affiliation", label: "Affiliation", icon: Gift },
    ...(superAdmin
      ? [
          {
            href: "/admin/utilisateurs/roles",
            label: "Rôles",
            icon: ListTree,
          },
          { href: "/admin/logs", label: "Logs", icon: ScrollText },
        ]
      : []),
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-0 px-4 pb-12 pt-4 sm:flex-row sm:gap-6 sm:px-6 sm:pt-6">
      <aside className="shrink-0 sm:sticky sm:top-4 sm:h-[calc(100vh-2rem)] sm:w-56 sm:self-start">
        <div className="mb-3 hidden sm:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-peyi-orange-600">
            Admin
          </p>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Modération
          </h2>
        </div>

        <nav
          aria-label="Navigation admin"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:px-0"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50 sm:h-9 sm:w-full sm:justify-start sm:border-transparent sm:bg-transparent sm:hover:border-border"
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <p className="mt-4 hidden rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:block">
          Connecté en tant que{" "}
          <span className="font-medium text-foreground">@{user.username}</span>
          {superAdmin ? " (super admin)" : ""}
        </p>
      </aside>

      <main className="min-w-0 flex-1 pt-3 sm:pt-0">{children}</main>
    </div>
  );
}
