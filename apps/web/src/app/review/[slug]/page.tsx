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
  const result = await getReviewOrGate(slug, null)

  if (result.outcome !== "ok") {
    return { title: "Review Not Found" }
  }

  return { title: result.review.title || "Untitled Review" }
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params
  const session = await auth()
  const callerId = session?.user?.id ?? null

  const result = await getReviewOrGate(slug, callerId)

  switch (result.outcome) {
    case "not_found":
      notFound()

    case "unauthorized":
      // Not signed in at all — send to /auth with callbackUrl
      redirect(`/auth?callbackUrl=/review/${encodeURIComponent(slug)}`)

    case "forbidden":
      // Signed in but wrong owner — show access denied, don't loop
      notFound()

    case "ok":
      return <ReviewClient initialReview={result.review} />
  }
}
