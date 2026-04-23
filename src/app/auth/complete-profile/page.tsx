import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

import { completeProfileAction } from "./actions";

export const metadata: Metadata = {
  title: "Choisis ton pseudo",
  description: "Encore une étape avant de plonger dans les bons plans.",
  robots: { index: false, follow: false },
};

export default async function CompleteProfilePage(
  props: {
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  // Already has a profile → skip this step.
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  if (existing) redirect("/bons-plans");

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col px-4 pb-16 pt-10 sm:pt-16">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Choisis ton pseudo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Il sera visible sur tes bons plans et tes annonces. On ne peut pas le
          changer facilement, alors choisis bien.
        </p>
      </div>

      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      <form action={completeProfileAction} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">Pseudo</Label>
          <Input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            pattern="[a-z0-9_.]{3,20}"
            placeholder="marie973"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            3 à 20 caractères, minuscules, chiffres, _ et . uniquement.
          </p>
        </div>

        <SubmitButton size="lg" className="w-full" pendingLabel="Création…">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          C&apos;est parti
        </SubmitButton>
      </form>
    </main>
  );
}
