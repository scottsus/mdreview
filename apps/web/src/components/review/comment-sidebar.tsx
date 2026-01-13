"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { reviewApi } from "@/lib/api-service";
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ThreadResponse } from "@/types";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ThreadCard } from "./thread-card";

interface CommentSidebarProps {
  threads: ThreadResponse[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onThreadUpdated: (thread: Partial<ThreadResponse> & { id: string }) => void;
}

export function CommentSidebar({
  threads,
  activeThreadId,
  onThreadClick,
  onThreadUpdated,
}: CommentSidebarProps) {
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const scrollAreaRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targetWidth = Math.min(
      Math.max(window.innerWidth * 0.4, SIDEBAR_MIN_WIDTH),
      SIDEBAR_MAX_WIDTH,
    );
    setWidth(targetWidth);
  }, []);

  const scrollThreadCardToTop = (threadId: string) => {
    const root = scrollAreaRootRef.current;
    if (!root) return;

    const viewport = root.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;

    const card = root.querySelector(
      `[data-thread-id="${CSS.escape(threadId)}"]`,
    ) as HTMLElement | null;

    if (!viewport || !card) return;

    const viewportRect = viewport.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const nearTopThresholdPx = 24;
    const isAlreadyNearTop =
      cardRect.top >= viewportRect.top &&
      cardRect.top <= viewportRect.top + nearTopThresholdPx;

    if (isAlreadyNearTop) return;

    card.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSidebarThreadClick = (threadId: string) => {
    onThreadClick(threadId);

    requestAnimationFrame(() => scrollThreadCardToTop(threadId));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(newWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH));
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

      <ScrollArea ref={scrollAreaRootRef} className="flex-1">
        <div className="p-4 pr-5 space-y-4 overflow-hidden">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => handleSidebarThreadClick(thread.id)}
              onReply={async (body) => {
                try {
                  const comment = await reviewApi.addReply(thread.id, body);
                  onThreadUpdated({
                    id: thread.id,
                    comments: [...thread.comments, comment],
                  });
                } catch (error) {
                  toast.error("Failed to add reply");
                  console.error("Add reply error:", error);
                }
              }}
              onResolve={async () => {
                try {
                  const updated = await reviewApi.resolveThread(
                    thread.id,
                    !thread.resolved,
                  );
                  onThreadUpdated({
                    id: thread.id,
                    resolved: updated.resolved,
                    resolvedAt: updated.resolvedAt,
                  });
                } catch (error) {
                  toast.error("Failed to update thread");
                  console.error("Resolve thread error:", error);
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
