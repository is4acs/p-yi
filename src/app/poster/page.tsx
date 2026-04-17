import Link from "next/link";
import type { Metadata } from "next";
import { Plus, ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Poster un bon plan",
  description: "Partage tes meilleures affaires avec la communauté Péyi.",
};

export default async function PosterPage() {
  const user = await requireUser("/poster");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:max-w-2xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
        <Plus className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Poster un bon plan
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Bienvenue @{user.username} ! Le formulaire pour partager tes trouvailles
        arrive dans la prochaine session.
      </p>
      <Link
        href="/bons-plans"
        className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-peyi-orange-600 transition hover:text-peyi-orange-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voir les bons plans
      </Link>
    </main>
  );
}
