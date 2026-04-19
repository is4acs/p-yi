"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteDealAction } from "@/app/poster/actions";

type Props = {
  dealId: string;
  editHref: string;
};

export function AuthorControls({ dealId, editHref }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={editHref}>
          <Pencil className="h-4 w-4" aria-hidden />
          Modifier
        </Link>
      </Button>
      <form
        action={deleteDealAction}
        onSubmit={(e) => {
          if (!confirm("Supprimer ce bon plan ? Cette action est définitive.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="dealId" value={dealId} />
        <SubmitButton
          variant="outline"
          size="sm"
          pendingLabel="Suppression…"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Supprimer
        </SubmitButton>
      </form>
    </div>
  );
}
