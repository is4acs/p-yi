"use client";

import { useActionState } from "react";
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
 * Formulaire de choix du pseudo (useActionState) : « pseudo déjà pris »
 * s'affiche sans navigation ni perte de saisie, dans la langue de
 * l'interface.
 */
export function CompleteProfileForm({
  action,
  next,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** Chemin interne déjà validé côté serveur. */
  next: string;
}) {
  const t = useMessages();
  const [state, formAction] = useActionState(action, AUTH_FORM_IDLE);
  const errorMessage = authErrorMessage(t, state);

  return (
    <>
      {errorMessage && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3.5 text-sm font-semibold text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{errorMessage}</span>
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1.5">
          <label htmlFor="username" className={LABEL_CLASS}>
            {t.auth.username}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            pattern="[a-z0-9_.]{3,20}"
            placeholder={t.auth.usernamePlaceholder}
            autoFocus
            className={INPUT_CLASS}
          />
          <p className="text-xs text-soleil-muted2 dark:text-soleil-muted-d">
            {t.auth.usernameHelp}
          </p>
        </div>

        <SubmitButton
          className="min-h-[48px] w-full rounded-full bg-soleil-forest text-[14px] font-extrabold text-soleil-cream hover:bg-soleil-forest/90 dark:bg-soleil-cream dark:text-soleil-forest dark:hover:bg-soleil-cream/90"
          pendingLabel={t.auth.cpPending}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {t.auth.cpCta}
        </SubmitButton>
      </form>
    </>
  );
}
