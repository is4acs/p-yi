import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n";
import { SubmitButton } from "@/components/ui/submit-button";

import { updatePasswordAction } from "./actions";

export const metadata: Metadata = {
  title: "Choisir un nouveau mot de passe",
  description: "Définis un nouveau mot de passe pour ton compte Péyi.",
  alternates: { canonical: "/auth/reset-password" },
  robots: { index: false, follow: false },
};

// Page dynamique : on lit la session courante pour s'assurer que le lien
// de recovery a bien été consommé avant d'afficher le formulaire.
export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
};

export default async function ResetPasswordPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const error = searchParams.error;

  // Sans session active (user arrive en tapant l'URL direct), on l'envoie
  // vers le form de demande plutôt que de montrer un écran de changement
  // qui ne ferait rien.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/connexion/mot-de-passe-oublie");
  }

  return (
    <main className="min-h-screen bg-soleil-cream px-4 pb-10 text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto flex w-full max-w-md flex-col pt-4">
        <Link
          href="/connexion"
          aria-label={t.auth.backToLogin}
          className="inline-flex h-11 w-11 items-center justify-center self-start rounded-full border-[1.5px] border-soleil-border bg-soleil-input transition active:scale-95 dark:border-soleil-border-d dark:bg-soleil-forest"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>

        <div className="mt-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-soleil-orange text-soleil-forest">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-4 font-display text-[26px] font-extrabold leading-tight tracking-[-0.5px]">
            {t.auth.resetTitle}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-soleil-muted2 dark:text-soleil-muted-d">
            {t.auth.resetSub}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3.5 text-sm font-semibold text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <form action={updatePasswordAction} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-[11px] font-extrabold uppercase tracking-[0.5px] text-soleil-muted2 dark:text-soleil-muted-d"
            >
              {t.auth.newPassword}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t.auth.passwordPlaceholder}
              className="w-full rounded-[14px] border-[1.5px] border-soleil-border bg-soleil-input px-3.5 py-3 text-[14px] font-semibold text-soleil-forest placeholder:font-medium placeholder:text-soleil-muted focus:border-soleil-forest focus:outline-none dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus:border-soleil-cream"
            />
            <p className="text-xs text-soleil-muted dark:text-soleil-muted-d">
              {t.auth.passwordHelp}
            </p>
          </div>

          <SubmitButton
            className="min-h-[48px] w-full rounded-full bg-soleil-forest text-[14px] font-extrabold text-soleil-cream hover:bg-soleil-forest/90 dark:bg-soleil-cream dark:text-soleil-forest dark:hover:bg-soleil-cream/90"
            pendingLabel={t.auth.resetPending}
          >
            {t.auth.resetCta}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
