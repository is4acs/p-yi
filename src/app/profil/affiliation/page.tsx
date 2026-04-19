import Link from "next/link";
import type { Metadata } from "next";
import {
  ChevronLeft,
  Coins,
  Gift,
  MousePointerClick,
  PiggyBank,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { ReferralStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateAffiliateProfile, buildInviteUrl } from "@/lib/affiliate/profile";
import {
  AFFILIATE_TIERS,
  formatCents,
  nextTier,
  REQUIRED_DEALS,
  REQUIRED_LISTINGS,
} from "@/lib/affiliate/tiers";
import { MIN_PAYOUT_REQUEST_CENTS } from "@/lib/affiliate/payout";
import { SubmitButton } from "@/components/ui/submit-button";

import { CopyInviteLink } from "./CopyInviteLink";
import { requestPayoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Parrainage & affiliation",
  description:
    "Invite tes amis à rejoindre Péyi et gagne une récompense progressive à chaque palier atteint.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { success?: string; error?: string };
};

export default async function AffiliationPage({ searchParams }: Props) {
  const user = await requireUser("/profil/affiliation");

  // Matérialise le profil d'affiliation à la première visite (génère le
  // code unique). C'est une écriture légère, une seule fois par compte.
  const profile = await getOrCreateAffiliateProfile(user.id);
  const inviteUrl = buildInviteUrl(profile.code);

  const [referrals, payouts] = await Promise.all([
    prisma.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        referee: {
          select: { id: true, username: true, avatarUrl: true, createdAt: true },
        },
      },
    }),
    prisma.affiliatePayout.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),
  ]);

  const next = nextTier(profile.qualifiedCount);
  const hasPendingPayout = profile.pendingPayoutCents >= MIN_PAYOUT_REQUEST_CENTS;

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        Retour au profil
      </Link>

      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Parrainage & affiliation
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Invite tes amis à rejoindre Péyi. Tu gagnes de l&apos;argent à chaque
        palier de filleuls qualifiés (5 bons plans + 5 annonces publiés).
      </p>

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

      {profile.isBanned && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          Ton programme d&apos;affiliation est suspendu{profile.banReason ? ` : ${profile.banReason}` : "."}
          {" "}Contacte le support si tu penses que c&apos;est une erreur.
        </div>
      )}

      {/* Lien d'invitation */}
      <section className="mt-6 rounded-xl border border-peyi-orange-200 bg-peyi-orange-50/60 p-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-700"
            aria-hidden
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold text-peyi-orange-900">
              Ton lien d&apos;invitation
            </h2>
            <p className="mt-0.5 text-xs text-peyi-orange-900/80">
              Partage-le par SMS, WhatsApp, Instagram — tes filleuls seront
              automatiquement rattachés à ton compte.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <CopyInviteLink url={inviteUrl} />
        </div>
      </section>

      {/* Stats */}
      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold">Tes chiffres</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            icon={<MousePointerClick className="h-4 w-4" />}
            label="Clics"
            value={profile.clicksCount}
            color="blue"
          />
          <StatTile
            icon={<Users className="h-4 w-4" />}
            label="Inscrits"
            value={profile.signupsCount}
            color="orange"
          />
          <StatTile
            icon={<UserCheck className="h-4 w-4" />}
            label="Qualifiés"
            value={profile.qualifiedCount}
            color="green"
          />
          <StatTile
            icon={<Coins className="h-4 w-4" />}
            label="Gagné"
            value={formatCents(profile.totalEarnedCents)}
            color="red"
          />
        </div>
      </section>

      {/* Progression vers le palier suivant */}
      {next.tier && !profile.isBanned && (
        <section className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prochain palier
              </p>
              <p className="font-display text-base font-bold text-foreground">
                {next.tier.label}
              </p>
              <p className="text-xs text-muted-foreground">
                Récompense : {formatCents(next.tier.rewardCents)} — encore{" "}
                <strong className="text-foreground">
                  {next.remaining} filleul{next.remaining > 1 ? "s" : ""}
                </strong>
              </p>
            </div>
            <TrendingUp
              className="h-8 w-8 shrink-0 text-peyi-orange-500"
              aria-hidden
            />
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-peyi-orange-500 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  ((profile.qualifiedCount - next.previousThreshold) /
                    (next.tier.threshold - next.previousThreshold)) *
                    100,
                )}%`,
              }}
              aria-hidden
            />
          </div>
        </section>
      )}

      {/* Solde + demande de paiement */}
      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Solde à reverser
            </p>
            <p className="font-display text-2xl font-bold tabular-nums text-foreground">
              {formatCents(profile.pendingPayoutCents)}
            </p>
            {profile.paidOutCents > 0 && (
              <p className="text-xs text-muted-foreground">
                Déjà versé : {formatCents(profile.paidOutCents)}
              </p>
            )}
          </div>
          <PiggyBank className="h-10 w-10 shrink-0 text-peyi-green-600" aria-hidden />
        </div>

        {hasPendingPayout ? (
          <form action={requestPayoutAction} className="mt-4">
            <input
              type="hidden"
              name="amountCents"
              value={profile.pendingPayoutCents}
            />
            <SubmitButton
              size="sm"
              pendingLabel="Envoi…"
              className="w-full"
            >
              Demander le paiement ({formatCents(profile.pendingPayoutCents)})
            </SubmitButton>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Virement manuel sous 5 à 10 jours ouvrés. Notre équipe te
              contactera pour obtenir ton RIB si c&apos;est ton premier paiement.
            </p>
          </form>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Montant minimum : {formatCents(MIN_PAYOUT_REQUEST_CENTS)}. Continue
            à parrainer pour atteindre le seuil.
          </p>
        )}
      </section>

      {/* Barème */}
      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-base font-bold">Le barème</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Un filleul est <strong>qualifié</strong> dès qu&apos;il a publié{" "}
          {REQUIRED_DEALS} bons plans et {REQUIRED_LISTINGS} annonces dans les
          90 jours suivant son inscription. Les paliers sont cumulés — chaque
          cap franchi te crédite le bonus affiché.
        </p>
        <ul className="mt-3 divide-y divide-border">
          {AFFILIATE_TIERS.map((tier) => {
            const reached = profile.qualifiedCount >= tier.threshold;
            return (
              <li
                key={tier.threshold}
                className={`flex items-center justify-between gap-3 py-2 text-sm ${reached ? "text-foreground" : "text-muted-foreground"}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${reached ? "bg-peyi-green-100 text-peyi-green-700" : "bg-muted text-muted-foreground"}`}
                    aria-hidden
                  >
                    {reached ? "✓" : ""}
                  </span>
                  <span className="font-medium">{tier.label}</span>
                </span>
                <span className="tabular-nums font-semibold">
                  +{formatCents(tier.rewardCents)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Filleuls récents */}
      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold">
          Mes filleuls ({profile.signupsCount})
        </h2>
        {referrals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
            <Gift className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">Aucun filleul pour l&apos;instant</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Partage ton lien ci-dessus pour commencer.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {referrals.map((r) => {
              const dealsPct = Math.min(
                100,
                Math.round((r.dealsPublished / REQUIRED_DEALS) * 100),
              );
              const listingsPct = Math.min(
                100,
                Math.round((r.listingsPublished / REQUIRED_LISTINGS) * 100),
              );
              return (
                <li key={r.id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        @{r.referee.username}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Inscrit le{" "}
                        {new Date(r.referee.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.status === ReferralStatus.PENDING && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <ProgressMini
                        label={`Bons plans ${r.dealsPublished}/${REQUIRED_DEALS}`}
                        pct={dealsPct}
                      />
                      <ProgressMini
                        label={`Annonces ${r.listingsPublished}/${REQUIRED_LISTINGS}`}
                        pct={listingsPct}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Historique des paiements */}
      {payouts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-bold">
            Historique des paiements
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-semibold">{formatCents(p.amountCents)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Demandé le{" "}
                    {new Date(p.requestedAt).toLocaleDateString("fr-FR")}
                    {p.paidAt
                      ? ` · Versé le ${new Date(p.paidAt).toLocaleDateString("fr-FR")}`
                      : ""}
                  </p>
                </div>
                <PayoutStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "orange" | "red" | "green" | "blue";
}) {
  const colors: Record<typeof color, string> = {
    orange: "bg-peyi-orange-100 text-peyi-orange-700",
    red: "bg-red-100 text-red-700",
    green: "bg-peyi-green-100 text-peyi-green-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors[color]}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReferralStatus }) {
  const meta: Record<ReferralStatus, { label: string; cls: string }> = {
    PENDING: {
      label: "En cours",
      cls: "bg-amber-100 text-amber-800",
    },
    QUALIFIED: {
      label: "Qualifié",
      cls: "bg-peyi-green-100 text-peyi-green-800",
    },
    EXPIRED: {
      label: "Expiré",
      cls: "bg-muted text-muted-foreground",
    },
    REJECTED: {
      label: "Rejeté",
      cls: "bg-destructive/10 text-destructive",
    },
  };
  const m = meta[status];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "En attente", cls: "bg-amber-100 text-amber-800" },
    PROCESSING: { label: "En traitement", cls: "bg-blue-100 text-blue-800" },
    PAID: { label: "Versé", cls: "bg-peyi-green-100 text-peyi-green-800" },
    REJECTED: { label: "Rejeté", cls: "bg-destructive/10 text-destructive" },
  };
  const m = meta[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function ProgressMini({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <p className="truncate text-muted-foreground">{label}</p>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-peyi-orange-500 transition-all"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
