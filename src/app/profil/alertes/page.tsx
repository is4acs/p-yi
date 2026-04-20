import Link from "next/link";
import type { Metadata } from "next";
import { AlertType, type Prisma } from "@prisma/client";
import {
  ArrowLeft,
  Bell,
  BellOff,
  MapPin,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

import {
  deleteAlertAction,
  toggleAlertAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes alertes",
  description:
    "Reçois une notification dès qu'un bon plan ou une annonce matche tes critères.",
  robots: { index: false, follow: false },
};

type SearchParams = { success?: string; error?: string };

type AlertRow = {
  id: string;
  name: string;
  keywords: string[];
  type: AlertType;
  minPrice: Prisma.Decimal | null;
  maxPrice: Prisma.Decimal | null;
  isActive: boolean;
  matchCount: number;
  category: { name: string; icon: string | null } | null;
  city: { name: string } | null;
};

export default async function AlertesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireUser("/profil/alertes");

  // Alert n'a pas de relation `city` côté Prisma (seulement un cityId), on
  // fait donc un IN sur les cityIds référencés pour afficher les noms.
  const rawAlerts = await prisma.alert.findMany({
    where: { userId: user.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      keywords: true,
      type: true,
      cityId: true,
      minPrice: true,
      maxPrice: true,
      isActive: true,
      matchCount: true,
      category: { select: { name: true, icon: true } },
    },
  });

  const cityIds = Array.from(
    new Set(rawAlerts.map((a) => a.cityId).filter((id): id is string => !!id)),
  );
  const cities = cityIds.length
    ? await prisma.city.findMany({
        where: { id: { in: cityIds } },
        select: { id: true, name: true },
      })
    : [];
  const cityMap = new Map(cities.map((c) => [c.id, c.name]));

  const alerts: AlertRow[] = rawAlerts.map((a) => ({
    id: a.id,
    name: a.name,
    keywords: a.keywords,
    type: a.type,
    minPrice: a.minPrice,
    maxPrice: a.maxPrice,
    isActive: a.isActive,
    matchCount: a.matchCount,
    category: a.category,
    city: a.cityId
      ? { name: cityMap.get(a.cityId) ?? "Commune inconnue" }
      : null,
  }));

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour au profil
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Mes alertes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            On te prévient dès qu&apos;une nouvelle publication matche tes
            critères.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/profil/alertes/nouveau">
            <Plus className="h-4 w-4" aria-hidden />
            Créer
          </Link>
        </Button>
      </div>

      {searchParams.success && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-peyi-green-200 bg-peyi-green-50 p-3 text-sm text-peyi-green-800"
        >
          {searchParams.success}
        </div>
      )}
      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-700">
            <Bell className="h-6 w-6" aria-hidden />
          </div>
          <p className="font-semibold">Pas encore d&apos;alerte</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Crée une alerte et on te notifie en temps réel dès qu&apos;un bon
            plan ou une annonce matche ton besoin.
          </p>
          <Button asChild className="mt-5">
            <Link href="/profil/alertes/nouveau">
              <Plus className="h-4 w-4" aria-hidden />
              Créer ma première alerte
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {alerts.map((a) => (
            <li key={a.id}>
              <AlertCard alert={a} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function AlertCard({ alert }: { alert: AlertRow }) {
  const hasAnyFilter =
    alert.category ||
    alert.city ||
    alert.minPrice !== null ||
    alert.maxPrice !== null;

  return (
    <article
      className={`rounded-lg border bg-card p-4 transition ${
        alert.isActive
          ? "border-border"
          : "border-dashed border-border opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold">{alert.name}</h2>
            <TypeBadge type={alert.type} />
            {!alert.isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                En pause
              </span>
            )}
          </div>

          {alert.keywords.length > 0 && (
            <p className="mt-1.5 truncate text-sm text-foreground">
              {alert.keywords.join(" · ")}
            </p>
          )}

          {hasAnyFilter && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              {alert.category && (
                <Chip icon={<Tag className="h-3 w-3" aria-hidden />}>
                  {alert.category.icon
                    ? `${alert.category.icon} ${alert.category.name}`
                    : alert.category.name}
                </Chip>
              )}
              {alert.city && (
                <Chip icon={<MapPin className="h-3 w-3" aria-hidden />}>
                  {alert.city.name}
                </Chip>
              )}
              {(alert.minPrice !== null || alert.maxPrice !== null) && (
                <Chip>{formatPriceRange(alert.minPrice, alert.maxPrice)}</Chip>
              )}
            </div>
          )}

          {alert.matchCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {alert.matchCount} match{alert.matchCount > 1 ? "s" : ""} à ce
              jour
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <form action={toggleAlertAction}>
          <input type="hidden" name="id" value={alert.id} />
          <input
            type="hidden"
            name="active"
            value={alert.isActive ? "0" : "1"}
          />
          <SubmitButton
            variant="outline"
            size="sm"
            pendingLabel="..."
            aria-label={
              alert.isActive
                ? "Mettre l'alerte en pause"
                : "Réactiver l'alerte"
            }
          >
            {alert.isActive ? (
              <>
                <BellOff className="h-3.5 w-3.5" aria-hidden />
                Pause
              </>
            ) : (
              <>
                <Bell className="h-3.5 w-3.5" aria-hidden />
                Activer
              </>
            )}
          </SubmitButton>
        </form>

        <Button asChild variant="outline" size="sm">
          <Link href={`/profil/alertes/${alert.id}/modifier`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Modifier
          </Link>
        </Button>

        <form action={deleteAlertAction} className="ml-auto">
          <input type="hidden" name="id" value={alert.id} />
          <SubmitButton
            variant="outline"
            size="sm"
            pendingLabel="..."
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Supprimer
          </SubmitButton>
        </form>
      </div>
    </article>
  );
}

function TypeBadge({ type }: { type: AlertType }) {
  const label =
    type === AlertType.DEAL
      ? "Bons plans"
      : type === AlertType.LISTING
        ? "Annonces"
        : "Les deux";
  return (
    <span className="inline-flex items-center rounded-full bg-peyi-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-peyi-orange-700">
      {label}
    </span>
  );
}

function Chip({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
      {icon}
      {children}
    </span>
  );
}

function formatPriceRange(
  min: Prisma.Decimal | null,
  max: Prisma.Decimal | null,
): string {
  if (min !== null && max !== null) return `${min.toString()} – ${max.toString()} €`;
  if (min !== null) return `≥ ${min.toString()} €`;
  if (max !== null) return `≤ ${max.toString()} €`;
  return "";
}
