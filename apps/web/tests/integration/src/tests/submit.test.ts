import { describe, expect, it, afterAll } from "vitest";

import { config } from "../config.js";
import { createTestReview, getReview, cleanupReview } from "../fixtures/reviews.js";

describe("Submit Review API", () => {
  const createdReviewIds: string[] = [];

  afterAll(async () => {
    for (const id of createdReviewIds) {
      await cleanupReview(id);
    }
  });

  describe("POST /api/reviews/[id]/submit", () => {
    it("should approve a review", async () => {
      const review = await createTestReview("# Approve Test");
      createdReviewIds.push(review.id);

      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "approved",
            message: "LGTM!",
          }),
        },
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.id).toBe(review.id);
      expect(result.status).toBe("approved");
      expect(result.decisionMessage).toBe("LGTM!");
      expect(result.decidedAt).toBeDefined();
    });

    it("should reject a review", async () => {
      const review = await createTestReview("# Reject Test");
      createdReviewIds.push(review.id);

      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "rejected",
            message: "Not acceptable",
          }),
        },
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.status).toBe("rejected");
      expect(result.decisionMessage).toBe("Not acceptable");
    });

    it("should request changes", async () => {
      const review = await createTestReview("# Changes Test");
      createdReviewIds.push(review.id);

      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "changes_requested",
            message: "Please fix the typo on line 3",
          }),
        },
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.status).toBe("changes_requested");
    });

    it("should allow submit without message", async () => {
      const review = await createTestReview("# No Message Test");
      createdReviewIds.push(review.id);

      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.decisionMessage).toBeNull();
    });

    it("should return 404 for non-existent review", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${fakeId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      expect(response.status).toBe(404);
    });

    it("should reject invalid status", async () => {
      const review = await createTestReview("# Invalid Status Test");
      createdReviewIds.push(review.id);

      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "invalid_status" }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("should allow re-submitting a decision", async () => {
      const review = await createTestReview("# Re-submit Test");
      createdReviewIds.push(review.id);

      // First approve
      await fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      // Then change to rejected
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "rejected",
            message: "Changed my mind",
          }),
        },
      );

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.status).toBe("rejected");
    });

    it("should persist decision in review data", async () => {
      const review = await createTestReview("# Persist Test");
      createdReviewIds.push(review.id);

      await fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          message: "Final approval",
        }),
      });

      const fullReview = await getReview(review.id);
      expect(fullReview.status).toBe("approved");
      expect(fullReview.decisionMessage).toBe("Final approval");
      expect(fullReview.decidedAt).toBeDefined();
    });
  });
});
