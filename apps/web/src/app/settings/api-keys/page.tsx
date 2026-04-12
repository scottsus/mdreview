import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { db } from "@/db"
import { apiKeys } from "@/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { ApiKeyManager } from "@/components/settings/api-key-manager"
import type { ApiKeyResponse } from "@/types"

console.log("[/settings/api-keys] Page module loaded")

export default async function ApiKeysPage() {
  console.log("[/settings/api-keys] ApiKeysPage: rendering, calling auth()")

  const session = await auth()
  console.log("[/settings/api-keys] ApiKeysPage: session resolved", {
    hasSession: !!session,
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
  })

  if (!session?.user?.id) {
    console.log("[/settings/api-keys] ApiKeysPage: no session — redirecting to /auth")
    redirect("/auth")
  }

  const userId = session.user.id

  console.log("[/settings/api-keys] ApiKeysPage: fetching initial key list", { userId })

  const rows = await db.query.apiKeys.findMany({
    where: and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)),
    columns: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })

  console.log("[/settings/api-keys] ApiKeysPage: initial keys fetched", {
    userId,
    count: rows.length,
  })

  const initialKeys: ApiKeyResponse[] = rows.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }))

  console.log("[/settings/api-keys] ApiKeysPage: rendering ApiKeyManager client component", {
    userId,
    initialKeyCount: initialKeys.length,
  })

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              API Keys
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage API keys for programmatic access. Keys grant full access to your account — keep them secret.
            </p>
          </div>
          <ApiKeyManager initialKeys={initialKeys} />
        </div>
      </div>
    </main>
  )
}
