import { auth } from "@/auth"
import { db } from "@/db"
import { reviews } from "@/db/schema"
import { handleApiError, errorResponse, successResponse } from "@/lib/api"
import { optionalAuth } from "@/lib/auth-helpers"
import { config } from "@/lib/config"
import { generateSlug } from "@/lib/slug"
import { createReviewSchema } from "@/types"
import { eq } from "drizzle-orm"
import { NextRequest } from "next/server"

console.log("[GET /api/reviews] Route module loaded")

export async function GET() {
  console.log("[GET /api/reviews] Handler invoked")

  try {
    const session = await auth()
    console.log("[GET /api/reviews] auth() resolved", {
      hasSession: !!session,
      userId: session?.user?.id ?? null,
    })

    if (!session?.user?.id) {
      console.log("[GET /api/reviews] No session — returning 401")
      return errorResponse("unauthorized", "Authentication required", 401)
    }

    const userId = session.user.id
    console.log("[GET /api/reviews] Fetching reviews for user", { userId })

    const rows = await db.query.reviews.findMany({
      where: eq(reviews.userId, userId),
      columns: {
        id: true,
        slug: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    })

    console.log("[GET /api/reviews] Query complete", {
      userId,
      count: rows.length,
    })

    const payload = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      url: `${config.baseUrl}/review/${r.slug}`,
      title: r.title ?? null,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }))

    console.log("[GET /api/reviews] Returning payload", {
      userId,
      count: payload.length,
    })

    return successResponse(payload)
  } catch (error) {
    console.error("[GET /api/reviews] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createReviewSchema.parse(body)

    const caller = await optionalAuth(request)

    const slug = generateSlug()

    const result = await db
      .insert(reviews)
      .values({
        slug,
        content: data.content,
        title: data.title,
        source: data.source,
        agentId: data.agentId,
        userId: caller?.userId ?? null,
      })
      .returning()

    const review = result[0]
    if (!review) {
      throw new Error("Failed to create review")
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
    )
  } catch (error) {
    return handleApiError(error)
  }
}
