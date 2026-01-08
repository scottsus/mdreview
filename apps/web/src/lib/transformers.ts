import type { Comment, Review, Thread } from "@/db/schema";
import type { CommentResponse, ReviewResponse, ThreadResponse } from "@/types";

export type ReviewWithThreads = Review & {
  threads: (Thread & { comments: Comment[] })[];
};

export function transformReviewToResponse(
  review: ReviewWithThreads,
  baseUrl: string,
): ReviewResponse {
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
