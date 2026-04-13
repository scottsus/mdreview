import { db } from "@/db";
import { comments, threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { assertReviewAccess, optionalAuth } from "@/lib/auth-helpers";
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

    // Fetch thread with parent review — need review.userId for ownership check
    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, threadId),
      with: {
        review: {
          columns: { userId: true },
        },
      },
    });

    if (!thread) {
      return errorResponse("not_found", "Thread not found", 404);
    }

    // Resolve caller
    const caller = await optionalAuth(request)

    // Gate via parent review ownership
    const denied = assertReviewAccess(thread.review, caller)
    if (denied) {
      return denied
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
