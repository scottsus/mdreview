import type { Metadata } from "next";
import { ReviewClient } from "@/components/review/review-client";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { config } from "@/lib/config";
import { transformReviewToResponse } from "@/lib/transformers";
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

  return transformReviewToResponse(review, config.baseUrl);
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    return { title: "Review Not Found" };
  }

  return {
    title: review.title || "Untitled Review",
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
