import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";

import { getMessages } from "@/lib/i18n";
import { SubmitButton } from "@/components/ui/submit-button";

import { requestPasswordResetAction } from "./actions";
import { INPUT_CLASS } from "@/components/soleil/field";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description:
    "Réinitialise ton mot de passe Péyi — on t'envoie un lien par e-mail.",
  alternates: { canonical: "/connexion/mot-de-passe-oublie" },
  robots: { index: false, follow: true },
};

type SearchParams = {
  error?: string;
  sent?: string;
};

export default async function MotDePasseOubliePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const error = searchParams.error;
  const sent = searchParams.sent === "1";

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
          <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.5px]">
            {t.auth.forgotTitle}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-soleil-muted2 dark:text-soleil-muted-d">
            {t.auth.forgotSub}
          </p>
        </div>

        {sent ? (
          <div
            role="status"
            className="mt-6 flex items-start gap-2.5 rounded-[14px] bg-soleil-valid p-4 text-sm text-soleil-forest dark:bg-soleil-valid-d"
          >
            <Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="font-extrabold">{t.auth.checkInbox}</p>
              <p className="mt-1 text-xs font-medium">{t.auth.forgotSentSub}</p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3.5 text-sm font-semibold text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <form action={requestPasswordResetAction} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-[11px] font-extrabold uppercase tracking-[0.5px] text-soleil-muted2 dark:text-soleil-muted-d"
                >
                  {t.auth.email}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t.auth.emailPlaceholder}
                  className={INPUT_CLASS}
                />
              </div>

              <SubmitButton
                className="min-h-[48px] w-full rounded-full bg-soleil-forest text-[14px] font-extrabold text-soleil-cream hover:bg-soleil-forest/90 dark:bg-soleil-cream dark:text-soleil-forest dark:hover:bg-soleil-cream/90"
                pendingLabel={t.auth.forgotPending}
              >
                {t.auth.forgotCta}
              </SubmitButton>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-xs text-soleil-muted2 dark:text-soleil-muted-d">
          {t.auth.remember}{" "}
          <Link
            href="/connexion"
            className="font-bold text-soleil-otext hover:underline dark:text-soleil-otext-d"
          >
            {t.auth.backToLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
