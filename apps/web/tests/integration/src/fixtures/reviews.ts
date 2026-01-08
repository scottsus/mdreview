import { config } from "../config.js";

export interface TestReview {
  id: string;
  slug: string;
  url: string;
  status: string;
  createdAt: string;
}

export interface FullReview extends TestReview {
  content: string;
  title: string | null;
  decisionMessage: string | null;
  decidedAt: string | null;
  source: string;
  threads: TestThread[];
  updatedAt: string;
}

export interface TestThread {
  id: string;
  startLine: number;
  endLine: number;
  selectedText: string;
  resolved: boolean;
  resolvedAt: string | null;
  comments: TestComment[];
  createdAt: string;
}

export interface TestComment {
  id: string;
  body: string;
  authorType: string;
  authorName: string | null;
  createdAt: string;
}

export async function createTestReview(
  content: string = "# Test\n\nThis is test content.",
  title?: string,
): Promise<TestReview> {
  const response = await fetch(`${config.apiBaseUrl}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      title,
      source: "manual",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create test review: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function getReview(reviewId: string): Promise<FullReview> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/reviews/${reviewId}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to get review: ${response.status}`);
  }

  return response.json();
}

export async function cleanupReview(reviewId: string): Promise<void> {
  console.log(`[cleanup] Review ${reviewId} retained (no DELETE endpoint)`);
}
