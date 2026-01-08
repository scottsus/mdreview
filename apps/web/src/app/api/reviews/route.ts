import { db } from "@/db";
import { reviews } from "@/db/schema";
import { handleApiError, successResponse } from "@/lib/api";
import { config } from "@/lib/config";
import { generateSlug } from "@/lib/slug";
import { createReviewSchema } from "@/types";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createReviewSchema.parse(body);

    const slug = generateSlug();

    const result = await db
      .insert(reviews)
      .values({
        slug,
        content: data.content,
        title: data.title,
        source: data.source,
        agentId: data.agentId,
      })
      .returning();

    const review = result[0];
    if (!review) {
      throw new Error("Failed to create review");
    }

    return successResponse(
      {
        id: review.id,
        slug: review.slug,
        url: `${config.baseUrl}/review/${review.slug}`,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
