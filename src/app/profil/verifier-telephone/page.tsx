import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, RefreshCcw, ShieldCheck } from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { resendOtpAction, verifyPhoneAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vérifier mon numéro",
  description: "Entre le code à 6 chiffres reçu par SMS pour confirmer ton numéro.",
};

type Props = {
  searchParams: { phone?: string; error?: string; success?: string };
};

export default async function VerifyPhonePage({ searchParams }: Props) {
  await requireUser("/profil");

  const phone = searchParams.phone?.trim();
  // Without a phone in the URL this page is meaningless — send the user back
  // to the edit form so they can (re)enter a number.
  if (!phone) redirect("/profil/edit");

  // Pretty-print +594694123456 → +594 694 12 34 56 (best-effort).
  const displayPhone = formatPhone(phone);

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/profil/edit"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Modifier mon profil
      </Link>

      <section className="mt-4 flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Vérifier ton numéro
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          On vient d&apos;envoyer un code à 6 chiffres au{" "}
          <span className="font-semibold text-foreground">{displayPhone}</span>.
          Entre-le ci-dessous.
        </p>
      </section>

      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}
      {searchParams.success && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-peyi-green-200 bg-peyi-green-50 p-3 text-sm text-peyi-green-800"
        >
          {searchParams.success}
        </div>
      )}

      <form action={verifyPhoneAction} className="mt-6 space-y-4">
        <input type="hidden" name="phone" value={phone} />
        <div className="space-y-1.5">
          <Label htmlFor="code">Code de vérification</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="123456"
            className="text-center text-2xl font-bold tracking-[0.5em] tabular-nums"
          />
          <p className="text-xs text-muted-foreground">
            Le SMS peut prendre quelques secondes à arriver.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full">
          Vérifier
        </Button>
      </form>

      <form action={resendOtpAction} className="mt-4">
        <input type="hidden" name="phone" value={phone} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="w-full gap-2 text-muted-foreground"
        >
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
          Renvoyer le code
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Mauvais numéro ?{" "}
        <Link
          href="/profil/edit"
          className="font-medium text-peyi-orange-600 hover:underline"
        >
          Modifier
        </Link>
      </p>
    </main>
  );
}

/**
 * Best-effort pretty-printer — splits digits into readable blocks after the
 * country code. Fails silently back to the raw value.
 */
function formatPhone(raw: string): string {
  if (!/^\+\d{8,15}$/.test(raw)) return raw;
  // +594 694 12 34 56
  if (raw.startsWith("+594") && raw.length === 13) {
    return `+594 ${raw.slice(4, 7)} ${raw.slice(7, 9)} ${raw.slice(9, 11)} ${raw.slice(11, 13)}`;
  }
  // +33 6 94 12 34 56
  if (raw.startsWith("+33") && raw.length === 12) {
    return `+33 ${raw.slice(3, 4)} ${raw.slice(4, 6)} ${raw.slice(6, 8)} ${raw.slice(8, 10)} ${raw.slice(10, 12)}`;
  }
  return raw;
}
