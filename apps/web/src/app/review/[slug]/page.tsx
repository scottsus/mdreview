import { ReviewClient } from "@/components/review/review-client";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

interface ReviewPageProps {
  params: Promise<{ slug: string }>;
}

async function getReviewBySlug(slug: string) {
  const review = await db.query.reviews.findFirst({
    where: eq(reviews.slug, slug),
    with: {
      threads: {
        with: {
          comments: {
            orderBy: (comments, { asc }) => [asc(comments.createdAt)],
          },
        },
        orderBy: (threads, { asc }) => [asc(threads.createdAt)],
      },
    },
  });

  if (!review) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return {
    id: review.id,
    slug: review.slug,
    url: `${baseUrl}/review/${review.slug}`,
    content: review.content,
    title: review.title,
    status: review.status,
    decisionMessage: review.decisionMessage,
    decidedAt: review.decidedAt?.toISOString() ?? null,
    source: review.source,
    threads: review.threads.map((thread) => ({
      id: thread.id,
      startLine: thread.startLine,
      endLine: thread.endLine,
      selectedText: thread.selectedText,
      resolved: thread.resolved,
      resolvedAt: thread.resolvedAt?.toISOString() ?? null,
      comments: thread.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        authorType: comment.authorType,
        authorName: comment.authorName,
        createdAt: comment.createdAt.toISOString(),
      })),
      createdAt: thread.createdAt.toISOString(),
    })),
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  return <ReviewClient initialReview={review} />;
}
