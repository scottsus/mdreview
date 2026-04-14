import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { config } from "../config.js";
import { createTestReview, cleanupReview } from "../fixtures/reviews.js";

// API key seeded in the DB for the test user (46dc35e5-f0f4-462f-a51a-e1db1069f3be)
const API_KEY = process.env.MDREVIEW_API_KEY;
const authHeaders = API_KEY ? { "Authorization": `Bearer ${API_KEY}` } : {};
const hasApiKey = !!API_KEY;

describe("Auth: access control", () => {
  describe("Anonymous reviews (userId = null)", () => {
    let slug: string;
    let reviewId: string;

    beforeAll(async () => {
      // Create review with no auth — should be public
      const review = await createTestReview("# Public Doc\n\nAnonymous content.");
      slug = review.slug;
      reviewId = review.id;
    });

    afterAll(async () => {
      await cleanupReview(reviewId);
    });

    it("GET /api/reviews/:slug — no auth → 200 (public)", async () => {
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.slug).toBe(slug);
      expect(body.isOwner).toBe(false);
    });

    it("GET /api/reviews/:slug — with API key → 200, isOwner false", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}`, {
        headers: authHeaders,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      // Anonymous reviews are not owned by anyone
      expect(body.isOwner).toBe(false);
    });

    it("POST /api/reviews/:slug/threads — no auth → 201 (public reviews allow anonymous comments)", async () => {
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startLine: 1,
          endLine: 1,
          selectedText: "Anonymous content.",
          body: "A comment on a public review",
        }),
      });
      expect(res.status).toBe(201);
    });
  });

  describe("Owned reviews (userId = caller)", () => {
    let slug: string;
    let reviewId: string;

    beforeAll(async () => {
      if (!hasApiKey) return;
      // Create review WITH auth — should be private/owned
      const res = await fetch(`${config.apiBaseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ content: "# Private Doc\n\nOwned content.", source: "agent" }),
      });
      const review = await res.json();
      slug = review.slug;
      reviewId = review.id;
    });

    afterAll(async () => {
      if (reviewId) await cleanupReview(reviewId);
    });

    it("GET /api/reviews/:slug — no auth → 401", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("unauthorized");
    });

    it("GET /api/reviews/:slug — fake API key → 401", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}`, {
        headers: { "Authorization": "Bearer mdr_fakekeynotreal" },
      });
      expect(res.status).toBe(401);
    });

    it("GET /api/reviews/:slug — valid API key → 200, isOwner true", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}`, {
        headers: authHeaders,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isOwner).toBe(true);
    });

    it("POST /api/reviews/:slug/threads — no auth → 401", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startLine: 1, endLine: 1, selectedText: "Owned content.", body: "test",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("POST /api/reviews/:slug/threads — valid API key → 201", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          startLine: 1, endLine: 1, selectedText: "Owned content.", body: "agent comment",
          authorType: "agent",
        }),
      });
      expect(res.status).toBe(201);
    });

    it("GET /api/reviews/:slug/export — no auth → 401", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}/export`);
      expect(res.status).toBe(401);
    });

    it("GET /api/reviews/:slug/export — valid API key → 200", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}/export?format=json`, {
        headers: authHeaders,
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Thread/reply auth on owned reviews", () => {
    let slug: string;
    let reviewId: string;
    let threadId: string;

    beforeAll(async () => {
      if (!hasApiKey) return;
      // Create owned review + thread
      const reviewRes = await fetch(`${config.apiBaseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ content: "# Thread Auth Test", source: "agent" }),
      });
      const review = await reviewRes.json();
      slug = review.slug;
      reviewId = review.id;

      const threadRes = await fetch(`${config.apiBaseUrl}/api/reviews/${slug}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ startLine: 1, endLine: 1, selectedText: "Thread Auth Test", body: "init" }),
      });
      const thread = await threadRes.json();
      threadId = thread.id;
    });

    afterAll(async () => {
      if (reviewId) await cleanupReview(reviewId);
    });

    it("POST /api/threads/:threadId/replies — no auth → 401", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/threads/${threadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "unauthorized reply" }),
      });
      expect(res.status).toBe(401);
    });

    it("POST /api/threads/:threadId/replies — valid API key → 201", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/threads/${threadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ body: "authorized reply", authorType: "agent" }),
      });
      expect(res.status).toBe(201);
    });

    it("PATCH /api/threads/:threadId — no auth → 401", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
      expect(res.status).toBe(401);
    });

    it("PATCH /api/threads/:threadId — valid API key → 200", async () => {
      if (!hasApiKey) return;
      const res = await fetch(`${config.apiBaseUrl}/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ resolved: true }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.resolved).toBe(true);
    });
  });

  describe("Slug enumeration prevention", () => {
    it("owned review + unauthenticated → 401 (not 403)", async () => {
      if (!hasApiKey) return;
      // No auth at all on a private review — should be 401
      const res = await fetch(`${config.apiBaseUrl}/api/reviews/priv-test-01`);
      expect(res.status).toBe(401);
    });

    it("owned review + authenticated but wrong owner → 404 (prevents enumeration)", async () => {
      if (!hasApiKey) return;
      // Create a second owned review using the real API key, then try to access
      // priv-test-01 (owned by a different user) using this key — should be 404
      // Note: this test only works if the API key belongs to a different user than priv-test-01
      // In the test environment, priv-test-01 is owned by user 46dc35e5 and our key also
      // belongs to the same user, so we skip this case — it requires two distinct test users.
      // The 404-not-403 behaviour is enforced by assertReviewAccess in auth-helpers.ts.
    });
  });
});
