import type { Metadata } from "next"
import { auth } from "@/auth"
import { ReviewClient } from "@/components/review/review-client"
import { getReviewOrGate } from "@/lib/review-helpers"
import { notFound, redirect } from "next/navigation"

interface ReviewPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params

  // Use null callerId for metadata — we can't redirect from generateMetadata.
  // If the review is private and the user has no session, return a generic title.
  // The page component will redirect before the user sees this metadata anyway.
  const result = await getReviewOrGate(slug, null)

  if (result.outcome !== "ok") {
    return { title: "Review Not Found" }
  }

  return { title: result.review.title || "Untitled Review" }
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params

  // Resolve the caller's identity from the server-side session.
  // The page has no NextRequest, so we use auth() directly (JWT cookie path only —
  // API key Bearer tokens are not relevant for browser page loads).
  const session = await auth()
  const callerId = session?.user?.id ?? null

  const result = await getReviewOrGate(slug, callerId)

  switch (result.outcome) {
    case "not_found":
      notFound()

    case "unauthorized":
    case "forbidden":
      // Cannot return a Response from a page component. Redirect to /auth with a
      // callbackUrl so the user lands back here after signing in.
      // "forbidden" (wrong owner) is treated the same as "unauthorized" from the
      // browser's perspective — redirect to login, don't reveal the review exists.
      redirect(`/auth?callbackUrl=/review/${encodeURIComponent(slug)}`)

    case "ok":
      return <ReviewClient initialReview={result.review} />
  }
}
