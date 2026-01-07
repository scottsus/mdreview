#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { ApiClient } from "./api-client.js";

const server = new McpServer({
  name: "mdreview",
  version: "0.1.0",
});

const apiClient = new ApiClient(process.env.MDREVIEW_BASE_URL);

// Tool: request_review
server.registerTool(
  "request_review",
  {
    title: "Request Review",
    description:
      "Create a markdown document review and get a shareable URL. Share this URL with the reviewer and they can add inline comments and approve/reject the document.",
    inputSchema: {
      content: z.string().describe("The markdown content to review"),
      title: z.string().optional().describe("Optional title for the review"),
    },
  },
  async ({ content, title }) => {
    const result = await apiClient.createReview(content, title);

    return {
      content: [
        {
          type: "text" as const,
          text: `Review created successfully!\n\nReview URL: ${result.url}\n\nShare this URL with your reviewer. They can:\n- Add inline comments by selecting text\n- Approve, reject, or request changes\n\nUse 'wait_for_review' with reviewId "${result.id}" to wait for the review to complete.`,
        },
      ],
      structuredContent: {
        reviewId: result.id,
        url: result.url,
        status: result.status,
      } as Record<string, unknown>,
    };
  },
);

// Tool: wait_for_review
server.registerTool(
  "wait_for_review",
  {
    title: "Wait for Review",
    description:
      "Wait for a review to be completed (approved, rejected, or changes requested). This will block until the reviewer makes a decision or the timeout is reached.",
    inputSchema: {
      reviewId: z.string().describe("The review ID to wait for"),
      timeoutSeconds: z
        .number()
        .min(1)
        .max(300)
        .default(300)
        .describe("Maximum time to wait in seconds (default: 300)"),
    },
  },
  async ({ reviewId, timeoutSeconds }) => {
    const result = await apiClient.waitForReview(reviewId, timeoutSeconds);

    if (result.status === "pending") {
      return {
        content: [
          {
            type: "text" as const,
            text: `Review is still pending after ${timeoutSeconds} seconds. You can call wait_for_review again to continue waiting.`,
          },
        ],
        structuredContent: { status: "pending", timedOut: true } as Record<
          string,
          unknown
        >,
      };
    }

    const commentsText = result.threads
      .map((thread) => {
        const comments = thread.comments
          .map((c) => `  - ${c.authorType}: ${c.body}`)
          .join("\n");
        return `[${thread.resolved ? "RESOLVED" : "UNRESOLVED"}] "${thread.selectedText}"\n${comments}`;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Review completed!\n\nStatus: ${result.status.toUpperCase()}\nMessage: ${result.decisionMessage || "(none)"}\n\nSummary:\n- Total threads: ${result.summary.totalThreads}\n- Resolved: ${result.summary.resolvedThreads}\n- Unresolved: ${result.summary.unresolvedThreads}\n- Total comments: ${result.summary.totalComments}\n\n${commentsText ? `Comments:\n${commentsText}` : "No comments."}`,
        },
      ],
      structuredContent: { ...result } as Record<string, unknown>,
    };
  },
);

// Tool: get_review_status
server.registerTool(
  "get_review_status",
  {
    title: "Get Review Status",
    description:
      "Get the current status of a review without waiting. Use this to check if a review has been completed.",
    inputSchema: {
      reviewId: z.string().describe("The review ID to check"),
    },
  },
  async ({ reviewId }) => {
    const result = await apiClient.getReview(reviewId);

    return {
      content: [
        {
          type: "text" as const,
          text: `Review Status: ${result.status.toUpperCase()}\nTitle: ${result.title || "(untitled)"}\nThreads: ${result.threads.length}\nURL: ${result.url}`,
        },
      ],
      structuredContent: {
        status: result.status,
        threadCount: result.threads.length,
        commentCount: result.threads.reduce(
          (sum, t) => sum + t.comments.length,
          0,
        ),
      } as Record<string, unknown>,
    };
  },
);

// Tool: add_comment
server.registerTool(
  "add_comment",
  {
    title: "Add Comment",
    description:
      "Add a reply to an existing comment thread. Use this to respond to reviewer feedback.",
    inputSchema: {
      threadId: z.string().describe("The thread ID to reply to"),
      body: z.string().describe("The comment text"),
    },
  },
  async ({ threadId, body }) => {
    const result = await apiClient.addComment(threadId, body);

    return {
      content: [
        {
          type: "text" as const,
          text: `Comment added successfully!\n\nThread: ${result.id}\nComment: ${result.body}`,
        },
      ],
      structuredContent: {
        commentId: result.id,
        createdAt: result.createdAt,
      } as Record<string, unknown>,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MDReview MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
