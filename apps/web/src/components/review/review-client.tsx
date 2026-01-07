"use client";

import { BlockSelection, ReviewResponse, ThreadResponse } from "@/types";
import { useCallback, useState } from "react";

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

  const handleStatusChange = useCallback(
    (status: string, decisionMessage: string | null) => {
      setReview((prev) => ({
        ...prev,
        status,
        decisionMessage,
      }));
    },
    [],
  );

  const handleExport = useCallback(
    async (format: "yaml" | "json") => {
      const response = await fetch(
        `/api/reviews/${review.id}/export?format=${format}`,
      );
      if (!response.ok) return;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `review-${review.slug}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [review.id, review.slug],
  );

  const handleCreateThread = useCallback(
    async (selection: BlockSelection, body: string) => {
      const response = await fetch(`/api/reviews/${review.id}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startLine: selection.startLine,
          endLine: selection.endLine,
          selectedText: selection.blockContent,
          body,
          authorType: "human",
        }),
      });

      if (response.ok) {
        const thread = await response.json();
        handleThreadCreated(thread);
      }
    },
    [review.id, handleThreadCreated],
  );

  return (
    <div className="h-screen bg-background pb-20 overflow-hidden">
      <div className="flex h-[calc(100vh-5rem)]">
        <div className="flex-1 min-w-0 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <ReviewHeader
              title={review.title}
              status={review.status}
              decisionMessage={review.decisionMessage}
            />
            <MarkdownViewer
              content={review.content}
              threads={review.threads}
              activeThreadId={activeThreadId}
              onThreadClick={handleThreadClick}
              onCreateThread={handleCreateThread}
            />
          </div>
        </div>

        <CommentSidebar
          reviewId={review.id}
          threads={review.threads}
          activeThreadId={activeThreadId}
          onThreadClick={handleThreadClick}
          onThreadUpdated={handleThreadUpdated}
        />
      </div>

      <ReviewActions
        reviewId={review.id}
        status={review.status}
        onStatusChange={handleStatusChange}
        onExport={handleExport}
      />
    </div>
  );
}
