import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

import { CommentForm } from "./CommentForm";
import { CommentItem, type CommentView } from "./CommentItem";

type Props = {
  dealId: string;
  dealSlug: string;
  currentUserId: string | null;
};

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  isDeleted: true,
  parentId: true,
  author: {
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      level: true,
    },
  },
} as const;

async function fetchThread(dealId: string): Promise<CommentView[]> {
  const rows = await prisma.comment
    .findMany({
      where: { dealId },
      orderBy: { createdAt: "asc" },
      select: commentSelect,
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[comments/thread] fetch failed", { dealId, err });
      return null;
    });

  if (!rows) return [];

  const byParent = new Map<string, CommentView[]>();
  const topLevel: CommentView[] = [];

  for (const c of rows) {
    const view: CommentView = {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      isDeleted: c.isDeleted,
      author: c.author,
      replies: [],
    };
    if (c.parentId) {
      const bucket = byParent.get(c.parentId) ?? [];
      bucket.push(view);
      byParent.set(c.parentId, bucket);
    } else {
      topLevel.push(view);
    }
  }

  for (const parent of topLevel) {
    parent.replies = byParent.get(parent.id) ?? [];
  }

  // Hide top-level soft-deleted comments that have no replies (should not
  // happen because we hard-delete those, but defensive).
  return topLevel.filter(
    (c) => !c.isDeleted || (c.replies && c.replies.length > 0),
  );
}

export async function CommentList({ dealId, dealSlug, currentUserId }: Props) {
  const comments = await fetchThread(dealId);

  return (
    <div className="space-y-5">
      {currentUserId ? (
        <CommentForm dealId={dealId} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Connecte-toi pour laisser un avis sur ce bon plan.
          </p>
          <Button asChild size="sm" className="mt-2">
            <Link
              href={`/connexion?next=${encodeURIComponent(
                `/bons-plans/${dealSlug}`,
              )}`}
            >
              Se connecter
            </Link>
          </Button>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Sois le premier à donner ton avis.
        </p>
      ) : (
        <ul className="space-y-5">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentItem
                comment={c}
                dealId={dealId}
                currentUserId={currentUserId}
                canReply={Boolean(currentUserId)}
                replyDisabledHint="Connecte-toi pour répondre."
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
