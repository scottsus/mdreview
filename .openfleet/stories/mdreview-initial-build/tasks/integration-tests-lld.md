# Integration Tests - Low Level Design

**Date**: 2025-01-07
**Status**: Planning Complete
**Reference**: `../starfleet/tests/integration/`

---

## Overview

This document provides a detailed implementation plan for integration tests covering all MDReview API endpoints. Tests follow the "no mocking" philosophy - hitting real API endpoints against a running local server.

### Goals

1. Create a safety net for refactoring (tech debt cleanup)
2. Document expected API behavior through tests
3. Catch regressions before deployment

---

## 1. Directory Structure

```
apps/web/tests/integration/
├── package.json              # Test dependencies (vitest, dotenv)
├── vitest.config.ts          # Test configuration
├── tsconfig.json             # TypeScript config
├── .env.example              # Environment variable template
├── .env.local                # Local environment (gitignored)
├── src/
│   ├── config.ts             # Environment-based configuration
│   ├── setup.ts              # Global test setup (logging)
│   ├── fixtures/
│   │   ├── reviews.ts        # createTestReview, cleanupReview
│   │   └── threads.ts        # createTestThread, createTestReply
│   └── tests/
│       ├── health.test.ts    # Basic connectivity test
│       ├── reviews.test.ts   # Review CRUD operations
│       ├── threads.test.ts   # Thread and comment operations
│       ├── submit.test.ts    # Review decision workflow
│       ├── export.test.ts    # YAML/JSON export
│       └── wait.test.ts      # Long-polling endpoint
```

---

## 2. Package Configuration

### `apps/web/tests/integration/package.json`

```json
{
  "name": "@mdreview/integration-tests",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@mdreview/typescript-config": "workspace:*",
    "@vitest/ui": "^2.1.8",
    "typescript": "^5.7.0",
    "vitest": "^2.1.8"
  }
}
```

