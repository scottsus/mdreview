import { auth, signIn, signOut } from "@/auth"

console.log("[/auth] Auth page module loaded")

export default async function AuthPage() {
  console.log("[/auth] AuthPage rendering, calling auth()")
  const session = await auth()
  console.log("[/auth] auth() resolved", {
    authenticated: !!session,
    userEmail: session?.user?.email ?? null,
    userId: session?.user?.id ?? null,
    expires: session?.expires ?? null,
  })

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-2">
              Auth Status
            </h1>
            <p className="text-sm text-muted-foreground">
              Task 01 — NextAuth v5 proof of life
            </p>
          </div>

          {/* Session state card */}
          <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
            {session ? (
              <>
                <div className="flex items-center gap-3">
                  {session.user?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt="User avatar"
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {session.user?.name ?? "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.user?.email ?? "No email"}
                    </p>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-auto">
                  <pre>{JSON.stringify(session, null, 2)}</pre>
                </div>

                {/* Sign out — server action via form */}
                <form
                  action={async () => {
                    "use server"
                    console.log("[/auth] signOut server action triggered")
                    await signOut({ redirectTo: "/auth" })
                  }}
                >
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm text-center">
                  Not signed in.
                </p>

                {/* Sign in — server action via form */}
                <form
                  action={async () => {
                    "use server"
                    console.log("[/auth] signIn server action triggered")
                    await signIn("google", { redirectTo: "/auth" })
                  }}
                >
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Sign in with Google
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
