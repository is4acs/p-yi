"use client";

import Link from "next/link";
import { ArrowUp, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  bumpListingAction,
  deleteListingAction,
} from "@/app/poster/annonce/actions";

type Props = {
  listingId: string;
  editHref: string;
};

export function ListingAuthorControls({ listingId, editHref }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={editHref}>
          <Pencil className="h-4 w-4" aria-hidden />
          Modifier
        </Link>
      </Button>

      <form action={bumpListingAction}>
        <input type="hidden" name="listingId" value={listingId} />
        <SubmitButton variant="outline" size="sm" pendingLabel="Remontée…">
          <ArrowUp className="h-4 w-4" aria-hidden />
          Remonter
        </SubmitButton>
      </form>

      <form
        action={deleteListingAction}
        onSubmit={(e) => {
          if (!confirm("Supprimer cette annonce ? Cette action est définitive.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="listingId" value={listingId} />
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
