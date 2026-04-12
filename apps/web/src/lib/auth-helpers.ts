import { createHash, randomBytes } from "crypto"
import { and, eq, gt, isNull, or } from "drizzle-orm"
import { NextRequest } from "next/server"

import { auth } from "@/auth"
import { db } from "@/db"
import { apiKeys } from "@/db/schema"

console.log("[auth-helpers] Module loaded")

// ─── Key generation ──────────────────────────────────────────────────────────

/**
 * Generates a cryptographically secure API key.
 * Format: mdr_<64 hex chars> (256 bits of entropy)
 */
export function generateApiKey(): string {
  const raw = `mdr_${randomBytes(32).toString("hex")}`
  console.log("[auth-helpers] generateApiKey: generated new key", {
    prefix: raw.slice(0, 10),
    length: raw.length,
  })
  return raw
}

/**
 * Hashes an API key with SHA-256 for safe storage.
 * SHA-256 is appropriate here — keys are 256-bit random values, not passwords.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

/**
 * Extracts the display prefix from a raw API key.
 * Returns the first 10 characters (e.g. "mdr_4a7f2c").
 */
export function getKeyPrefix(key: string): string {
  return key.slice(0, 10)
}

// ─── Key validation ──────────────────────────────────────────────────────────

/**
 * Validates a raw API key against the database.
 * 1. Hashes the submitted key
 * 2. Queries for a matching, non-revoked, non-expired record
 * 3. Fires a background lastUsedAt update (non-blocking)
 * 4. Returns the matching record or null
 */
export async function validateApiKey(rawKey: string) {
  console.log("[auth-helpers] validateApiKey: starting validation", {
    keyPrefix: rawKey.slice(0, 10),
    keyLength: rawKey.length,
  })

  const hash = hashApiKey(rawKey)
  console.log("[auth-helpers] validateApiKey: computed SHA-256 hash", {
    hashPrefix: hash.slice(0, 12),
  })

  const now = new Date()

  console.log("[auth-helpers] validateApiKey: querying DB for key record", {
    hashPrefix: hash.slice(0, 12),
    now: now.toISOString(),
  })

  const key = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.keyHash, hash),
      isNull(apiKeys.revokedAt),
      or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
    ),
    with: { user: true },
  })

  if (!key) {
    console.log("[auth-helpers] validateApiKey: key not found or invalid", {
      hashPrefix: hash.slice(0, 12),
    })
    return null
  }

  console.log("[auth-helpers] validateApiKey: key is valid", {
    keyId: key.id,
    userId: key.userId,
    keyName: key.name,
    keyPrefix: key.keyPrefix,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
  })

  // Fire-and-forget: update lastUsedAt without blocking the response
  console.log("[auth-helpers] validateApiKey: firing background lastUsedAt update", {
    keyId: key.id,
  })
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .execute()
    .catch((err) => {
      console.error("[auth-helpers] validateApiKey: lastUsedAt update failed (non-critical)", {
        keyId: key.id,
        error: err instanceof Error ? err.message : String(err),
      })
    })

  return key
}

// ─── Dual-path auth guard ────────────────────────────────────────────────────

export interface AuthContext {
  userId: string
  source: "session" | "api_key"
}

/**
 * Resolves the caller's identity from either a session cookie or a Bearer API key.
 * 1. Checks Authorization header for "Bearer mdr_…" → validates key
 * 2. Falls back to NextAuth session cookie
 * 3. Returns null if neither path yields a valid identity
 *
 * Example:
 *   const caller = await requireAuth(request)
 *   if (!caller) return errorResponse("unauthorized", "Authentication required", 401)
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext | null> {
  console.log("[auth-helpers] requireAuth: starting dual-path auth resolution", {
    method: request.method,
    url: request.url,
  })

  const authHeader = request.headers.get("authorization")
  console.log("[auth-helpers] requireAuth: checked Authorization header", {
    hasHeader: !!authHeader,
    isBearer: authHeader?.startsWith("Bearer ") ?? false,
  })

  // Path 1: Bearer API key
  if (authHeader?.startsWith("Bearer ")) {
    const rawKey = authHeader.slice(7)
    console.log("[auth-helpers] requireAuth: attempting API key path", {
      keyLength: rawKey.length,
      keyPrefix: rawKey.slice(0, 10),
    })

    const keyRecord = await validateApiKey(rawKey)

    if (keyRecord) {
      console.log("[auth-helpers] requireAuth: API key auth succeeded", {
        userId: keyRecord.userId,
        keyId: keyRecord.id,
        keyName: keyRecord.name,
      })
      return { userId: keyRecord.userId, source: "api_key" }
    }

    // Bearer header present but key invalid — return 401 immediately.
    // Do not fall through to session path (prevents auth confusion).
    console.log("[auth-helpers] requireAuth: API key auth failed — Bearer header present but key invalid")
    return null
  }

  // Path 2: NextAuth session (JWT cookie)
  console.log("[auth-helpers] requireAuth: no Bearer header, attempting session path")
  const session = await auth()
  console.log("[auth-helpers] requireAuth: session resolved", {
    hasSession: !!session,
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
  })

  if (session?.user?.id) {
    console.log("[auth-helpers] requireAuth: session auth succeeded", {
      userId: session.user.id,
    })
    return { userId: session.user.id, source: "session" }
  }

  console.log("[auth-helpers] requireAuth: both auth paths failed — returning null")
  return null
}
