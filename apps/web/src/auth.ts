import NextAuth, { type NextAuthResult } from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"

import { db } from "@/db"
import { users, accounts, sessions, verificationTokens } from "@/db/schema"
import authConfig from "./auth.config"

console.log("[auth] Initializing NextAuth with DrizzleAdapter")

const result: NextAuthResult = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    // JWT strategy required: middleware runs in Edge runtime where postgres-js
    // cannot execute. JWT validates sessions via signed cookie — no DB lookup.
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log("[auth] jwt callback fired", {
        hasUser: !!user,
        hasAccount: !!account,
        tokenSub: token.sub,
      })
      if (user) {
        console.log("[auth] jwt callback: new sign-in, attaching user id to token", { userId: user.id })
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      console.log("[auth] session callback fired", {
        tokenSub: token.sub,
        tokenId: token.id,
        sessionUserEmail: session.user?.email,
      })
      if (token.id && session.user) {
        session.user.id = token.id as string
        console.log("[auth] session callback: attached user.id from token", { userId: session.user.id })
      }
      return session
    },
  },
})

export const { handlers, auth, signIn, signOut } = result

console.log("[auth] NextAuth initialized successfully")
