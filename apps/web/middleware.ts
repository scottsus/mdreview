import NextAuth, { type NextAuthResult } from "next-auth"
import authConfig from "@/auth.config"

const { auth: middleware }: NextAuthResult = NextAuth(authConfig)
export default middleware

export const config = {
  // Run middleware on all routes except:
  // - /api/* (auth callbacks, existing API routes)
  // - /_next/static (static assets)
  // - /_next/image (image optimization)
  // - /favicon.ico
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
