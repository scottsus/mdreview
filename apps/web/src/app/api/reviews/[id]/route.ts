import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { config } from "@/lib/config";
import { transformReviewToResponse } from "@/lib/transformers";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, id),
      with: {
        threads: {
          with: {
            comments: {
              orderBy: (comments, { asc }) => [asc(comments.createdAt)],
            },
          },
          orderBy: (threads, { asc }) => [asc(threads.createdAt)],
        },
      },
    });

    if (!review) {
      return errorResponse("not_found", "Review not found", 404);
    }

    return successResponse(transformReviewToResponse(review, config.baseUrl));
  } catch (error) {
    return handleApiError(error);
  }
}
