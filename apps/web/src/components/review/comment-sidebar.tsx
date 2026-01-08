"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ThreadResponse } from "@/types";
import { useEffect, useState } from "react";

import { ThreadCard } from "./thread-card";

interface CommentSidebarProps {
  reviewId: string;
  threads: ThreadResponse[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onThreadUpdated: (thread: Partial<ThreadResponse> & { id: string }) => void;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 480;

export function CommentSidebar({
  threads,
  activeThreadId,
  onThreadClick,
  onThreadUpdated,
}: CommentSidebarProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const targetWidth = Math.min(Math.max(window.innerWidth * 0.4, MIN_WIDTH), MAX_WIDTH);
    setWidth(targetWidth);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH));
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className="h-full flex flex-col border-l relative flex-shrink-0"
      style={{ width: `${width}px` }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10",
          "hover:bg-primary/50 transition-colors",
          isDragging && "bg-primary"
        )}
      />

      <div className="p-4 border-b">
        <h2 className="font-semibold">Comments</h2>
        <p className="text-sm text-muted-foreground">
          {threads.length} thread{threads.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 pr-5 space-y-4 overflow-hidden">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => onThreadClick(thread.id)}
              onReply={async (body) => {
                const response = await fetch(
                  `/api/threads/${thread.id}/replies`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ body, authorType: "human" }),
                  },
                );
                if (response.ok) {
                  const comment = await response.json();
                  onThreadUpdated({
                    id: thread.id,
                    comments: [...thread.comments, comment],
                  });
                }
              }}
              onResolve={async () => {
                const response = await fetch(`/api/threads/${thread.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ resolved: !thread.resolved }),
                });
                if (response.ok) {
                  const updated = await response.json();
                  onThreadUpdated({
                    id: thread.id,
                    resolved: updated.resolved,
                    resolvedAt: updated.resolvedAt,
                  });
                }
              }}
            />
          ))}

          {threads.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Hover over any block and click + to add a comment
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
