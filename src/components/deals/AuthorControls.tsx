"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteDealAction } from "@/app/poster/actions";
import { useMessages } from "@/components/soleil/I18nProvider";

type Props = {
  dealId: string;
  editHref: string;
};

export function AuthorControls({ dealId, editHref }: Props) {
  const t = useMessages();
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={editHref}>
          <Pencil className="h-4 w-4" aria-hidden />
          {t.common.edit}
        </Link>
      </Button>
      <form
        action={deleteDealAction}
        onSubmit={(e) => {
          if (!confirm(t.common.deleteDealConfirm)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="dealId" value={dealId} />
        <SubmitButton
          variant="outline"
          size="sm"
          pendingLabel={t.common.deleting}
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {t.common.delete}
        </SubmitButton>
      </form>
    </div>
  );
}
