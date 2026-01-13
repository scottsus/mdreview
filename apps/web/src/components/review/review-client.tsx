"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { reviewApi } from "@/lib/api-service";
import { BlockSelection, ReviewResponse, ThreadResponse } from "@/types";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { CommentSidebar } from "./comment-sidebar";
import { MarkdownViewer } from "./markdown-viewer";
import { ReviewActions } from "./review-actions";
import { ReviewHeader } from "./review-header";

interface ReviewClientProps {
  initialReview: ReviewResponse;
}

export function ReviewClient({ initialReview }: ReviewClientProps) {
  const [review, setReview] = useState(initialReview);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const handleThreadClick = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  const handleThreadCreated = useCallback((thread: ThreadResponse) => {
    setReview((prev) => ({
      ...prev,
      threads: [...prev.threads, thread],
    }));
    setActiveThreadId(thread.id);
  }, []);

  const handleThreadUpdated = useCallback(
    (update: Partial<ThreadResponse> & { id: string }) => {
      setReview((prev) => ({
        ...prev,
        threads: prev.threads.map((t) =>
          t.id === update.id ? { ...t, ...update } : t,
        ),
      }));
    },
    [],
  );

  const handleExport = useCallback(
    async (format: "yaml" | "json") => {
      try {
        const blob = await reviewApi.exportReview(review.id, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `review-${review.slug}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        toast.error("Failed to export review");
        console.error("Export error:", error);
      }
    },
    [review.id, review.slug],
  );

  const handleCreateThread = useCallback(
    async (selection: BlockSelection, body: string) => {
      try {
        const thread = await reviewApi.createThread(review.id, {
          startLine: selection.startLine,
          endLine: selection.endLine,
          selectedText: selection.blockContent,
          body,
          authorType: "human",
        });
        handleThreadCreated(thread);
      } catch (error) {
        toast.error("Failed to create comment");
        console.error("Create thread error:", error);
      }
    },
    [review.id, handleThreadCreated],
  );

  return (
    <div className="h-screen bg-background pb-20 overflow-hidden">
      <div className="flex h-[calc(100vh-5rem)]">
        <ScrollArea className="flex-1 min-w-0" scrollbarPosition="left" type="always">
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              <ReviewHeader title={review.title} />
              <MarkdownViewer
                content={review.content}
                threads={review.threads}
                activeThreadId={activeThreadId}
                onThreadClick={handleThreadClick}
                onCreateThread={handleCreateThread}
              />
            </div>
          </div>
        </ScrollArea>

        <CommentSidebar
          threads={review.threads}
          activeThreadId={activeThreadId}
          onThreadClick={handleThreadClick}
          onThreadUpdated={handleThreadUpdated}
        />
      </div>

      <ReviewActions onExport={handleExport} />
    </div>
  );
}
