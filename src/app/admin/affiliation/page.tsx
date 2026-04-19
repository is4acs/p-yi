import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  Ban,
  Check,
  Coins,
  Download,
  MousePointerClick,
  UserCheck,
  Users,
} from "lucide-react";
import {
  AffiliatePayoutStatus,
  ReferralStatus,
  UserRole,
} from "@prisma/client";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/affiliate/tiers";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";

import {
  banAffiliateAction,
  markPayoutPaidAction,
  rejectPayoutAction,
  unbanAffiliateAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Admin · Affiliation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { success?: string; error?: string };
};

export default async function AdminAffiliationPage({ searchParams }: Props) {
  // Moderator suffit pour voir, mais les actions (mark paid, reject, ban)
  // exigent ADMIN. On garde MODERATOR au niveau page pour que l'équipe
  // puisse monitorer sans pouvoir toucher à la caisse.
  await requireRole(UserRole.MODERATOR, "/admin/affiliation");

  const [
    pendingPayouts,
    recentPayouts,
    topReferrers,
    globalStats,
  ] = await Promise.all([
    prisma.affiliatePayout.findMany({
      where: {
        status: {
          in: [AffiliatePayoutStatus.PENDING, AffiliatePayoutStatus.PROCESSING],
        },
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, fullName: true },
        },
      },
      orderBy: { requestedAt: "asc" },
      take: 50,
    }),
    prisma.affiliatePayout.findMany({
      where: {
        status: {
          in: [AffiliatePayoutStatus.PAID, AffiliatePayoutStatus.REJECTED],
        },
      },
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.affiliateProfile.findMany({
      where: { qualifiedCount: { gt: 0 } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            isBanned: true,
          },
        },
      },
      orderBy: { qualifiedCount: "desc" },
      take: 25,
    }),
    prisma.$transaction([
      prisma.affiliateProfile.count(),
      prisma.affiliateProfile.aggregate({
        _sum: {
          clicksCount: true,
          signupsCount: true,
          qualifiedCount: true,
          totalEarnedCents: true,
          pendingPayoutCents: true,
          paidOutCents: true,
        },
      }),
      prisma.referral.count({ where: { status: ReferralStatus.QUALIFIED } }),
      prisma.referral.count({ where: { status: ReferralStatus.PENDING } }),
    ]),
  ]);

  const [profileCount, sums, qualifiedCount, pendingCount] = globalStats;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Affiliation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vue d&apos;ensemble des parrainages, des gains et des paiements à
            traiter.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/admin/affiliation/export?status=PENDING" download>
              <Download className="h-4 w-4" aria-hidden />
              CSV à verser
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/admin/affiliation/export" download>
              <Download className="h-4 w-4" aria-hidden />
              CSV complet
            </a>
          </Button>
        </div>
      </header>

      {searchParams.success && (
        <div
          role="status"
          className="rounded-lg border border-peyi-green-200 bg-peyi-green-50 p-3 text-sm text-peyi-green-800"
        >
          {searchParams.success}
        </div>
      )}
      {searchParams.error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      {/* Stats globales */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI
          icon={<Users className="h-5 w-5" />}
          label="Profils affiliés"
          value={profileCount.toLocaleString("fr-FR")}
          tone="default"
        />
        <KPI
          icon={<MousePointerClick className="h-5 w-5" />}
          label="Clics totaux"
          value={(sums._sum.clicksCount ?? 0).toLocaleString("fr-FR")}
          tone="default"
        />
        <KPI
          icon={<UserCheck className="h-5 w-5" />}
          label="Filleuls qualifiés"
          value={qualifiedCount.toLocaleString("fr-FR")}
          tone="green"
          hint={`${pendingCount} en attente`}
        />
        <KPI
          icon={<Coins className="h-5 w-5" />}
          label="À verser"
          value={formatCents(sums._sum.pendingPayoutCents ?? 0)}
          tone={(sums._sum.pendingPayoutCents ?? 0) > 0 ? "warn" : "default"}
          hint={`${formatCents(sums._sum.paidOutCents ?? 0)} déjà versés`}
        />
      </section>

      {/* File de paiements à traiter */}
      <section>
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">
            Paiements à traiter ({pendingPayouts.length})
          </h2>
          {pendingPayouts.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-peyi-orange-800">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>Vérifie que chaque compte n&apos;est pas en fraude avant de verser.</span>
            </div>
          )}
        </header>

        {pendingPayouts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Aucun paiement en attente. 🎉
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {pendingPayouts.map((p) => (
              <li key={p.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      @{p.user.username}{" "}
                      <span className="text-muted-foreground">
                        ({p.user.email})
                      </span>
                    </p>
                    {p.user.fullName && (
                      <p className="text-xs text-muted-foreground">
                        {p.user.fullName}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Demandé le{" "}
                      {new Date(p.requestedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {p.tierReached ? ` · Palier ${p.tierReached}` : ""}
                    </p>
                  </div>
                  <p className="font-display text-xl font-bold tabular-nums">
                    {formatCents(p.amountCents)}
                  </p>
                </div>

                <form
                  action={markPayoutPaidAction}
                  className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto]"
                >
                  <input type="hidden" name="payoutId" value={p.id} />
                  <select
                    name="method"
                    defaultValue="BANK_TRANSFER"
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    aria-label="Méthode de paiement"
                  >
                    <option value="BANK_TRANSFER">Virement</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="OTHER">Autre</option>
                  </select>
                  <input
                    name="reference"
                    placeholder="Référence (facultatif)"
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  />
                  <input
                    name="notes"
                    placeholder="Note interne"
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  />
                  <SubmitButton
                    size="sm"
                    pendingLabel="…"
                    className="gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Marquer versé
                  </SubmitButton>
                </form>

                <form
                  action={rejectPayoutAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="payoutId" value={p.id} />
                  <input
                    name="reason"
                    required
                    minLength={3}
                    placeholder="Raison du rejet…"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                  />
                  <SubmitButton
                    size="sm"
                    variant="outline"
                    pendingLabel="…"
                    className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden />
                    Rejeter
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Top parrains */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">
          Top parrains
        </h2>
        {topReferrers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Aucun parrain actif pour l&apos;instant.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Parrain</th>
                  <th className="px-3 py-2 text-right font-semibold">Clics</th>
                  <th className="px-3 py-2 text-right font-semibold">Inscrits</th>
                  <th className="px-3 py-2 text-right font-semibold">Qualifiés</th>
                  <th className="px-3 py-2 text-right font-semibold">Gagné</th>
                  <th className="px-3 py-2 text-right font-semibold">À verser</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/profil/${p.user.username}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        @{p.user.username}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {p.user.email}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.clicksCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.signupsCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {p.qualifiedCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCents(p.totalEarnedCents)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCents(p.pendingPayoutCents)}
                    </td>
                    <td className="px-3 py-2">
                      {p.isBanned ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          Suspendu
                        </span>
                      ) : (
                        <span className="rounded-full bg-peyi-green-100 px-2 py-0.5 text-[10px] font-semibold text-peyi-green-800">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {p.isBanned ? (
                        <form action={unbanAffiliateAction}>
                          <input type="hidden" name="profileId" value={p.id} />
                          <SubmitButton
                            size="sm"
                            variant="outline"
                            pendingLabel="…"
                            className="h-7 px-2 text-xs"
                          >
                            Réactiver
                          </SubmitButton>
                        </form>
                      ) : (
                        <form action={banAffiliateAction} className="flex items-center gap-1">
                          <input type="hidden" name="profileId" value={p.id} />
                          <input
                            name="reason"
                            required
                            minLength={3}
                            placeholder="Raison"
                            className="w-24 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px]"
                          />
                          <SubmitButton
                            size="sm"
                            variant="outline"
                            pendingLabel="…"
                            className="h-7 px-2 text-xs text-destructive"
                          >
                            Suspendre
                          </SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Historique récent des paiements traités */}
      {recentPayouts.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">
            Paiements récents
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card text-sm">
            {recentPayouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div>
                  <p className="font-semibold">
                    @{p.user.username} — {formatCents(p.amountCents)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.status === AffiliatePayoutStatus.PAID
                      ? `Versé ${p.paidAt ? `le ${new Date(p.paidAt).toLocaleDateString("fr-FR")}` : ""}${p.method ? ` · ${p.method}` : ""}${p.reference ? ` · réf. ${p.reference}` : ""}`
                      : `Rejeté : ${p.rejectionReason ?? ""}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    p.status === AffiliatePayoutStatus.PAID
                      ? "bg-peyi-green-100 text-peyi-green-800"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {p.status === AffiliatePayoutStatus.PAID ? "Versé" : "Rejeté"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "default" | "warn" | "green";
}) {
  const tones: Record<typeof tone, string> = {
    default: "border-border bg-card",
    warn: "border-peyi-orange-300 bg-peyi-orange-50",
    green: "border-peyi-green-200 bg-peyi-green-50/40",
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span aria-hidden>{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
