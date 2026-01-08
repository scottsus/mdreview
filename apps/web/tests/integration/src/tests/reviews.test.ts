import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { config } from "../config.js";
import {
  createTestReview,
  getReview,
  cleanupReview,
  type TestReview,
} from "../fixtures/reviews.js";

describe("Reviews API", () => {
  const createdReviewIds: string[] = [];

  afterAll(async () => {
    // Cleanup all created reviews
    for (const id of createdReviewIds) {
      await cleanupReview(id);
    }
  });

  describe("POST /api/reviews", () => {
    it("should create a review with minimal fields", async () => {
      const review = await createTestReview("# Minimal Review");
      createdReviewIds.push(review.id);

      expect(review.id).toBeDefined();
      expect(review.slug).toBeDefined();
      expect(review.slug).toHaveLength(10); // nanoid generates 10-char slugs
      expect(review.url).toContain(`/review/${review.slug}`);
      expect(review.status).toBe("pending");
      expect(review.createdAt).toBeDefined();
    });

    it("should create a review with title", async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "# Test Content",
          title: "My Test Review",
        }),
      });

      expect(response.status).toBe(201);

      const review = await response.json();
      createdReviewIds.push(review.id);

      expect(review.id).toBeDefined();
      expect(review.status).toBe("pending");
    });

    it("should create a review with agent source", async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "# Agent Review",
          source: "agent",
          agentId: "test-agent-123",
        }),
      });

      expect(response.status).toBe(201);

      const review = await response.json();
      createdReviewIds.push(review.id);

      // Fetch the full review to verify source
      const fullReview = await getReview(review.id);
      expect(fullReview.source).toBe("agent");
    });

    it("should reject empty content", async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe("validation_error");
    });

    it("should reject missing content", async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/reviews/[id]", () => {
    let testReview: TestReview;

    beforeAll(async () => {
      testReview = await createTestReview(
        "# Get Test\n\nParagraph content here.",
        "Get Test Review",
      );
      createdReviewIds.push(testReview.id);
    });

    it("should get a review by ID", async () => {
      const review = await getReview(testReview.id);

      expect(review.id).toBe(testReview.id);
      expect(review.slug).toBe(testReview.slug);
      expect(review.content).toBe("# Get Test\n\nParagraph content here.");
      expect(review.title).toBe("Get Test Review");
      expect(review.status).toBe("pending");
      expect(review.threads).toEqual([]);
      expect(review.createdAt).toBeDefined();
      expect(review.updatedAt).toBeDefined();
    });

    it("should return 404 for non-existent review", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${fakeId}`,
      );

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("not_found");
      expect(error.message).toBe("Review not found");
    });

    it("should return 500 for invalid UUID format", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/invalid-id`,
      );

      // PostgreSQL will throw an error for invalid UUID format
      expect(response.status).toBe(500);
    });
  });
});
