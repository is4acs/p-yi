import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";

import { SectionHead, StripedImage } from "@/components/home/soleil/primitives";
import { isRenderableImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

type HomeActivity = {
  id: string;
  slug: string;
  name: string;
  /** « Roura · dès 45 € » ou « Rémire-Montjoly · gratuit ». */
  meta: string;
  coverImageUrl: string | null;
};

/**
 * « À faire dans le péyi » — deux activités, avec le badge « Validé ».
 *
 * Le badge dit quelque chose de vrai : les activités ne sont pas des
 * contributions d'utilisateurs mais un corpus éditorial vérifié, chaque
 * fiche étant sourcée. C'est ce qui distingue cette verticale des deux
 * autres, et le badge est le seul endroit de l'accueil qui le signale.
 */
export function HomeActivities({
  activities,
}: {
  activities: HomeActivity[];
}) {
  if (activities.length === 0) return null;

  return (
    <section aria-labelledby="a-faire">
      <SectionHead
        title="À faire dans le péyi"
        linkLabel="Activités"
        href="/activites"
      />
      <ul id="a-faire" className="mt-1">
        {activities.map((activity, index) => (
          <li
            key={activity.id}
            className={cn(
              "flex items-center gap-3 py-3",
              index < activities.length - 1 && "border-b border-hairline",
            )}
          >
            {isRenderableImageUrl(activity.coverImageUrl) ? (
              <div className="relative h-[50px] w-[50px] flex-none overflow-hidden rounded-md bg-surface">
                <Image
                  src={activity.coverImageUrl}
                  alt=""
                  fill
                  sizes="50px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <StripedImage className="h-[50px] w-[50px] flex-none" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold">
                <Link
                  href={`/activites/${activity.slug}`}
                  className="hover:underline"
                >
                  {activity.name}
                </Link>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {activity.meta}
              </p>
            </div>

            <span className="flex flex-none items-center gap-1 rounded-full bg-valid px-2 py-1 text-[10.5px] font-extrabold text-valid-foreground">
              <Check className="h-2.5 w-2.5" aria-hidden strokeWidth={2.5} />
              Validé
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
