import Link from "next/link";
import type { Metadata } from "next";
import { User, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Profil",
  description: "Ton profil Péyi : karma, badges et historique.",
};

export default function ProfilPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:max-w-2xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
        <User className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Profil
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Bientôt disponible. Tu pourras suivre ton karma, tes badges et tes bons plans
        partagés depuis cet écran.
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
