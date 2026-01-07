import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    return successResponse({
      id: review.id,
      slug: review.slug,
      url: `${baseUrl}/review/${review.slug}`,
      content: review.content,
      title: review.title,
      status: review.status,
      decisionMessage: review.decisionMessage,
      decidedAt: review.decidedAt?.toISOString() ?? null,
      source: review.source,
      threads: review.threads.map((thread) => ({
        id: thread.id,
        startLine: thread.startLine,
        endLine: thread.endLine,
        selectedText: thread.selectedText,
        resolved: thread.resolved,
        resolvedAt: thread.resolvedAt?.toISOString() ?? null,
        comments: thread.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          authorType: comment.authorType,
          authorName: comment.authorName,
          createdAt: comment.createdAt.toISOString(),
        })),
        createdAt: thread.createdAt.toISOString(),
      })),
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
