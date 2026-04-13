import { createHash, randomBytes } from "crypto"
import { and, eq, gt, isNull, or } from "drizzle-orm"
import { NextRequest } from "next/server"

import { auth } from "@/auth"
import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { errorResponse } from "@/lib/api"

// ─── Key generation ──────────────────────────────────────────────────────────

/**
 * Generates a cryptographically secure API key.
 * Format: mdr_<64 hex chars> (256 bits of entropy)
 */
export function generateApiKey(): string {
  return `mdr_${randomBytes(32).toString("hex")}`
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
  const hash = hashApiKey(rawKey)
  const now = new Date()

  const key = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.keyHash, hash),
      isNull(apiKeys.revokedAt),
      or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
    ),
    with: { user: true },
  })

  if (!key) {
    return null
  }

  // Fire-and-forget: update lastUsedAt without blocking the response
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
  const authHeader = request.headers.get("authorization")

  // Path 1: Bearer API key
  if (authHeader?.startsWith("Bearer ")) {
    const rawKey = authHeader.slice(7)
    const keyRecord = await validateApiKey(rawKey)

    if (keyRecord) {
      return { userId: keyRecord.userId, source: "api_key" }
    }

    // Bearer header present but key invalid — return null immediately.
    // Do not fall through to session path (prevents auth confusion).
    return null
  }

  // Path 2: NextAuth session (JWT cookie)
  const session = await auth()

  if (session?.user?.id) {
    return { userId: session.user.id, source: "session" }
  }

  return null
}

/**
 * Like requireAuth, but signals at the call site that auth is optional.
 * Returns null for anonymous callers — the caller decides whether to gate on that.
 *
 * Example:
 *   const caller = await optionalAuth(request)
 *   // caller is null for anonymous requests — proceed, but don't stamp userId
 */
export async function optionalAuth(request: NextRequest): Promise<AuthContext | null> {
  return requireAuth(request)
}

/**
 * Asserts that the caller has access to a review, based on its ownership model.
 * 1. review.userId is null → public review, access always granted (returns null)
 * 2. review.userId is set, caller is null → unauthenticated → returns 401
 * 3. review.userId is set, caller.userId !== review.userId → wrong owner → returns 404
 *    (404 is intentional: prevents slug enumeration — "exists but forbidden" looks like "not found")
 * 4. Ownership matches → returns null (access granted)
 *
 * Example:
 *   const denied = assertReviewAccess(review, caller)
 *   if (denied) return denied
 */
export function assertReviewAccess(
  review: { userId: string | null },
  caller: AuthContext | null,
): Response | null {
  if (review.userId === null) {
    return null
  }

  if (!caller) {
    return errorResponse("unauthorized", "Authentication required", 401)
  }

  if (caller.userId !== review.userId) {
    // 404 (not 403): prevents slug enumeration — unauthorized == not found from outside
    return errorResponse("not_found", "Review not found", 404)
  }

  return null
}
