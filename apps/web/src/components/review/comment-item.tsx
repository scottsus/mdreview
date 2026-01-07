"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CommentResponse } from "@/types";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CommentItemProps {
  comment: CommentResponse;
}

export function CommentItem({ comment }: CommentItemProps) {
  const isAgent = comment.authorType === "agent";
  const displayName = comment.authorName || (isAgent ? "AI Agent" : "Reviewer");

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-3">
      <div className="flex items-start gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback
            className={cn(isAgent ? "bg-blue-100" : "bg-green-100")}
          >
            {isAgent ? (
              <Bot className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {formatTime(comment.createdAt)}
            </span>
          </div>
          <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none mt-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {comment.body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
