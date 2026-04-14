import Link from "next/link"
import { auth } from "@/auth"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { Button } from "@/components/ui/button"

console.log("[navbar] Navbar module loaded (server component)")

export async function Navbar() {
  console.log("[navbar] Navbar rendering — calling auth()")
  const session = await auth()
  console.log("[navbar] auth() resolved", {
    authenticated: !!session,
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
  })

  const user = session?.user

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">

        {/* Brand */}
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight text-foreground hover:text-primary transition-colors mr-6"
        >
          MDReview
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/api-keys" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Settings
            </Link>
          </Button>
        </nav>

        {/* Right side: theme toggle + auth */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              {console.log("[navbar] Rendering UserMenu for authenticated user", {
                userId: user.id,
                email: user.email ?? null,
              })}
              <UserMenu
                name={user.name ?? null}
                email={user.email ?? null}
                image={user.image ?? null}
              />
            </>
          ) : (
            <>
              {console.log("[navbar] Rendering sign-in button (unauthenticated)")}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth">Sign in</Link>
              </Button>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
