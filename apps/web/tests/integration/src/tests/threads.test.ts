import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { config } from "../config.js";
import { createTestReview, getReview, cleanupReview } from "../fixtures/reviews.js";
import {
  createTestThread,
  createTestReply,
  resolveThread,
} from "../fixtures/threads.js";

describe("Threads API", () => {
  let reviewId: string;

  beforeAll(async () => {
    const review = await createTestReview(
      "# Thread Test\n\nLine 1\nLine 2\nLine 3",
    );
    reviewId = review.id;
  });

  afterAll(async () => {
    await cleanupReview(reviewId);
  });

  describe("POST /api/reviews/[id]/threads", () => {
    it("should create a thread with initial comment", async () => {
      const thread = await createTestThread(reviewId, {
        startLine: 1,
        endLine: 1,
        selectedText: "# Thread Test",
        body: "This is a test comment",
      });

      expect(thread.id).toBeDefined();
      expect(thread.reviewId).toBe(reviewId);
      expect(thread.startLine).toBe(1);
      expect(thread.endLine).toBe(1);
      expect(thread.selectedText).toBe("# Thread Test");
      expect(thread.resolved).toBe(false);
      expect(thread.comments).toHaveLength(1);
      expect(thread.comments[0]!.body).toBe("This is a test comment");
      expect(thread.comments[0]!.authorType).toBe("human");
      expect(thread.createdAt).toBeDefined();
    });

    it("should create a thread with agent author", async () => {
      const thread = await createTestThread(reviewId, {
        startLine: 3,
        endLine: 5,
        selectedText: "Line 1\nLine 2\nLine 3",
        body: "Agent comment",
        authorType: "agent",
        authorName: "TestBot",
      });

      expect(thread.comments[0]!.authorType).toBe("agent");
      expect(thread.comments[0]!.authorName).toBe("TestBot");
    });

    it("should create a thread spanning multiple lines", async () => {
      const thread = await createTestThread(reviewId, {
        startLine: 2,
        endLine: 4,
        selectedText: "Multiple\nLines\nSelected",
        body: "Multi-line selection comment",
      });

      expect(thread.startLine).toBe(2);
      expect(thread.endLine).toBe(4);
    });

    it("should reject thread on non-existent review", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${fakeId}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startLine: 1,
            endLine: 1,
            selectedText: "test",
            body: "test comment",
          }),
        },
      );

      expect(response.status).toBe(404);
    });

    it("should reject invalid startLine (must be >= 1)", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${reviewId}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startLine: 0,
            endLine: 1,
            selectedText: "test",
            body: "test",
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject empty body", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${reviewId}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startLine: 1,
            endLine: 1,
            selectedText: "test",
            body: "",
          }),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/threads/[threadId]/replies", () => {
    let threadId: string;

    beforeAll(async () => {
      const thread = await createTestThread(reviewId, {
        startLine: 1,
        endLine: 1,
        selectedText: "Test",
        body: "Initial comment",
      });
      threadId = thread.id;
    });

    it("should add a reply to a thread", async () => {
      const reply = await createTestReply(threadId, "This is a reply");

      expect(reply.id).toBeDefined();
      expect(reply.threadId).toBe(threadId);
      expect(reply.body).toBe("This is a reply");
      expect(reply.authorType).toBe("human");
      expect(reply.createdAt).toBeDefined();
    });

    it("should add a reply with author name", async () => {
      const reply = await createTestReply(
        threadId,
        "Named reply",
        "human",
        "John Doe",
      );

      expect(reply.authorName).toBe("John Doe");
    });

    it("should add an agent reply", async () => {
      const reply = await createTestReply(
        threadId,
        "Agent reply",
        "agent",
        "ClaudeBot",
      );

      expect(reply.authorType).toBe("agent");
      expect(reply.authorName).toBe("ClaudeBot");
    });

    it("should reject reply to non-existent thread", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(
        `${config.apiBaseUrl}/api/threads/${fakeId}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: "test" }),
        },
      );

      expect(response.status).toBe(404);
    });

    it("should verify comments are returned in review", async () => {
      const review = await getReview(reviewId);

      const thread = review.threads.find((t) => t.id === threadId);
      expect(thread).toBeDefined();
      expect(thread!.comments.length).toBeGreaterThanOrEqual(4); // Initial + 3 replies
    });
  });

  describe("PATCH /api/threads/[threadId]", () => {
    let threadId: string;

    beforeAll(async () => {
      const thread = await createTestThread(reviewId, {
        startLine: 1,
        endLine: 1,
        selectedText: "Resolve test",
        body: "Thread to resolve",
      });
      threadId = thread.id;
    });

    it("should resolve a thread", async () => {
      const result = await resolveThread(threadId, true);

      expect(result.id).toBe(threadId);
      expect(result.resolved).toBe(true);
      expect(result.resolvedAt).toBeDefined();
    });

    it("should unresolve a thread", async () => {
      const result = await resolveThread(threadId, false);

      expect(result.resolved).toBe(false);
      expect(result.resolvedAt).toBeNull();
    });

    it("should reject update on non-existent thread", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(
        `${config.apiBaseUrl}/api/threads/${fakeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved: true }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

});
