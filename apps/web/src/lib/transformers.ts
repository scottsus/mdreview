import type { Comment, Review, Thread } from "@/db/schema";
import type { CommentResponse, ReviewResponse, ThreadResponse } from "@/types";

export type ReviewWithThreads = Review & {
  threads: (Thread & { comments: Comment[] })[];
};

/**
 * Transforms a full review DB record into an API response shape.
 * 1. Maps all thread and comment fields
 * 2. Computes isOwner from callerId vs review.userId
 */
export function transformReviewToResponse(
  review: ReviewWithThreads,
  baseUrl: string,
  callerId: string | null = null,
): ReviewResponse {
  const isOwner = review.userId !== null && callerId === review.userId

  return {
    id: review.id,
    slug: review.slug,
    url: `${baseUrl}/review/${review.slug}`,
    content: review.content,
    title: review.title,
    status: review.status,
    decisionMessage: review.decisionMessage,
    decidedAt: review.decidedAt?.toISOString() ?? null,
    source: review.source,
    isOwner,
    threads: review.threads.map(transformThreadToResponse),
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export function transformThreadToResponse(
  thread: Thread & { comments: Comment[] },
): ThreadResponse {
  return {
    id: thread.id,
    startLine: thread.startLine,
    endLine: thread.endLine,
    selectedText: thread.selectedText,
    resolved: thread.resolved,
    resolvedAt: thread.resolvedAt?.toISOString() ?? null,
    comments: thread.comments.map(transformCommentToResponse),
    createdAt: thread.createdAt.toISOString(),
  };
}

export function transformCommentToResponse(comment: Comment): CommentResponse {
  return {
    id: comment.id,
    body: comment.body,
    authorType: comment.authorType,
    authorName: comment.authorName,
    createdAt: comment.createdAt.toISOString(),
  };
}
