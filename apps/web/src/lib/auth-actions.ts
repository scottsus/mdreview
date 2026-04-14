"use server"

import { signOut } from "@/auth"

console.log("[auth-actions] Auth server actions module loaded")

export async function signOutAction() {
  console.log("[auth-actions] signOutAction triggered — signing out and redirecting to /")
  await signOut({ redirectTo: "/" })
}
