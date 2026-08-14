"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import { useMessages } from "@/components/soleil/I18nProvider";
import {
  AUTH_FORM_IDLE,
  authErrorMessage,
  type AuthFormState,
} from "@/lib/auth/errors";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/soleil/field";

/**
 * Formulaire « nouveau mot de passe » (useActionState). Le succès
 * s'affiche ICI (état `done`) avec un bouton continuer — l'ancien flux
 * redirigeait vers /bons-plans?password-updated=1, un paramètre que
 * rien ne lisait : l'utilisateur ne voyait jamais de confirmation.
 */
export function ResetPasswordForm({
  action,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const t = useMessages();
  const [state, formAction] = useActionState(action, AUTH_FORM_IDLE);
  const errorMessage = authErrorMessage(t, state);

  if (state.done) {
    return (
      <div
        role="status"
        className="mt-6 flex flex-col items-center gap-3 rounded-[14px] bg-soleil-valid p-5 text-center text-sm text-soleil-forest dark:bg-soleil-valid-d"
      >
        <CheckCircle2 className="h-6 w-6" aria-hidden />
        <div>
          <p className="font-extrabold">{t.auth.resetDone}</p>
          <p className="mt-1 text-xs font-medium">{t.auth.resetDoneSub}</p>
        </div>
        <Link
          href="/bons-plans"
          className="mt-1 inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-5 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
        >
          {t.auth.continueCta}
        </Link>
      </div>
    );
  }

  return (
    <>
      {errorMessage && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3.5 text-sm font-semibold text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {errorMessage}{" "}
            {state.error === "link_invalid" && (
              <Link
                href="/connexion/mot-de-passe-oublie"
                className="underline"
              >
                {t.auth.forgotTitle}
              </Link>
            )}
          </span>
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className={LABEL_CLASS}>
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
            className={INPUT_CLASS}
          />
          <p className="text-xs text-soleil-muted2 dark:text-soleil-muted-d">
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
    </>
  );
}
