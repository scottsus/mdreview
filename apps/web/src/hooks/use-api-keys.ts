"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { ApiKeyResponse, CreateApiKeyResponse } from "@/types"

export interface UseApiKeysState {
  keys: ApiKeyResponse[]
  isCreating: boolean
  isRevoking: string | null
  newKeyName: string
  showCreateDialog: boolean
  showRevealDialog: boolean
  justCreatedKey: CreateApiKeyResponse | null
}

export function useApiKeys(initialKeys: ApiKeyResponse[]) {
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
    setState((s) => ({ ...s, showCreateDialog: true, newKeyName: "" }))
  }

  function closeCreateDialog() {
    setState((s) => ({ ...s, showCreateDialog: false, newKeyName: "" }))
  }

  function closeRevealDialog() {
    setState((s) => ({ ...s, showRevealDialog: false, justCreatedKey: null }))
  }

  function setNewKeyName(name: string) {
    setState((s) => ({ ...s, newKeyName: name }))
  }

  async function createKey() {
    const name = state.newKeyName.trim()
    if (!name) {
      toast.error("Key name is required")
      return
    }

    setState((s) => ({ ...s, isCreating: true }))

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || "Failed to create API key")
        return
      }

      const created: CreateApiKeyResponse = await response.json()

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
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setState((s) => ({ ...s, isCreating: false }))
    }
  }

  async function revokeKey(keyId: string, keyName: string) {
    setState((s) => ({ ...s, isRevoking: keyId }))

    try {
      const response = await fetch(`/api/keys/${keyId}`, { method: "DELETE" })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || "Failed to revoke API key")
        return
      }

      setState((s) => ({
        ...s,
        keys: s.keys.filter((k) => k.id !== keyId),
      }))
      toast.success(`API key "${keyName}" revoked`)
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setState((s) => ({ ...s, isRevoking: null }))
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      toast.success("API key copied to clipboard")
    }).catch(() => {
      toast.error("Failed to copy key")
    })
  }

  return { state, openCreateDialog, closeCreateDialog, closeRevealDialog, setNewKeyName, createKey, revokeKey, copyKey }
}
