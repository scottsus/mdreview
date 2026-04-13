import { db } from "@/db";
import { threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { assertReviewAccess, optionalAuth } from "@/lib/auth-helpers";
import { updateThreadSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const body = await request.json();
    const data = updateThreadSchema.parse(body);

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

    const [updated] = await db
      .update(threads)
      .set({
        resolved: data.resolved,
        resolvedAt: data.resolved ? new Date() : null,
      })
      .where(eq(threads.id, threadId))
      .returning();

    if (!updated) {
      // Should not happen — we just fetched it above; guard for safety
      return errorResponse("not_found", "Thread not found", 404);
    }

    return successResponse({
      id: updated.id,
      resolved: updated.resolved,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
