import { errorResponse, handleApiError, successResponse } from "@/lib/api"
import { optionalAuth } from "@/lib/auth-helpers"
import { getReviewOrGate } from "@/lib/review-helpers"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const caller = await optionalAuth(request)

    const result = await getReviewOrGate(id, caller?.userId ?? null)

    switch (result.outcome) {
      case "not_found":
        return errorResponse("not_found", "Review not found", 404)

      case "unauthorized":
        return errorResponse("unauthorized", "Authentication required", 401)

      case "forbidden":
        // 404 intentional — prevents slug enumeration
        return errorResponse("not_found", "Review not found", 404)

      case "ok":
        return successResponse(result.review)
    }
  } catch (error) {
    return handleApiError(error)
  }
}
