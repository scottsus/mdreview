import { db } from "@/db";
import { comments, reviews, threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { assertReviewAccess, optionalAuth } from "@/lib/auth-helpers";
import { createThreadSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reviewSlug } = await params;
    const body = await request.json();
    const data = createThreadSchema.parse(body);

    // Fetch review — needed for both the FK and the ownership check
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.slug, reviewSlug),
      columns: { id: true, userId: true, slug: true },
    });

    if (!review) {
      return errorResponse("not_found", "Review not found", 404);
    }

    // Resolve caller (optional auth — public reviews allow anonymous threads)
    const caller = await optionalAuth(request)

    // Gate: private review = owner only
    const denied = assertReviewAccess(review, caller)
    if (denied) {
      return denied
    }

    const result = await db.transaction(async (tx) => {
      const threadResult = await tx
        .insert(threads)
        .values({
          reviewId: review.id,
          startLine: data.startLine,
          endLine: data.endLine,
          selectedText: data.selectedText,
        })
        .returning();

      const thread = threadResult[0];
      if (!thread) {
        throw new Error("Failed to create thread");
      }

      const commentResult = await tx
        .insert(comments)
        .values({
          threadId: thread.id,
          body: data.body,
          authorType: data.authorType,
          authorName: data.authorName,
        })
        .returning();

      const comment = commentResult[0];
      if (!comment) {
        throw new Error("Failed to create comment");
      }

      return { thread, comment };
    });

    return successResponse(
      {
        id: result.thread.id,
        reviewId: result.thread.reviewId,
        startLine: result.thread.startLine,
        endLine: result.thread.endLine,
        selectedText: result.thread.selectedText,
        resolved: result.thread.resolved,
        comments: [
          {
            id: result.comment.id,
            body: result.comment.body,
            authorType: result.comment.authorType,
            authorName: result.comment.authorName,
            createdAt: result.comment.createdAt.toISOString(),
          },
        ],
        createdAt: result.thread.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
