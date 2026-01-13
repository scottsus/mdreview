"use client";

import { CommentResponse, ThreadResponse } from "@/types";

export interface CreateThreadData {
  startLine: number;
  endLine: number;
  selectedText: string;
  body: string;
  authorType?: "human" | "agent";
  authorName?: string;
}

export interface ResolveThreadResult {
  resolved: boolean;
  resolvedAt: string | null;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }
  return response.json();
}

export const reviewApi = {
  createThread: async (
    reviewId: string,
    data: CreateThreadData,
  ): Promise<ThreadResponse> => {
    const response = await fetch(`/api/reviews/${reviewId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ThreadResponse>(response);
  },

  addReply: async (
    threadId: string,
    body: string,
    authorType: "human" | "agent" = "human",
    authorName?: string,
  ): Promise<CommentResponse> => {
    const response = await fetch(`/api/threads/${threadId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, authorType, authorName }),
    });
    return handleResponse<CommentResponse>(response);
  },

  resolveThread: async (
    threadId: string,
    resolved: boolean,
  ): Promise<ResolveThreadResult> => {
    const response = await fetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    });
    return handleResponse<ResolveThreadResult>(response);
  },

  exportReview: async (
    reviewId: string,
    format: "yaml" | "json",
  ): Promise<Blob> => {
    const response = await fetch(
      `/api/reviews/${reviewId}/export?format=${format}`,
    );
    if (!response.ok) {
      throw new ApiError(
        `Export failed with status ${response.status}`,
        response.status,
      );
    }
    return response.blob();
  },
};
