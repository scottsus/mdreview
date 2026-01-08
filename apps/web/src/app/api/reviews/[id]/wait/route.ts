import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { WAIT_DEFAULT_TIMEOUT, WAIT_POLL_INTERVAL } from "@/lib/constants";
import { transformCommentToResponse } from "@/lib/transformers";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = parseInt(searchParams.get("timeout") || "");
    const timeout = Math.min(
      isNaN(parsed) || parsed <= 0 ? WAIT_DEFAULT_TIMEOUT : parsed,
      WAIT_DEFAULT_TIMEOUT,
    );

    const startTime = Date.now();
    const timeoutMs = timeout * 1000;

    while (Date.now() - startTime < timeoutMs) {
      if (request.signal.aborted) {
        return errorResponse("aborted", "Request aborted by client", 499);
      }

      const review = await db.query.reviews.findFirst({
        where: eq(reviews.id, id),
        with: {
          threads: {
            with: {
              comments: true,
            },
          },
        },
      });

      if (!review) {
        return errorResponse("not_found", "Review not found", 404);
      }

      if (review.status !== "pending") {
        const totalThreads = review.threads.length;
        const resolvedThreads = review.threads.filter((t) => t.resolved).length;
        const totalComments = review.threads.reduce(
          (sum, t) => sum + t.comments.length,
          0,
        );

        return successResponse({
          id: review.id,
          status: review.status,
          decisionMessage: review.decisionMessage,
          decidedAt: review.decidedAt?.toISOString() ?? null,
          threads: review.threads.map((thread) => ({
            id: thread.id,
            startLine: thread.startLine,
            endLine: thread.endLine,
            selectedText: thread.selectedText,
            resolved: thread.resolved,
            comments: thread.comments.map(transformCommentToResponse),
          })),
          summary: {
            totalThreads,
            resolvedThreads,
            unresolvedThreads: totalThreads - resolvedThreads,
            totalComments,
          },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, WAIT_POLL_INTERVAL));
    }

    return successResponse(
      {
        status: "pending",
        message: "Review still pending. Poll again.",
      },
      408,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const maxDuration = 300;
