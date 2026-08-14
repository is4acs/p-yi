"use client";

import { useActionState } from "react";
import { AlertCircle, Mail } from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import { useMessages } from "@/components/soleil/I18nProvider";
import {
  AUTH_FORM_IDLE,
  authErrorMessage,
  type AuthFormState,
} from "@/lib/auth/errors";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/soleil/field";

/**
 * Formulaire « mot de passe oublié » (useActionState) : l'état succès /
 * erreur vit ici, sans navigation — l'e-mail saisi n'est pas perdu en
 * cas d'erreur, et les messages suivent la langue de l'interface.
 */
export function ForgotPasswordForm({
  action,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const t = useMessages();
  const [state, formAction] = useActionState(action, AUTH_FORM_IDLE);
  const errorMessage = authErrorMessage(t, state);

  if (state.sent) {
    return (
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
          <span>{errorMessage}</span>
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className={LABEL_CLASS}>
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
  );
}
