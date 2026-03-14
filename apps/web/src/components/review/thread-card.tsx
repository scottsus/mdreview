"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ThreadResponse } from "@/types";
import { Check, ChevronDown, ChevronRight, Reply } from "lucide-react";
import { useEffect, useState } from "react";

import { CommentItem } from "./comment-item";

interface ThreadCardProps {
  thread: ThreadResponse;
  isActive: boolean;
  onClick: () => void;
  onReply: (body: string) => Promise<void>;
  onResolve: () => Promise<void>;
}

export function ThreadCard({
  thread,
  isActive,
  onClick,
  onReply,
  onResolve,
}: ThreadCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  useEffect(() => {
    if (thread.resolved && !isActive && !isReplying) {
      setIsManuallyExpanded(false);
    }
  }, [thread.resolved, isActive, isReplying]);

  const canCollapse = thread.resolved && !isActive;
  const isOpen = canCollapse ? isManuallyExpanded : true;

  const handleSubmitReply = async () => {
    if (!replyBody.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(replyBody.trim());
      setReplyBody("");
      setIsReplying(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerContent = (
    <div
      className={cn(
        "px-3 py-2.5 bg-muted/60 border-b flex items-center justify-between cursor-pointer",
        "hover:bg-muted/80 transition-colors",
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {canCollapse &&
          (isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ))}
        <span className="text-sm font-medium text-foreground tabular-nums">
          Line {thread.startLine}
          {thread.endLine !== thread.startLine && `–${thread.endLine}`}
        </span>
      </div>
      <span className="text-xs text-muted-foreground line-clamp-1 ml-2 italic max-w-[55%] text-right">
        {thread.selectedText.slice(0, 50)}
        {thread.selectedText.length > 50 && "…"}
      </span>
    </div>
  );

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={canCollapse ? setIsManuallyExpanded : undefined}
      disabled={!canCollapse}
      data-thread-id={thread.id}
      className={cn(
        "border rounded-lg overflow-hidden transition-all scroll-mt-4",
        isActive && "ring-2 ring-violet-500 dark:ring-violet-400",
        thread.resolved && "opacity-60",
      )}
    >
      {canCollapse ? (
        <CollapsibleTrigger asChild>{headerContent}</CollapsibleTrigger>
      ) : (
        headerContent
      )}

      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-[collapsible-down_200ms_ease-out] data-[state=closed]:animate-[collapsible-up_200ms_ease-out]">
        <div className="divide-y">
          {thread.comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>

        {isReplying && (
          <div className="p-3 border-t bg-muted/30">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              className="min-h-[60px] resize-none text-sm"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmitReply();
                }}
                disabled={isSubmitting || !replyBody.trim()}
              >
                {isSubmitting ? "Sending…" : "Reply"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReplying(false);
                  setReplyBody("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-3 py-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsReplying(true);
            }}
            className="h-7 gap-1 text-xs text-muted-foreground"
          >
            <Reply className="h-3 w-3" />
            Reply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            className={cn(
              "h-7 gap-1 text-xs",
              thread.resolved
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            <Check className="h-3 w-3" />
            {thread.resolved ? "Resolved" : "Resolve"}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
