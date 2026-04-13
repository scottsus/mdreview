"use client"

import { Copy, Key, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useApiKeys } from "@/hooks/use-api-keys"
import type { ApiKeyResponse } from "@/types"

interface ApiKeyManagerProps {
  initialKeys: ApiKeyResponse[]
}

export function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  const {
    state,
    openCreateDialog,
    closeCreateDialog,
    closeRevealDialog,
    setNewKeyName,
    createKey,
    revokeKey,
    copyKey,
  } = useApiKeys(initialKeys)

  function formatDate(iso: string | null): string {
    if (!iso) return "Never"
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <>
      {/* ── Key list ─────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {state.keys.length === 0
                ? "No active keys"
                : `${state.keys.length} active key${state.keys.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New key
          </Button>
        </div>

        {state.keys.length > 0 && (
          <>
            <Separator />
            <ul className="divide-y divide-border">
              {state.keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {key.name}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {key.keyPrefix}…
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created {formatDate(key.createdAt)}</span>
                      <span>Last used {formatDate(key.lastUsedAt)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-4 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => revokeKey(key.id, key.name)}
                    disabled={state.isRevoking === key.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Revoke</span>
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ── Create key dialog ─────────────────────────────────────── */}
      <Dialog open={state.showCreateDialog} onOpenChange={(open) => {
        if (!open) closeCreateDialog()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Give your key a name to remember what it&apos;s for (e.g. &quot;CI pipeline&quot;, &quot;My agent&quot;).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Key name"
              value={state.newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !state.isCreating) createKey()
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog} disabled={state.isCreating}>
              Cancel
            </Button>
            <Button onClick={createKey} disabled={state.isCreating || !state.newKeyName.trim()}>
              {state.isCreating ? "Creating…" : "Create key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reveal key dialog (show-once) ─────────────────────────── */}
      <Dialog open={state.showRevealDialog} onOpenChange={(open) => {
        if (!open) closeRevealDialog()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy this key now. <strong>It will not be shown again.</strong> If you lose it, revoke
              it and create a new one.
            </DialogDescription>
          </DialogHeader>

          {state.justCreatedKey && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2">
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                  {state.justCreatedKey.key}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyKey(state.justCreatedKey!.key)}
                  title="Copy API key"
                >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key with:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  Authorization: Bearer {state.justCreatedKey.keyPrefix}…
                </code>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={closeRevealDialog}>Done, I&apos;ve copied my key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
