import { config } from "../config.js";

export interface CreateThreadData {
  startLine: number;
  endLine: number;
  selectedText: string;
  body: string;
  authorType?: "human" | "agent";
  authorName?: string;
}

export interface ThreadResult {
  id: string;
  reviewId: string;
  startLine: number;
  endLine: number;
  selectedText: string;
  resolved: boolean;
  comments: Array<{
    id: string;
    body: string;
    authorType: string;
    authorName: string | null;
    createdAt: string;
  }>;
  createdAt: string;
}

export async function createTestThread(
  slug: string,
  data: CreateThreadData,
  apiKey?: string,
): Promise<ThreadResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch(
    `${config.apiBaseUrl}/api/reviews/${slug}/threads`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create thread: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function createTestReply(
  threadId: string,
  body: string,
  authorType: "human" | "agent" = "human",
  authorName?: string,
): Promise<{
  id: string;
  threadId: string;
  body: string;
  authorType: string;
  authorName: string | null;
  createdAt: string;
}> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/threads/${threadId}/replies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, authorType, authorName }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create reply: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function resolveThread(
  threadId: string,
  resolved: boolean,
): Promise<{
  id: string;
  resolved: boolean;
  resolvedAt: string | null;
}> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/threads/${threadId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update thread: ${JSON.stringify(error)}`);
  }

  return response.json();
}
