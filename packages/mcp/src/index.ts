#!/usr/bin/env node
import fs from "fs";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { ApiClient } from "./api-client.js";

const server = new McpServer({
  name: "mdreview",
  version: "0.4.0",
});

const apiClient = new ApiClient(process.env.MDREVIEW_BASE_URL);

// Tool: request_review
server.registerTool(
  "request_review",
  {
    title: "Request Review",
    description:
      "Create a markdown document review and get a shareable URL. Share this URL with the reviewer and they can add inline comments.",
    inputSchema: {
      filePath: z.string().describe("The path to the markdown file to review"),
    },
  },
  async ({ filePath }) => {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error reading file";
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Failed to read file at "${filePath}"\n\n${message}`,
          },
        ],
        isError: true,
      };
    }

    const result = await apiClient.createReview(content);

    return {
      content: [
        {
          type: "text" as const,
          text: `Review created successfully!\n\nReview URL: ${result.url}\n\nShare this URL with your reviewer. They can add inline comments by selecting text.\n\nUse 'get_review_status' with reviewId "${result.id}" to check comments.`,
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

    const commentsText = result.threads
      .map((thread) => {
        const comments = thread.comments
          .map((c) => `  - ${c.authorType}: ${c.body}`)
          .join("\n");
        return `[${thread.resolved ? "RESOLVED" : "UNRESOLVED"}] Thread: ${thread.id}\n"${thread.selectedText}"\n${comments}`;
      })
      .join("\n\n");

    const summary = {
      totalThreads: result.threads.length,
      resolvedThreads: result.threads.filter((t) => t.resolved).length,
      unresolvedThreads: result.threads.filter((t) => !t.resolved).length,
      totalComments: result.threads.reduce(
        (sum, t) => sum + t.comments.length,
        0,
      ),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: `Review: ${result.title || "(untitled)"}\nURL: ${result.url}\n\nSummary:\n- Total threads: ${summary.totalThreads}\n- Resolved: ${summary.resolvedThreads}\n- Unresolved: ${summary.unresolvedThreads}\n- Total comments: ${summary.totalComments}\n\n${commentsText ? `Comments:\n${commentsText}` : "No comments."}`,
        },
      ],
      structuredContent: {
        status: result.status,
        content: result.content,
        decisionMessage: result.decisionMessage,
        decidedAt: result.decidedAt,
        threads: result.threads,
        summary,
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

// Tool: resolve_thread
server.registerTool(
  "resolve_thread",
  {
    title: "Resolve Thread",
    description:
      "Mark a comment thread as resolved. Use this after addressing reviewer feedback.",
    inputSchema: {
      threadId: z.string().describe("The thread ID to resolve"),
    },
  },
  async ({ threadId }) => {
    const result = await apiClient.resolveThread(threadId);

    return {
      content: [
        {
          type: "text" as const,
          text: `Thread resolved successfully!\n\nThread ID: ${result.id}\nResolved at: ${result.resolvedAt}`,
        },
      ],
      structuredContent: {
        threadId: result.id,
        resolved: result.resolved,
        resolvedAt: result.resolvedAt,
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
