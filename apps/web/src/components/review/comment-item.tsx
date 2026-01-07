"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CommentResponse } from "@/types";
import { Bot, ChevronDown, ChevronUp, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MAX_COLLAPSED_HEIGHT = 150;

interface CommentItemProps {
  comment: CommentResponse;
}

export function CommentItem({ comment }: CommentItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const isAgent = comment.authorType === "agent";
  const displayName = comment.authorName || (isAgent ? "AI Agent" : "Reviewer");

  useEffect(() => {
    if (contentRef.current) {
      setNeedsExpansion(contentRef.current.scrollHeight > MAX_COLLAPSED_HEIGHT);
    }
  }, [comment.body]);

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
          <div className="relative overflow-hidden">
            <div
              ref={contentRef}
              className={cn(
                "prose prose-sm prose-zinc dark:prose-invert max-w-none mt-1 transition-all duration-200",
                "break-words overflow-hidden",
                "[&>*]:max-w-full [&_*]:max-w-full",
                "[&_code]:break-all [&_code]:whitespace-pre-wrap",
                "[&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:my-2",
                "[&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:max-w-full",
                !isExpanded && needsExpansion && "max-h-[150px]"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {comment.body}
              </ReactMarkdown>
            </div>
            {!isExpanded && needsExpansion && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            )}
          </div>
          {needsExpansion && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show more
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
