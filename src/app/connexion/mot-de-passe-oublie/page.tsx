import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { getMessages } from "@/lib/i18n";

import { requestPasswordResetAction } from "./actions";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description:
    "Réinitialise ton mot de passe Péyi — on t'envoie un lien par e-mail.",
  alternates: { canonical: "/connexion/mot-de-passe-oublie" },
  robots: { index: false, follow: true },
};

export default async function MotDePasseOubliePage() {
  const t = await getMessages();

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

        <ForgotPasswordForm action={requestPasswordResetAction} />

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
