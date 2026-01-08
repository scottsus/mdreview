import { describe, expect, it, afterAll } from "vitest";

import { config } from "../config.js";
import { createTestReview, cleanupReview } from "../fixtures/reviews.js";
import { createTestThread } from "../fixtures/threads.js";

describe("Wait API", () => {
  const createdReviewIds: string[] = [];

  afterAll(async () => {
    for (const id of createdReviewIds) {
      await cleanupReview(id);
    }
  });

  describe("GET /api/reviews/[id]/wait", () => {
    it("should return immediately when review is already decided", async () => {
      // Create and approve a review
      const review = await createTestReview("# Immediate Return Test");
      createdReviewIds.push(review.id);

      await fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          message: "Approved!",
        }),
      });

      const startTime = Date.now();
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/wait`,
      );
      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(200);
      // Should return almost immediately (less than 1 second)
      expect(elapsed).toBeLessThan(1000);

      const data = await response.json();
      expect(data.status).toBe("approved");
      expect(data.decisionMessage).toBe("Approved!");
      expect(data.decidedAt).toBeDefined();
    });

    it("should return thread summary when decided", async () => {
      const review = await createTestReview("# Summary Test");
      createdReviewIds.push(review.id);

      // Add threads
      const thread1 = await createTestThread(review.id, {
        startLine: 1,
        endLine: 1,
        selectedText: "Test",
        body: "Comment 1",
      });

      await createTestThread(review.id, {
        startLine: 2,
        endLine: 2,
        selectedText: "Test2",
        body: "Comment 2",
      });

      // Resolve one thread
      await fetch(`${config.apiBaseUrl}/api/threads/${thread1.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });

      // Submit decision
      await fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "changes_requested" }),
      });

      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/wait`,
      );

      const data = await response.json();
      expect(data.summary).toBeDefined();
      expect(data.summary.totalThreads).toBe(2);
      expect(data.summary.resolvedThreads).toBe(1);
      expect(data.summary.unresolvedThreads).toBe(1);
      expect(data.summary.totalComments).toBe(2);
    });

    it("should include threads in response", async () => {
      const review = await createTestReview("# Threads Test");
      createdReviewIds.push(review.id);

      await createTestThread(review.id, {
        startLine: 1,
        endLine: 3,
        selectedText: "Multiple lines",
        body: "Thread comment",
      });

      await fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/wait`,
      );

      const data = await response.json();
      expect(data.threads).toBeDefined();
      expect(data.threads.length).toBe(1);
      expect(data.threads[0].startLine).toBe(1);
      expect(data.threads[0].endLine).toBe(3);
      expect(data.threads[0].comments.length).toBe(1);
    });

    it("should timeout and return 408 for pending review", async () => {
      const review = await createTestReview("# Timeout Test");
      createdReviewIds.push(review.id);

      const startTime = Date.now();
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/wait?timeout=3`,
      );
      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(408);
      // Should take ~3 seconds (with some tolerance)
      expect(elapsed).toBeGreaterThan(2500);
      expect(elapsed).toBeLessThan(5000);

      const data = await response.json();
      expect(data.status).toBe("pending");
      expect(data.message).toBe("Review still pending. Poll again.");
    }, 10000); // Increase test timeout

    it("should respect custom timeout parameter", async () => {
      const review = await createTestReview("# Custom Timeout Test");
      createdReviewIds.push(review.id);

      const startTime = Date.now();
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/wait?timeout=2`,
      );
      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(408);
      expect(elapsed).toBeGreaterThan(1500);
      expect(elapsed).toBeLessThan(4000);
    }, 10000);

    it("should return 404 for non-existent review", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${fakeId}/wait`,
      );

      expect(response.status).toBe(404);
    });

    it("should handle concurrent wait requests", async () => {
      const review = await createTestReview("# Concurrent Test");
      createdReviewIds.push(review.id);

      // Approve after 1 second
      setTimeout(async () => {
        await fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
      }, 1000);

      // Start two wait requests concurrently
      const [response1, response2] = await Promise.all([
        fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/wait?timeout=5`),
        fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/wait?timeout=5`),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.status).toBe("approved");
      expect(data2.status).toBe("approved");
    }, 10000);
  });
});
