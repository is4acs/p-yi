import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col px-4 pb-16 pt-6 sm:pt-12">
      <Link
        href="/connexion"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour
      </Link>

      <div className="mt-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-700">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
          Nouveau mot de passe
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choisis un mot de passe solide que tu n&apos;utilises pas ailleurs.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form action={updatePasswordAction} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="8 caractères minimum"
          />
          <p className="text-xs text-muted-foreground">
            Au moins 8 caractères. Un mélange de lettres, chiffres et
            symboles est recommandé.
          </p>
        </div>

        <SubmitButton size="lg" className="w-full" pendingLabel="Mise à jour…">
          Mettre à jour
        </SubmitButton>
      </form>
    </main>
  );
}
