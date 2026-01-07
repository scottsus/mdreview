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

interface SubmitDecisionResponse {
  id: string;
  status: string;
  decisionMessage: string | null;
  decidedAt: string | null;
}

interface ResolveThreadResponse {
  id: string;
  resolved: boolean;
  resolvedAt: string | null;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BASE_URL;
  }

  async createReview(content: string): Promise<CreateReviewResponse> {
    const response = await fetch(`${this.baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        source: "agent",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create review");
    }

    return response.json();
  }

  async getReview(
    reviewId: string,
    includeContent = false,
  ): Promise<ReviewResponse> {
    const url = includeContent
      ? `${this.baseUrl}/api/reviews/${reviewId}?includeContent=true`
      : `${this.baseUrl}/api/reviews/${reviewId}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get review");
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

  async submitDecision(
    reviewId: string,
    decision: "approved" | "rejected" | "changes_requested",
    message?: string,
  ): Promise<SubmitDecisionResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/reviews/${reviewId}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, message }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to submit decision");
    }

    return response.json();
  }

  async resolveThread(threadId: string): Promise<ResolveThreadResponse> {
    const response = await fetch(`${this.baseUrl}/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to resolve thread");
    }

    return response.json();
  }
}
