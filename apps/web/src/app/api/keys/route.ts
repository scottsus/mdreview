import { and, eq, isNull } from "drizzle-orm"
import { NextRequest } from "next/server"

import { auth } from "@/auth"
import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { errorResponse, handleApiError, successResponse } from "@/lib/api"
import { generateApiKey, getKeyPrefix, hashApiKey } from "@/lib/auth-helpers"
import { createApiKeySchema } from "@/types"

console.log("[api/keys] Route module loaded")

// ─── GET /api/keys ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  console.log("[api/keys] GET: handler invoked")

  try {
    const session = await auth()
    console.log("[api/keys] GET: session resolved", {
      hasSession: !!session,
      userId: session?.user?.id ?? null,
    })

    if (!session?.user?.id) {
      console.log("[api/keys] GET: no valid session — returning 401")
      return errorResponse("unauthorized", "Authentication required", 401)
    }

    const userId = session.user.id
    console.log("[api/keys] GET: fetching active keys for user", { userId })

    const keys = await db.query.apiKeys.findMany({
      where: and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)),
      columns: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        // keyHash and userId deliberately excluded from response
      },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    })

    console.log("[api/keys] GET: found keys", { userId, count: keys.length })

    const responseData = keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }))

    console.log("[api/keys] GET: returning", { userId, count: responseData.length })
    return successResponse(responseData)
  } catch (error) {
    console.error("[api/keys] GET: unhandled error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return handleApiError(error)
  }
}

// ─── POST /api/keys ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  console.log("[api/keys] POST: handler invoked")

  try {
    const session = await auth()
    console.log("[api/keys] POST: session resolved", {
      hasSession: !!session,
      userId: session?.user?.id ?? null,
    })

    if (!session?.user?.id) {
      console.log("[api/keys] POST: no valid session — returning 401")
      return errorResponse("unauthorized", "Authentication required", 401)
    }

    const userId = session.user.id

    const body = await request.json()
    console.log("[api/keys] POST: raw request body received", { bodyKeys: Object.keys(body) })

    const data = createApiKeySchema.parse(body)
    console.log("[api/keys] POST: body validated", { name: data.name, userId })

    const rawKey = generateApiKey()
    const keyHash = hashApiKey(rawKey)
    const keyPrefix = getKeyPrefix(rawKey)

    console.log("[api/keys] POST: generated key", {
      userId,
      keyPrefix,
      keyHashPrefix: keyHash.slice(0, 12),
    })

    const [record] = await db
      .insert(apiKeys)
      .values({
        userId,
        name: data.name,
        keyHash,
        keyPrefix,
      })
      .returning()

    if (!record) {
      console.error("[api/keys] POST: DB insert returned no record", { userId, name: data.name })
      throw new Error("Failed to create API key")
    }

    console.log("[api/keys] POST: key created successfully", {
      keyId: record.id,
      userId: record.userId,
      keyName: record.name,
      keyPrefix: record.keyPrefix,
      createdAt: record.createdAt.toISOString(),
    })

    return successResponse(
      {
        id: record.id,
        name: record.name,
        keyPrefix: record.keyPrefix,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: record.createdAt.toISOString(),
        key: rawKey, // RAW KEY — returned exactly once; never stored
      },
      201,
    )
  } catch (error) {
    console.error("[api/keys] POST: unhandled error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return handleApiError(error)
  }
}
