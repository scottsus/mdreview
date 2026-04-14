import Link from "next/link"
import { redirect } from "next/navigation"
import { FileText, Plus, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { auth } from "@/auth"
import { db } from "@/db"
import { reviews } from "@/db/schema"
import { eq } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

console.log("[/dashboard] Dashboard page module loaded")

type ReviewStatus = "pending" | "approved" | "changes_requested" | "rejected"

function StatusBadge({ status }: { status: string }) {
  console.log("[/dashboard] StatusBadge rendering", { status })
  switch (status as ReviewStatus) {
    case "approved":
      return (
        <Badge className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/20">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      )
    case "changes_requested":
      return (
        <Badge className="gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20">
          <AlertCircle className="h-3 w-3" />
          Changes Requested
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="gap-1 bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 hover:bg-red-500/20">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      )
    default:
      return (
        <Badge className="gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function DashboardPage() {
  console.log("[/dashboard] DashboardPage rendering — calling auth()")
  const session = await auth()
  console.log("[/dashboard] auth() resolved", {
    hasSession: !!session,
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
  })

  if (!session?.user?.id) {
    console.log("[/dashboard] No session — redirecting to /auth")
    redirect("/auth?callbackUrl=/dashboard")
  }

  const userId = session.user.id
  console.log("[/dashboard] Fetching reviews for user", { userId })

  const rows = await db.query.reviews.findMany({
    where: eq(reviews.userId, userId),
    columns: {
      id: true,
      slug: true,
      title: true,
      status: true,
      createdAt: true,
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })

  console.log("[/dashboard] Reviews fetched", {
    userId,
    count: rows.length,
    slugs: rows.map((r) => r.slug),
  })

  console.log("[/dashboard] Rendering page", { isEmpty: rows.length === 0, count: rows.length })

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                My Reviews
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                All your markdown reviews in one place.
              </p>
            </div>
            <Button asChild>
              <Link href="/" className="gap-2">
                <Plus className="h-4 w-4" />
                New Review
              </Link>
            </Button>
          </div>

          {rows.length === 0 ? (
            /* Empty state */
            <div className="rounded-xl border bg-card shadow-sm p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">No reviews yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload a markdown file to create your first review.
                </p>
              </div>
              <Button asChild>
                <Link href="/">Create your first review</Link>
              </Button>
            </div>
          ) : (
            /* Reviews list */
            <div className="space-y-3">
              {rows.map((review) => {
                const createdAt = review.createdAt.toISOString()
                return (
                  <Link
                    key={review.id}
                    href={`/review/${review.slug}`}
                    className="block rounded-xl border bg-card shadow-sm p-4 hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="rounded-lg bg-muted p-2 mt-0.5 shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {review.title ?? "Untitled Review"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={review.status} />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
