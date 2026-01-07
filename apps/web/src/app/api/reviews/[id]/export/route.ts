import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError } from "@/lib/api";
import { exportFormatSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import YAML from "yaml";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = exportFormatSchema.parse(
      searchParams.get("format") || "yaml",
    );

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

    const exportData = {
      review: {
        id: review.id,
        title: review.title,
        status: review.status,
        decisionMessage: review.decisionMessage,
        decidedAt: review.decidedAt?.toISOString() ?? null,
      },
      threads: review.threads.map((thread) => ({
        id: thread.id,
        selectedText: thread.selectedText,
        resolved: thread.resolved,
        comments: thread.comments.map((comment) => ({
          body: comment.body,
          authorType: comment.authorType,
          authorName: comment.authorName,
          createdAt: comment.createdAt.toISOString(),
        })),
      })),
    };

    if (format === "yaml") {
      return new NextResponse(YAML.stringify(exportData), {
        headers: {
          "Content-Type": "text/yaml",
          "Content-Disposition": `attachment; filename="review-${review.slug}.yaml"`,
        },
      });
    }

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="review-${review.slug}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
