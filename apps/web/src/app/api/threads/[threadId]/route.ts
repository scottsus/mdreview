import { db } from "@/db";
import { threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
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

    const [thread] = await db
      .update(threads)
      .set({
        resolved: data.resolved,
        resolvedAt: data.resolved ? new Date() : null,
      })
      .where(eq(threads.id, threadId))
      .returning();

    if (!thread) {
      return errorResponse("not_found", "Thread not found", 404);
    }

    return successResponse({
      id: thread.id,
      resolved: thread.resolved,
      resolvedAt: thread.resolvedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
