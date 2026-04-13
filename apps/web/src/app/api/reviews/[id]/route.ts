import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { assertReviewAccess, optionalAuth } from "@/lib/auth-helpers";
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

    // Step 1: lightweight fetch to check existence + ownership before expensive query
    const stub = await db.query.reviews.findFirst({
      where: eq(reviews.slug, id),
      columns: { id: true, userId: true, slug: true },
    });

    if (!stub) {
      return errorResponse("not_found", "Review not found", 404);
    }

    // Step 2: resolve caller identity (optional — only need it if review is private)
    const caller = await optionalAuth(request)

    // Step 3: gate — public reviews pass through; private reviews require owner
    const denied = assertReviewAccess(stub, caller)
    if (denied) {
      return denied
    }

    // Step 4: full fetch with threads now that access is confirmed
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.slug, id),
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
      // Extremely unlikely race — between stub fetch and full fetch the review was deleted
      return errorResponse("not_found", "Review not found", 404);
    }

    return successResponse(transformReviewToResponse(review, config.baseUrl, caller?.userId ?? null));
  } catch (error) {
    return handleApiError(error);
  }
}
