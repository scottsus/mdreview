"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import type { ApiKeyResponse, CreateApiKeyResponse } from "@/types"

console.log("[ApiKeyManager] Component module loaded")

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseApiKeysState {
  keys: ApiKeyResponse[]
  isCreating: boolean
  isRevoking: string | null // keyId being revoked
  newKeyName: string
  showCreateDialog: boolean
  showRevealDialog: boolean
  justCreatedKey: CreateApiKeyResponse | null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useApiKeys(initialKeys: ApiKeyResponse[]) {
  const [state, setState] = useState<UseApiKeysState>({
    keys: initialKeys,
    isCreating: false,
    isRevoking: null,
    newKeyName: "",
    showCreateDialog: false,
    showRevealDialog: false,
    justCreatedKey: null,
  })

  function openCreateDialog() {
    console.log("[ApiKeyManager] openCreateDialog: opening create dialog")
    setState((s) => ({ ...s, showCreateDialog: true, newKeyName: "" }))
  }

  function closeCreateDialog() {
    console.log("[ApiKeyManager] closeCreateDialog: closing create dialog")
    setState((s) => ({ ...s, showCreateDialog: false, newKeyName: "" }))
  }

  function closeRevealDialog() {
    console.log("[ApiKeyManager] closeRevealDialog: closing reveal dialog, clearing justCreatedKey")
    setState((s) => ({ ...s, showRevealDialog: false, justCreatedKey: null }))
  }

  function setNewKeyName(name: string) {
    setState((s) => ({ ...s, newKeyName: name }))
  }

  async function createKey() {
    const name = state.newKeyName.trim()
    console.log("[ApiKeyManager] createKey: starting key creation", { name })

    if (!name) {
      console.log("[ApiKeyManager] createKey: empty name — aborting")
      toast.error("Key name is required")
      return
    }

    setState((s) => ({ ...s, isCreating: true }))
    console.log("[ApiKeyManager] createKey: set isCreating=true, calling POST /api/keys")

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      console.log("[ApiKeyManager] createKey: received response", {
        status: response.status,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[ApiKeyManager] createKey: POST /api/keys failed", {
          status: response.status,
          error: errorData,
        })
        toast.error(errorData.message || "Failed to create API key")
        return
      }

      const created: CreateApiKeyResponse = await response.json()
      console.log("[ApiKeyManager] createKey: key created successfully", {
        keyId: created.id,
        keyName: created.name,
        keyPrefix: created.keyPrefix,
        createdAt: created.createdAt,
      })

      const listItem: ApiKeyResponse = {
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        lastUsedAt: created.lastUsedAt,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
      }

      setState((s) => ({
        ...s,
        keys: [listItem, ...s.keys],
        showCreateDialog: false,
        showRevealDialog: true,
        justCreatedKey: created,
        newKeyName: "",
      }))

      console.log("[ApiKeyManager] createKey: state updated — showing reveal dialog", {
        totalKeys: state.keys.length + 1,
      })
    } catch (err) {
      console.error("[ApiKeyManager] createKey: network error", {
        error: err instanceof Error ? err.message : String(err),
      })
      toast.error("Network error — please try again")
    } finally {
      console.log("[ApiKeyManager] createKey: setting isCreating=false")
      setState((s) => ({ ...s, isCreating: false }))
    }
  }

  async function revokeKey(keyId: string, keyName: string) {
    console.log("[ApiKeyManager] revokeKey: starting revocation", { keyId, keyName })
    setState((s) => ({ ...s, isRevoking: keyId }))

    try {
      const response = await fetch(`/api/keys/${keyId}`, { method: "DELETE" })

      console.log("[ApiKeyManager] revokeKey: received response", {
        keyId,
        status: response.status,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[ApiKeyManager] revokeKey: DELETE /api/keys/[id] failed", {
          keyId,
          status: response.status,
          error: errorData,
        })
        toast.error(errorData.message || "Failed to revoke API key")
        return
      }

      console.log("[ApiKeyManager] revokeKey: key revoked successfully", { keyId, keyName })
      setState((s) => ({
        ...s,
        keys: s.keys.filter((k) => k.id !== keyId),
      }))
      toast.success(`API key "${keyName}" revoked`)
    } catch (err) {
      console.error("[ApiKeyManager] revokeKey: network error", {
        keyId,
        error: err instanceof Error ? err.message : String(err),
      })
      toast.error("Network error — please try again")
    } finally {
      console.log("[ApiKeyManager] revokeKey: clearing isRevoking state", { keyId })
      setState((s) => ({ ...s, isRevoking: null }))
    }
  }

  function copyKey(key: string) {
    console.log("[ApiKeyManager] copyKey: copying key to clipboard")
    navigator.clipboard.writeText(key).then(() => {
      console.log("[ApiKeyManager] copyKey: copied successfully")
      toast.success("API key copied to clipboard")
    }).catch((err) => {
      console.error("[ApiKeyManager] copyKey: clipboard write failed", {
        error: err instanceof Error ? err.message : String(err),
      })
      toast.error("Failed to copy key")
    })
  }

  return { state, openCreateDialog, closeCreateDialog, closeRevealDialog, setNewKeyName, createKey, revokeKey, copyKey }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ApiKeyManagerProps {
  initialKeys: ApiKeyResponse[]
}

export function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  console.log("[ApiKeyManager] ApiKeyManager: rendering", {
    initialKeyCount: initialKeys.length,
  })

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

  console.log("[ApiKeyManager] ApiKeyManager: current state", {
    keyCount: state.keys.length,
    showCreateDialog: state.showCreateDialog,
    showRevealDialog: state.showRevealDialog,
    isCreating: state.isCreating,
    isRevoking: state.isRevoking,
    hasJustCreatedKey: !!state.justCreatedKey,
  })

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
              {state.keys.map((key) => {
                console.log("[ApiKeyManager] rendering key row", {
                  keyId: key.id,
                  keyName: key.name,
                  keyPrefix: key.keyPrefix,
                })
                return (
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
                )
              })}
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
                if (e.key === "Enter" && !state.isCreating) {
                  console.log("[ApiKeyManager] create dialog: Enter key pressed")
                  createKey()
                }
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
