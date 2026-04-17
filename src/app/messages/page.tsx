import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Messages",
  description: "Discute avec les vendeurs et les membres de la communauté Péyi.",
};

export default function MessagesPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:max-w-2xl">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
        <MessageSquare className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Messagerie
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Bientôt disponible. La messagerie privée arrive avec les comptes utilisateurs.
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
