"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Mail } from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { useMessages } from "@/components/soleil/I18nProvider";
import {
  AUTH_FORM_IDLE,
  authErrorMessage,
  type AuthFormState,
} from "@/lib/auth/errors";

import { GoogleSignInButton } from "./google-sign-in-button";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/soleil/field";

/**
 * Formulaire connexion / inscription « Soleil péyi ».
 *
 * Le basculement entre les deux onglets est purement client (instantané,
 * l'e-mail saisi n'est pas perdu). Les Server Actions sont branchées via
 * `useActionState` : une erreur revient comme CODE typé rendu ici dans
 * la langue de l'interface, SANS navigation — les champs gardent leur
 * valeur (l'ancien pattern redirect-avec-erreur vidait le formulaire à
 * chaque « pseudo déjà pris »). Les succès restent des redirects
 * serveur ; l'envoi de l'e-mail de confirmation affiche sa bannière ici
 * même, en conservant la saisie.
 */

type Props = {
  initialMode: "signin" | "signup";
  /** Chemin interne déjà validé côté serveur. */
  next: string;
  signInAction: (
    prev: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  signUpAction: (
    prev: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
};

export function AuthForm({
  initialMode,
  next,
  signInAction,
  signUpAction,
}: Props) {
  const t = useMessages();
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [signInState, signInFormAction] = useActionState(
    signInAction,
    AUTH_FORM_IDLE,
  );
  const [signUpState, signUpFormAction] = useActionState(
    signUpAction,
    AUTH_FORM_IDLE,
  );
  const isSignup = mode === "signup";

  // Chaque onglet a son état : une erreur de connexion ne s'affiche pas
  // sur l'onglet inscription et réciproquement.
  const state = isSignup ? signUpState : signInState;
  const errorMessage = authErrorMessage(t, state);
  const confirmSent = isSignup && signUpState.sent === true;

  return (
    <>
      <div
        role="tablist"
        aria-label={t.auth.tabsAria}
        className="mt-6 grid grid-cols-2 rounded-full border-[1.5px] border-soleil-border bg-soleil-input p-1 text-sm dark:border-soleil-border-d dark:bg-soleil-forest"
      >
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            id={`auth-tab-${value}`}
            type="button"
            role="tab"
            aria-selected={mode === value}
            aria-controls="auth-panel"
            onClick={() => setMode(value)}
            className={cn(
              "min-h-[40px] rounded-full px-3 text-center font-bold transition",
              mode === value
                ? "bg-soleil-forest font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
                : "text-soleil-muted2 dark:text-soleil-muted-d",
            )}
          >
            {value === "signin" ? t.auth.signin : t.auth.signup}
          </button>
        ))}
      </div>

      {confirmSent && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 rounded-[14px] bg-soleil-valid p-3.5 text-sm text-soleil-forest dark:bg-soleil-valid-d"
        >
          <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-extrabold">{t.auth.checkInbox}</p>
            <p className="mt-0.5 text-xs font-medium">{t.auth.checkInboxSub}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3.5 text-sm font-semibold text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{errorMessage}</span>
        </div>
      )}

      <GoogleSignInButton next={next} />

      <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.5px] text-soleil-muted2 dark:text-soleil-muted-d">
        <span
          className="h-px flex-1 bg-soleil-line dark:bg-soleil-line-d"
          aria-hidden
        />
        <span>{t.auth.orByEmail}</span>
        <span
          className="h-px flex-1 bg-soleil-line dark:bg-soleil-line-d"
          aria-hidden
        />
      </div>

      <form
        id="auth-panel"
        role="tabpanel"
        aria-labelledby={`auth-tab-${mode}`}
        action={isSignup ? signUpFormAction : signInFormAction}
        className="space-y-4"
      >
        <input type="hidden" name="next" value={next} />

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
            autoFocus
            placeholder={t.auth.emailPlaceholder}
            className={INPUT_CLASS}
          />
        </div>

        {/*
          Champ monté en permanence mais masqué hors inscription : le
          navigateur conserve ainsi la valeur saisie si l'utilisateur
          bascule d'onglet par erreur. `disabled` l'exclut de l'envoi en
          mode connexion.
        */}
        <div className={cn("space-y-1.5", !isSignup && "hidden")}>
          <label htmlFor="username" className={LABEL_CLASS}>
            {t.auth.username}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required={isSignup}
            disabled={!isSignup}
            autoComplete="username"
            pattern="[a-z0-9_.]{3,20}"
            placeholder={t.auth.usernamePlaceholder}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-soleil-muted2 dark:text-soleil-muted-d">
            {t.auth.usernameHelp}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className={LABEL_CLASS}>
            {t.auth.password}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={t.auth.passwordPlaceholder}
              className={cn(INPUT_CLASS, "pr-12")}
            />
            {/* Voir son mot de passe évite l'aller-retour « mot de passe
                incorrect » sur clavier mobile. Cible tactile 44px. */}
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? t.auth.hidePassword : t.auth.showPassword
              }
              className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-soleil-muted2 transition hover:text-soleil-forest dark:text-soleil-muted-d dark:hover:text-soleil-cream"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          {!isSignup && (
            <div className="text-right">
              <Link
                href="/connexion/mot-de-passe-oublie"
                className="text-xs font-bold text-soleil-otext hover:underline dark:text-soleil-otext-d"
              >
                {t.auth.forgot}
              </Link>
            </div>
          )}
        </div>

        <SubmitButton
          className="min-h-[48px] w-full rounded-full bg-soleil-forest text-[14px] font-extrabold text-soleil-cream hover:bg-soleil-forest/90 dark:bg-soleil-cream dark:text-soleil-forest dark:hover:bg-soleil-cream/90"
          pendingLabel={isSignup ? t.auth.signupPending : t.auth.signinPending}
        >
          {isSignup ? t.auth.createAccount : t.auth.signin}
        </SubmitButton>
      </form>
    </>
  );
}
