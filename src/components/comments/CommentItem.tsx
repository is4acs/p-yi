"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { LEVEL_META } from "@/lib/deals/user-level";
import type { UserLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { deleteCommentAction } from "@/app/bons-plans/comments/actions";

import { CommentForm } from "./CommentForm";
import { ReportDialog } from "@/components/reports/ReportDialog";

export type CommentView = {
  id: string;
  content: string;
  createdAt: Date;
  isDeleted: boolean;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
    level: UserLevel;
  };
  replies?: CommentView[];
};

type Props = {
  comment: CommentView;
  dealId: string;
  currentUserId: string | null;
  canReply: boolean;
  replyDisabledHint?: string;
  isReply?: boolean;
};

export function CommentItem({
  comment,
  dealId,
  currentUserId,
  canReply,
  replyDisabledHint,
  isReply = false,
}: Props) {
  const [showReply, setShowReply] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isAuthor = currentUserId === comment.author.id;
  const canDelete = isAuthor && !comment.isDeleted;
  // Fallback BEGINNER si la DB contient un niveau d'enum retiré du code
  // (migration d'enum partielle). Sans ça, `level.emoji` plus bas crash
  // la page détail entière — et `CommentItem` est rendu pour chaque
  // commentaire sur chaque bon plan.
  const level = LEVEL_META[comment.author.level] ?? LEVEL_META.BEGINNER;

  function onDelete() {
    if (!confirm("Supprimer ce commentaire ?")) return;
    const fd = new FormData();
    fd.append("commentId", comment.id);
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteCommentAction(fd);
      if (!res.ok) {
        setDeleteError(res.error ?? "Erreur lors de la suppression.");
      }
    });
  }

  return (
    <article
      className={cn(
        "space-y-2",
        isReply ? "border-l-2 border-peyi-orange-100 pl-3" : "",
      )}
    >
      <div className="flex gap-2.5">
        <UserAvatar
          username={comment.author.username}
          avatarUrl={comment.author.avatarUrl}
          size="sm"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              @{comment.author.username}
            </span>
            <span aria-hidden>·</span>
            <span>
              <span aria-hidden>{level.emoji}</span> {level.label}
            </span>
            <span aria-hidden>·</span>
            <span>{formatRelativeTime(comment.createdAt)}</span>
          </div>

          {comment.isDeleted ? (
            <p className="text-sm italic text-muted-foreground">
              [commentaire supprimé]
            </p>
          ) : (
            <p className="whitespace-pre-line text-sm text-foreground">
              {comment.content}
            </p>
          )}

          {!comment.isDeleted && (
            <div className="flex items-center gap-1">
              {!isReply && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => canReply && setShowReply((v) => !v)}
                  disabled={!canReply}
                  title={canReply ? undefined : replyDisabledHint}
                >
                  <MessageSquare className="h-3 w-3" aria-hidden />
                  Répondre
                </Button>
              )}
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onDelete}
                  disabled={pending}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                  Supprimer
                </Button>
              )}
              {!isAuthor && currentUserId && (
                <ReportDialog
                  kind="comment"
                  targetId={comment.id}
                  title="Signaler ce commentaire"
                  variant="ghost"
                />
              )}
            </div>
          )}

          {deleteError && (
            <p role="alert" className="text-xs text-destructive">
              {deleteError}
            </p>
          )}

          {showReply && (
            <div className="mt-2">
              <CommentForm
                dealId={dealId}
                parentId={comment.id}
                compact
                autoFocus
                placeholder={`Répondre à @${comment.author.username}…`}
                onSuccess={() => setShowReply(false)}
                onCancel={() => setShowReply(false)}
              />
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-9 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              dealId={dealId}
              currentUserId={currentUserId}
              canReply={false}
              isReply
            />
          ))}
        </div>
      )}
    </article>
  );
}
