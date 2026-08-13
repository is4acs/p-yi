"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { LEVEL_META } from "@/lib/deals/user-level";
import type { UserLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { deleteCommentAction } from "@/app/bons-plans/comments/actions";
import { useLocale, useMessages } from "@/components/soleil/I18nProvider";

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
  // Alternance des avatars « Soleil péyi » : orange plein / forêt plein
  // (la liste passe la parité de l'index).
  tone?: "orange" | "forest";
};

export function CommentItem({
  comment,
  dealId,
  currentUserId,
  canReply,
  replyDisabledHint,
  isReply = false,
  tone = "orange",
}: Props) {
  const t = useMessages();
  const locale = useLocale();
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
        isReply ? "border-l-2 border-soleil-line pl-3 dark:border-soleil-line-d" : "",
      )}
    >
      <div className="flex gap-2.5">
        <span
          aria-hidden
          className={cn(
            "flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-xs font-extrabold",
            tone === "orange"
              ? "bg-soleil-orange text-soleil-forest"
              : "bg-soleil-forest text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest",
          )}
        >
          {comment.author.username.trim()[0]?.toUpperCase() ?? "?"}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
            <b className="text-soleil-forest dark:text-soleil-cream">
              {comment.author.username}
            </b>
            <span className="text-soleil-muted2 dark:text-soleil-muted-d">
              · {level.label} · {formatRelativeTime(comment.createdAt, locale)}
            </span>
          </div>

          {comment.isDeleted ? (
            <p className="text-[12.5px] italic text-soleil-muted2 dark:text-soleil-muted-d">
              {t.dealDetail.deletedComment}
            </p>
          ) : (
            <p className="whitespace-pre-line break-words text-[12.5px] leading-normal text-soleil-body dark:text-soleil-body-d">
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
                  {t.dealDetail.reply}
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
                  {t.dealDetail.delete}
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
          {comment.replies.map((reply, i) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              dealId={dealId}
              currentUserId={currentUserId}
              canReply={false}
              isReply
              tone={i % 2 === 0 ? "forest" : "orange"}
            />
          ))}
        </div>
      )}
    </article>
  );
}
