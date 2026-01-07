const BASE_URL = process.env.MDREVIEW_BASE_URL || "https://mdreview.vercel.app";

interface CreateReviewResponse {
  id: string;
  slug: string;
  url: string;
  status: string;
  createdAt: string;
}

interface ReviewResponse {
  id: string;
  slug: string;
  url: string;
  content: string;
  title: string | null;
  status: string;
  decisionMessage: string | null;
  decidedAt: string | null;
  threads: ThreadResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ThreadResponse {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  resolved: boolean;
  comments: CommentResponse[];
}

interface CommentResponse {
  id: string;
  body: string;
  authorType: string;
  authorName: string | null;
  createdAt: string;
}

interface WaitResponse {
  id: string;
  status: string;
  decisionMessage: string | null;
  decidedAt: string | null;
  threads: ThreadResponse[];
  summary: {
    totalThreads: number;
    resolvedThreads: number;
    unresolvedThreads: number;
    totalComments: number;
  };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BASE_URL;
  }

  async createReview(
    content: string,
    title?: string,
  ): Promise<CreateReviewResponse> {
    const response = await fetch(`${this.baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        title,
        source: "agent",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create review");
    }

    return response.json();
  }

  async getReview(reviewId: string): Promise<ReviewResponse> {
    const response = await fetch(`${this.baseUrl}/api/reviews/${reviewId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get review");
    }

    return response.json();
  }

  async waitForReview(
    reviewId: string,
    timeoutSeconds = 300,
  ): Promise<WaitResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/reviews/${reviewId}/wait?timeout=${timeoutSeconds}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to wait for review");
    }

    return response.json();
  }

  async addComment(threadId: string, body: string): Promise<CommentResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/threads/${threadId}/replies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          authorType: "agent",
          authorName: "AI Agent",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add comment");
    }

    return response.json();
  }
}
