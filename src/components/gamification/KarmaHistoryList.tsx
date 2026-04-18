import Link from "next/link";
import { History } from "lucide-react";

import { formatRelativeTime } from "@/lib/format";
import {
  humanizeKarmaAction,
  type KarmaHistoryRow,
} from "@/lib/gamification/queries";
import { cn } from "@/lib/utils";

type Props = {
  rows: Array<
    KarmaHistoryRow & {
      dealSlug?: string | null;
    }
  >;
};

/**
 * Historique des mouvements de karma — un chip positif/négatif à droite
 * pour que le gain/malus soit lisible en un coup d'œil. Les lignes liées
 * à un deal sont cliquables ; les autres restent statiques.
 */
export function KarmaHistoryList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
          <History className="h-5 w-5" aria-hidden />
        </div>
        <p className="mt-3 text-sm font-medium">Aucune activité pour l&apos;instant</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Publie un bon plan, vote, commente — ton karma apparaîtra ici.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
      {rows.map((row) => {
        const positive = row.points > 0;
        const href = row.dealSlug ? `/bons-plans/${row.dealSlug}` : null;

        const body = (
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {row.description ?? humanizeKarmaAction(row.action)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatRelativeTime(row.createdAt)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                positive
                  ? "bg-peyi-green-100 text-peyi-green-700"
                  : "bg-red-100 text-red-700",
              )}
            >
              {positive ? "+" : ""}
              {row.points}
            </span>
          </div>
        );

        return (
          <li key={row.id}>
            {href ? (
              <Link
                href={href}
                className="block transition hover:bg-peyi-orange-50/40"
              >
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
