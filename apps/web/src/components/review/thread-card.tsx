"use client";

import { cn } from "@/lib/utils";
import { ThreadResponse } from "@/types";
import { Check, Reply } from "lucide-react";
import { useState } from "react";

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

  return (
    <div
      data-thread-id={thread.id}
      className={cn(
        "border rounded-lg overflow-hidden cursor-pointer transition-colors scroll-mt-4",
        isActive && "ring-2 ring-primary",
        thread.resolved && "opacity-60",
      )}
      onClick={onClick}
    >
      <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          Line {thread.startLine}
          {thread.endLine !== thread.startLine && `-${thread.endLine}`}
        </span>
        <span className="text-xs text-muted-foreground line-clamp-1 ml-2 italic max-w-[60%] text-right">
          {thread.selectedText.slice(0, 50)}
          {thread.selectedText.length > 50 && "..."}
        </span>
      </div>

      <div className="divide-y">
        {thread.comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {isReplying && (
        <div className="p-3 border-t bg-muted/30">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            className="w-full min-h-[60px] p-2 text-sm border rounded-md resize-none"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSubmitReply();
              }}
              disabled={isSubmitting || !replyBody.trim()}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Reply"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsReplying(false);
                setReplyBody("");
              }}
              className="px-2 py-1 text-xs border rounded hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 border-t">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsReplying(true);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Reply className="h-3 w-3" />
          Reply
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResolve();
          }}
          className={cn(
            "flex items-center gap-1 text-xs",
            thread.resolved
              ? "text-green-600"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Check className="h-3 w-3" />
          {thread.resolved ? "Resolved" : "Resolve"}
        </button>
      </div>
    </div>
  );
}
