const BASE_URL = process.env.MDREVIEW_BASE_URL || "https://markdown-review.vercel.app";

interface CreateReviewResponse {
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
  startLine: number;
  endLine: number;
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

interface ResolveThreadResponse {
  id: string;
  resolved: boolean;
  resolvedAt: string | null;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || BASE_URL;
    this.apiKey = apiKey;
  }

  private authHeaders(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  async createReview(content: string, title?: string): Promise<CreateReviewResponse> {
    const response = await fetch(`${this.baseUrl}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders(),
      },
      body: JSON.stringify({
        content,
        source: "agent",
        ...(title && { title }),
      }),
    });

    if (response.status === 401) {
      throw new Error("Authentication required. Set MDREVIEW_API_KEY environment variable with a valid API key.");
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create review");
    }

    return response.json();
  }

  async getReview(reviewId: string): Promise<ReviewResponse> {
    const response = await fetch(`${this.baseUrl}/api/reviews/${reviewId}`, {
      headers: { ...this.authHeaders() },
    });

    if (response.status === 401) {
      throw new Error("Authentication required. Set MDREVIEW_API_KEY environment variable with a valid API key.");
    }

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
        headers: {
          "Content-Type": "application/json",
          ...this.authHeaders(),
        },
        body: JSON.stringify({
          body,
          authorType: "agent",
          authorName: "AI Agent",
        }),
      },
    );

    if (response.status === 401) {
      throw new Error("Authentication required. Set MDREVIEW_API_KEY environment variable with a valid API key.");
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add comment");
    }

    return response.json();
  }

  async resolveThread(threadId: string): Promise<ResolveThreadResponse> {
    const response = await fetch(`${this.baseUrl}/api/threads/${threadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders(),
      },
      body: JSON.stringify({ resolved: true }),
    });

    if (response.status === 401) {
      throw new Error("Authentication required. Set MDREVIEW_API_KEY environment variable with a valid API key.");
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to resolve thread");
    }

    return response.json();
  }
}
