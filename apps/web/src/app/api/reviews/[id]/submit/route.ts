import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { submitReviewSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = submitReviewSchema.parse(body);

    const result = await db
      .update(reviews)
      .set({
        status: data.status,
        decisionMessage: data.message,
        decidedAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning();

    const review = result[0];
    if (!review) {
      return errorResponse("not_found", "Review not found", 404);
    }

    return successResponse({
      id: review.id,
      status: review.status,
      decisionMessage: review.decisionMessage,
      decidedAt: review.decidedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
