import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { safeInternalPath } from "@/lib/safe-redirect";
import { getMessages } from "@/lib/i18n";
import { Sun } from "@/components/soleil/Sun";

import { completeProfileAction } from "./actions";
import { CompleteProfileForm } from "./complete-form";

export const metadata: Metadata = {
  title: "Choisis ton pseudo",
  description: "Encore une étape avant de plonger dans les bons plans.",
  robots: { index: false, follow: false },
};

export default async function CompleteProfilePage(props: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const rawNext = Array.isArray(searchParams.next)
    ? searchParams.next[0]
    : searchParams.next;
  const next = safeInternalPath(rawNext, "/bons-plans");
  const t = await getMessages();

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
  if (existing) redirect(next);

  return (
    <main className="min-h-screen bg-soleil-cream px-4 pb-10 text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto flex w-full max-w-md flex-col pt-10">
        <div className="flex flex-col items-center text-center">
          <span className="flex items-end gap-2">
            <Sun w={26} />
            <span className="font-display text-[32px] font-extrabold leading-[0.85] tracking-[-0.5px]">
              péyi
            </span>
          </span>
          <h1 className="mt-6 font-display text-[26px] font-extrabold leading-tight tracking-[-0.5px]">
            {t.auth.cpTitle}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-soleil-muted2 dark:text-soleil-muted-d">
            {t.auth.cpSub}
          </p>
        </div>

        <CompleteProfileForm action={completeProfileAction} next={next} />
      </div>
    </main>
  );
}
