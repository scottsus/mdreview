import { db } from "@/db"
import { reviews } from "@/db/schema"
import { config } from "@/lib/config"
import { transformReviewToResponse } from "@/lib/transformers"
import { eq } from "drizzle-orm"

// Re-export the return type so callers can narrow it
export type ReviewOrGateResult =
  | { outcome: "ok";        review: ReturnType<typeof transformReviewToResponse> }
  | { outcome: "not_found" }
  | { outcome: "unauthorized" }
  | { outcome: "forbidden"  }

/**
 * Fetches a review by slug and enforces access control.
 *
 * 1. Lightweight stub fetch (id, userId, slug only) — fast existence + ownership check
 * 2. `assertReviewAccess`-equivalent gate — returns a typed outcome, not a Response
 * 3. Full fetch with threads + comments (only reached when access is confirmed)
 * 4. `transformReviewToResponse` to produce the API response shape
 */
export async function getReviewOrGate(
  slug: string,
  callerId: string | null,
): Promise<ReviewOrGateResult> {
  const stub = await db.query.reviews.findFirst({
    where: eq(reviews.slug, slug),
    columns: { id: true, userId: true, slug: true },
  })

  if (!stub) {
    return { outcome: "not_found" }
  }

  if (stub.userId !== null) {
    if (!callerId) {
      return { outcome: "unauthorized" }
    }

    if (callerId !== stub.userId) {
      return { outcome: "forbidden" }
    }
  }

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.slug, slug),
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
  })

  if (!review) {
    return { outcome: "not_found" }
  }

  const transformed = transformReviewToResponse(review, config.baseUrl, callerId)

  return { outcome: "ok", review: transformed }
}