### `apps/web/tests/integration/vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: "./src/setup.ts",
    testTimeout: 30000,
    retry: 1,
    fileParallelism: false, // Run sequentially to avoid race conditions
    exclude: ["**/node_modules/**", "**/dist/**"],
    reporters: [
      "default",
      ["html", { outputFile: "test-results/index.html" }],
      ["json", { outputFile: "test-results/results.json" }],
    ],
  },
});
```

### `apps/web/tests/integration/tsconfig.json`

```json
{
  "extends": "@mdreview/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 3. Configuration Setup

### `apps/web/tests/integration/.env.example`

```bash
# API Base URL (default: http://localhost:3000)
API_BASE_URL="http://localhost:3000"
```

### `apps/web/tests/integration/src/config.ts`

```typescript
import { config as loadEnv } from "dotenv";

// Load .env.local for local development
loadEnv({ path: ".env.local" });

export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || "http://localhost:3000";
}

export const config = {
  apiBaseUrl: getApiBaseUrl(),
};
```

### `apps/web/tests/integration/src/setup.ts`

```typescript
import { config } from "./config";

export default function globalSetup() {
  console.log("MDReview Integration Test Configuration:");
  console.log(`  API Base URL: ${config.apiBaseUrl}`);
  console.log("");
}
```

---

## 4. Test Fixtures

### `apps/web/tests/integration/src/fixtures/reviews.ts`

```typescript
import { config } from "../config";

export interface TestReview {
  id: string;
  slug: string;
  url: string;
  status: string;
  createdAt: string;
}

export interface FullReview extends TestReview {
  content: string;
  title: string | null;
  decisionMessage: string | null;
  decidedAt: string | null;
  source: string;
  threads: TestThread[];
  updatedAt: string;
}

export interface TestThread {
  id: string;
  startLine: number;
  endLine: number;
  selectedText: string;
  resolved: boolean;
  resolvedAt: string | null;
  comments: TestComment[];
  createdAt: string;
}

export interface TestComment {
  id: string;
  body: string;
  authorType: string;
  authorName: string | null;
  createdAt: string;
}

export async function createTestReview(
  content: string = "# Test\n\nThis is test content.",
  title?: string,
): Promise<TestReview> {
  const response = await fetch(`${config.apiBaseUrl}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      title,
      source: "manual",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create test review: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function getReview(reviewId: string): Promise<FullReview> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/reviews/${reviewId}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to get review: ${response.status}`);
  }

  return response.json();
}

// Note: MDReview doesn't have a DELETE endpoint, so cleanup means
// the test data stays in the database. For real cleanup, you'd
// need direct database access or to add a DELETE endpoint.
export async function cleanupReview(reviewId: string): Promise<void> {
  // Currently a no-op since there's no DELETE endpoint
  // Consider adding DELETE /api/reviews/[id] for test cleanup
  console.log(`[cleanup] Review ${reviewId} retained (no DELETE endpoint)`);
}
```

### `apps/web/tests/integration/src/fixtures/threads.ts`

```typescript
import { config } from "../config";

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
  reviewId: string,
  data: CreateThreadData,
): Promise<ThreadResult> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/reviews/${reviewId}/threads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
```

---

## 5. Test Files

### 5.1 `src/tests/health.test.ts`

**Purpose**: Verify the API server is running and reachable.

```typescript
import { describe, expect, it } from "vitest";

import { config } from "../config";

describe("API Health Check", () => {
  it("should verify the API is reachable", async () => {
    // Test by hitting the main API endpoint
    const response = await fetch(`${config.apiBaseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "# Health Check" }),
    });

    // 201 Created means the API is working
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("slug");
  });
});
```

### 5.2 `src/tests/reviews.test.ts`

**Purpose**: Test review creation and retrieval.

```typescript
import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { config } from "../config";
import { 
  createTestReview, 
  getReview, 
  cleanupReview,
  type TestReview 
} from "../fixtures/reviews";

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
      expect(review.slug).toHaveLength(8); // nanoid generates 8-char slugs
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
```

### 5.3 `src/tests/threads.test.ts`

**Purpose**: Test thread creation, replies, and resolution.

```typescript
import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { config } from "../config";
import { createTestReview, getReview, cleanupReview } from "../fixtures/reviews";
import { 
  createTestThread, 
  createTestReply, 
  resolveThread 
} from "../fixtures/threads";

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
      expect(thread.comments[0].body).toBe("This is a test comment");
      expect(thread.comments[0].authorType).toBe("human");
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

      expect(thread.comments[0].authorType).toBe("agent");
      expect(thread.comments[0].authorName).toBe("TestBot");
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

  describe("Agent comment resets review status", () => {
    it("should reset review to pending when agent adds comment to approved review", async () => {
      // Create and approve a review
      const review = await createTestReview("# Agent Reset Test");
      
      // Submit approval
      await fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          message: "Looks good!",
        }),
      });

      // Verify it's approved
      let fullReview = await getReview(review.id);
      expect(fullReview.status).toBe("approved");

      // Agent creates a new thread
      await createTestThread(review.id, {
        startLine: 1,
        endLine: 1,
        selectedText: "Test",
        body: "Agent comment",
        authorType: "agent",
      });

      // Verify status reset to pending
      fullReview = await getReview(review.id);
      expect(fullReview.status).toBe("pending");
      expect(fullReview.decisionMessage).toBeNull();
      expect(fullReview.decidedAt).toBeNull();

      await cleanupReview(review.id);
    });

    it("should reset review to pending when agent replies to approved review", async () => {
      // Create a review with a thread, then approve it
      const review = await createTestReview("# Agent Reply Reset Test");
      const thread = await createTestThread(review.id, {
        startLine: 1,
        endLine: 1,
        selectedText: "Test",
        body: "Initial comment",
      });

      // Submit approval
      await fetch(`${config.apiBaseUrl}/api/reviews/${review.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      // Agent replies
      await createTestReply(thread.id, "Agent follow-up", "agent");

      // Verify status reset
      const fullReview = await getReview(review.id);
      expect(fullReview.status).toBe("pending");

      await cleanupReview(review.id);
    });
  });
});
```

### 5.4 `src/tests/submit.test.ts`

**Purpose**: Test review decision workflow (approve/reject/changes_requested).

```typescript
import { describe, expect, it, beforeEach, afterAll } from "vitest";

import { config } from "../config";
import { createTestReview, getReview, cleanupReview } from "../fixtures/reviews";

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
```

### 5.5 `src/tests/export.test.ts`

**Purpose**: Test YAML and JSON export functionality.

```typescript
import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { config } from "../config";
import { createTestReview, cleanupReview } from "../fixtures/reviews";
import { createTestThread } from "../fixtures/threads";

describe("Export API", () => {
  let reviewId: string;
  let reviewSlug: string;

  beforeAll(async () => {
    // Create a review with threads for export testing
    const review = await createTestReview(
      "# Export Test\n\nContent to export",
      "Export Test Review",
    );
    reviewId = review.id;
    reviewSlug = review.slug;

    // Add a thread with comments
    await createTestThread(reviewId, {
      startLine: 1,
      endLine: 1,
      selectedText: "# Export Test",
      body: "This is a comment",
      authorName: "Reviewer",
    });

    // Submit a decision
    await fetch(`${config.apiBaseUrl}/api/reviews/${reviewId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "approved",
        message: "Approved for export",
      }),
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
      expect(yaml).toContain("status: approved");
      expect(yaml).toContain("threads:");
    });

    it("should export as YAML when format=yaml", async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${reviewId}/export?format=yaml`,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/yaml");

      const yaml = await response.text();
      expect(yaml).toContain("decisionMessage: Approved for export");
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
      expect(data.review.status).toBe("approved");
      expect(data.review.decisionMessage).toBe("Approved for export");
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
```

### 5.6 `src/tests/wait.test.ts`

**Purpose**: Test long-polling endpoint for review completion.

```typescript
import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { config } from "../config";
import { createTestReview, cleanupReview } from "../fixtures/reviews";
import { createTestThread } from "../fixtures/threads";

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

    it("should cap timeout at 300 seconds", async () => {
      const review = await createTestReview("# Max Timeout Test");
      createdReviewIds.push(review.id);

      // Try to set timeout to 1000 seconds (should be capped at 300)
      const response = await fetch(
        `${config.apiBaseUrl}/api/reviews/${review.id}/wait?timeout=1000`,
      );

      // This test just verifies the request doesn't error
      // Full verification would require waiting too long
      expect([200, 408]).toContain(response.status);
    });

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
```

---

## 6. Monorepo Integration

### Update Root `turbo.json`

Add test tasks to the Turborepo configuration:

```json
{
  "tasks": {
    // ... existing tasks ...
    "test": {
      "cache": false
    },
    "test:integration": {
      "dependsOn": [],
      "cache": false
    }
  }
}
```

### Update Root `package.json`

Add test script:

```json
{
  "scripts": {
    // ... existing scripts ...
    "test:integration": "pnpm --filter @mdreview/integration-tests test"
  }
}
```

---

## 7. Execution Instructions

### Prerequisites

1. PostgreSQL database running with schema pushed (`pnpm db:push`)
2. Next.js dev server running (`pnpm dev`)

### Running Tests

```bash
# From repository root
cd apps/web/tests/integration

# Install dependencies (first time only)
pnpm install

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm test src/tests/reviews.test.ts

# Type check
pnpm check-types
```

### From Root Directory

```bash
# Run integration tests via turbo
pnpm test:integration
```

### CI Integration

For CI, ensure:
1. Database is provisioned
2. Next.js server is started before tests
3. `API_BASE_URL` environment variable is set

Example CI workflow:
```yaml
- name: Setup database
  run: pnpm db:push

- name: Start server
  run: pnpm dev &
  
- name: Wait for server
  run: sleep 5

- name: Run integration tests
  run: pnpm test:integration
```

---

## 8. Test Coverage Summary

| API Route | Test Cases |
|-----------|-----------|
| `POST /api/reviews` | Create minimal, with title, with agent source, validation errors |
| `GET /api/reviews/[id]` | Get by ID, 404 handling, invalid UUID |
| `POST /api/reviews/[id]/threads` | Create thread, agent author, multi-line, validation |
| `POST /api/threads/[threadId]/replies` | Add reply, with author, agent reply, 404 handling |
| `PATCH /api/threads/[threadId]` | Resolve, unresolve, 404 handling |
| `POST /api/reviews/[id]/submit` | Approve, reject, changes_requested, validation |
| `GET /api/reviews/[id]/export` | YAML default, JSON format, thread inclusion, 404 |
| `GET /api/reviews/[id]/wait` | Immediate return, timeout, thread summary, concurrent |

**Total Test Cases**: ~45

---

## 9. Future Considerations

1. **Add DELETE endpoint**: Currently no way to clean up test data. Consider adding `DELETE /api/reviews/[id]` for test cleanup.

2. **Database seeding**: For complex scenarios, consider direct database seeding rather than API-based setup.

3. **Performance testing**: The wait endpoint could be stress-tested with many concurrent connections.

4. **MCP integration tests**: Test the MCP server package separately once the web API tests are stable.
