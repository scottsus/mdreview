import { and, eq } from "drizzle-orm"
import { NextRequest } from "next/server"

import { auth } from "@/auth"
import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { errorResponse, handleApiError, successResponse } from "@/lib/api"

console.log("[api/keys/[id]] Route module loaded")

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  console.log("[api/keys/[id]] DELETE: handler invoked")

  try {
    const { id } = await params
    console.log("[api/keys/[id]] DELETE: params resolved", { keyId: id })

    const session = await auth()
    console.log("[api/keys/[id]] DELETE: session resolved", {
      hasSession: !!session,
      userId: session?.user?.id ?? null,
    })

    if (!session?.user?.id) {
      console.log("[api/keys/[id]] DELETE: no valid session — returning 401")
      return errorResponse("unauthorized", "Authentication required", 401)
    }

    const userId = session.user.id
    console.log("[api/keys/[id]] DELETE: looking up key for ownership check", {
      keyId: id,
      userId,
    })

    // Ownership check: only the key's owner can revoke it.
    // Combine the ownership check with the revocation in a single DB round-trip.
    const [revoked] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiKeys.id, id),
          eq(apiKeys.userId, userId), // ownership check in WHERE clause
        ),
      )
      .returning({
        id: apiKeys.id,
        revokedAt: apiKeys.revokedAt,
        userId: apiKeys.userId,
        name: apiKeys.name,
      })

    if (!revoked) {
      console.log("[api/keys/[id]] DELETE: key not found or not owned by user", {
        keyId: id,
        userId,
      })
      return errorResponse("not_found", "API key not found", 404)
    }

    console.log("[api/keys/[id]] DELETE: key revoked successfully", {
      keyId: revoked.id,
      userId: revoked.userId,
      keyName: revoked.name,
      revokedAt: revoked.revokedAt?.toISOString(),
    })

    return successResponse({
      id: revoked.id,
      revokedAt: revoked.revokedAt?.toISOString() ?? null,
    })
  } catch (error) {
    console.error("[api/keys/[id]] DELETE: unhandled error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return handleApiError(error)
  }
}
