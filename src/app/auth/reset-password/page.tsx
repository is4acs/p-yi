import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/i18n";

import { updatePasswordAction } from "./actions";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Choisir un nouveau mot de passe",
  description: "Définis un nouveau mot de passe pour ton compte Péyi.",
  alternates: { canonical: "/auth/reset-password" },
  robots: { index: false, follow: false },
};

// Page dynamique : on lit la session courante pour s'assurer que le lien
// de recovery a bien été consommé avant d'afficher le formulaire.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const t = await getMessages();

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

        <ResetPasswordForm action={updatePasswordAction} />
      </div>
    </main>
  );
}
