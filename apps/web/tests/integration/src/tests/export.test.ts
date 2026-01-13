import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { config } from "../config.js";
import { createTestReview, cleanupReview } from "../fixtures/reviews.js";
import { createTestThread } from "../fixtures/threads.js";

describe("Export API", () => {
  let reviewId: string;
  let reviewSlug: string;

  beforeAll(async () => {
    const review = await createTestReview(
      "# Export Test\n\nContent to export",
      "Export Test Review",
    );
    reviewId = review.id;
    reviewSlug = review.slug;

    await createTestThread(reviewId, {
      startLine: 1,
      endLine: 1,
      selectedText: "# Export Test",
      body: "This is a comment",
      authorName: "Reviewer",
    });
  });

  afterAll(async () => {
    await cleanupReview(reviewId);
  });

  describe("GET /api/reviews/[id]/export", () => {
    it("should export as YAML by default", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${reviewId}/export`,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/yaml");
      expect(response.headers.get("Content-Disposition")).toContain(
        `filename="review-${reviewSlug}.yaml"`,
      );

      const yaml = await response.text();
      expect(yaml).toContain("review:");
      expect(yaml).toContain("id:");
      expect(yaml).toContain("title: Export Test Review");
      expect(yaml).toContain("status: pending");
      expect(yaml).toContain("threads:");
    });

    it("should export as YAML when format=yaml", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${reviewId}/export?format=yaml`,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/yaml");
    });

    it("should export as JSON when format=json", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${reviewId}/export?format=json`,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Disposition")).toContain(
        `filename="review-${reviewSlug}.json"`,
      );

      const data = await response.json();
      expect(data.review).toBeDefined();
      expect(data.review.id).toBe(reviewId);
      expect(data.review.title).toBe("Export Test Review");
      expect(data.review.status).toBe("pending");
      expect(data.review.decisionMessage).toBeNull();
      expect(data.threads).toBeDefined();
      expect(data.threads.length).toBeGreaterThan(0);
    });

    it("should include thread comments in export", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${reviewId}/export?format=json`,
      );

      const data = await response.json();
      const thread = data.threads[0];

      expect(thread.selectedText).toBe("# Export Test");
      expect(thread.resolved).toBe(false);
      expect(thread.comments).toBeDefined();
      expect(thread.comments.length).toBeGreaterThan(0);
      expect(thread.comments[0].body).toBe("This is a comment");
      expect(thread.comments[0].authorName).toBe("Reviewer");
    });

    it("should return 404 for non-existent review", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${fakeId}/export`,
      );

      expect(response.status).toBe(404);
    });

    it("should reject invalid format", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${reviewId}/export?format=xml`,
      );

      expect(response.status).toBe(400);
    });
  });
});
