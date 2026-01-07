import { db } from "@/db";
import { comments, reviews, threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { createReplySchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const body = await request.json();
    const data = createReplySchema.parse(body);

    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, threadId),
      with: { review: true },
    });

    if (!thread) {
      return errorResponse("not_found", "Thread not found", 404);
    }

    const result = await db
      .insert(comments)
      .values({
        threadId,
        body: data.body,
        authorType: data.authorType,
        authorName: data.authorName,
      })
      .returning();

    const comment = result[0];
    if (!comment) {
      throw new Error("Failed to create comment");
    }

    // Reset review status to pending when agent adds a comment
    if (data.authorType === "agent" && thread.review.status !== "pending") {
      await db
        .update(reviews)
        .set({ status: "pending", decisionMessage: null, decidedAt: null })
        .where(eq(reviews.id, thread.reviewId));
    }

    return successResponse(
      {
        id: comment.id,
        threadId: comment.threadId,
        body: comment.body,
        authorType: comment.authorType,
        authorName: comment.authorName,
        createdAt: comment.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
