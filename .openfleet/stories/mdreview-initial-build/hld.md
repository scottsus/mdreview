# MDReview - High-Level Design

**Author**: Apollo (Planner)
**Date**: 2025-01-05
**Updated**: 2025-01-06
**Status**: Draft
**Story**: md-reviewer-nextjs-migration

---

## 1. Overview

### Product Summary

**MDReview** is a standalone SaaS web application for markdown document review with formal approve/reject workflows. It enables both human-initiated and AI-agent-initiated document reviews through shareable links, with no authentication required for reviewers.

### Goals

1. **Anonymous reviews** - Reviewers access documents via shareable URLs without creating accounts
2. **Formal workflow** - Clear approve/reject/changes-requested states with decision tracking
3. **Inline commenting** - Select text ranges and attach threaded comments
4. **Agent integration** - First-class API support for AI agents (Claude Code, Cursor, OpenCode, etc.) via MCP tools and REST
5. **Export capability** - Structured export of comments to YAML/clipboard for feeding back to agents
6. **Self-hostable** - Deployable to cloud (Vercel) or self-hosted (Docker)

### Non-Goals (v1)

- Real-time collaboration (multiple reviewers editing simultaneously)
- User accounts and authentication (handled via unique URLs)
- Rich text editing (pure markdown only)
- Version control / diff views (out of scope for MVP)
- Mobile-native apps
- Integration with Git providers (GitHub PRs, etc.)

### Why Build This?

Per competitive research, **no existing tool** addresses our unique requirements:

- HackMD/HedgeDoc: No formal review workflow
- GitHub PRs: Requires Git repository and GitHub account
- GitBook: Expensive ($65/site), no self-hosting
- Notion: Not markdown-native, requires authentication

---

## 2. Architecture

### 2.1 Monorepo Structure

MDReview is organized as a monorepo with two packages:

```
mdreview/
├── apps/
│   └── web/                    # Next.js web application
│       ├── app/                # App router pages & API routes
│       ├── components/         # React components
│       ├── lib/                # Shared utilities
│       └── package.json
├── packages/
│   └── mcp/                    # MCP server (standalone npm package)
│       ├── src/
│       │   ├── index.ts        # MCP server entry point
│       │   └── tools/          # Tool implementations
│       └── package.json
├── package.json                # Monorepo root
├── turbo.json                  # Turborepo configuration
├── docker-compose.yml          # Self-hosting
└── README.md
```

### 2.2 Package Responsibilities

| Package        | Description                          | Distribution         |
| -------------- | ------------------------------------ | -------------------- |
| `apps/web`     | Next.js web app with UI and REST API | Vercel deployment    |
| `packages/mcp` | Standalone MCP server for AI agents  | npm: `@mdreview/mcp` |

### 2.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MDREVIEW MONOREPO                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    apps/web (Next.js Application)                    │    │
│  │                       Deployed to Vercel                             │    │
│  │                                                                      │    │
│  │   ┌────────────────────────┐    ┌────────────────────────────────┐  │    │
│  │   │      React Frontend     │    │         API Routes            │  │    │
│  │   │                         │    │                                │  │    │
│  │   │  /                      │    │  POST   /api/reviews           │  │    │
│  │   │    Landing + Upload     │    │  GET    /api/reviews/:id       │  │    │
│  │   │                         │    │  GET    /api/reviews/:id/wait  │  │    │
│  │   │  /review/:id            │    │  POST   /api/reviews/:id/submit│  │    │
│  │   │    Markdown Viewer      │    │  GET    /api/reviews/:id/export│  │    │
│  │   │    Inline Comments      │    │                                │  │    │
│  │   │    Comment Sidebar      │    │  POST   /api/threads           │  │    │
│  │   │    Review Actions       │    │  PATCH  /api/threads/:id       │  │    │
│  │   │                         │    │  POST   /api/threads/:id/replies│  │    │
│  │   └────────────────────────┘    └────────────────────────────────┘  │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                         │                                    │
│                                         ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         PostgreSQL Database                          │    │
│  │                                                                      │    │
│  │   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │    │
│  │   │ reviews  │───│ threads  │───│ comments │   │ exports  │        │    │
│  │   │          │   │          │   │          │   │(optional)│        │    │
│  │   └──────────┘   └──────────┘   └──────────┘   └──────────┘        │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                packages/mcp (Standalone MCP Server)                  │    │
│  │                  Distributed via npm: @mdreview/mcp                  │    │
│  │                                                                      │    │
│  │   ┌─────────────────────────────────────────────────────────────┐   │    │
│  │   │  Thin wrapper - calls web app's REST API                     │   │    │
│  │   │                                                               │   │    │
│  │   │  MCP Tools:                                                   │   │    │
│  │   │    request_review  ──► POST /api/reviews                      │   │    │
│  │   │    wait_for_review ──► GET  /api/reviews/:id/wait             │   │    │
│  │   │    get_status      ──► GET  /api/reviews/:id                  │   │    │
│  │   │    add_comment     ──► POST /api/threads/:id/replies          │   │    │
│  │   └─────────────────────────────────────────────────────────────┘   │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

External Integrations:

┌─────────────────┐              ┌─────────────────────────────────────────┐
│   Human User    │              │              AI Agents                    │
│                 │              │                                           │
│  Browser UI     │              │  Claude Code, Cursor, OpenCode, etc.     │
│  - View review  │              │                                           │
│  - Add comments │              │  Install: npx @mdreview/mcp              │
│  - Approve/Reject│             │  Or: npm install @mdreview/mcp           │
│                 │              │                                           │
│                 │              │  Works with ANY MCP-compatible client     │
└────────┬────────┘              └────────────────┬────────────────────────┘
         │                                        │
         │                                        │ (MCP protocol)
         │                                        ▼
         │                          ┌─────────────────────────┐
         │                          │   @mdreview/mcp         │
         │                          │   (local MCP server)     │
         │                          └────────────┬────────────┘
         │                                       │
         │                                       │ (REST API calls)
         │     ┌───────────────────────────┐     │
         └─────►   mdreview.vercel.app    ◄─────┘
               │   (HTTPS)                 │
               └───────────────────────────┘
```

### 2.4 MCP Server Design Philosophy

The MCP server (`@mdreview/mcp`) is designed to be:

1. **Standalone** - NOT part of openfleet or any specific tool
2. **Universal** - Works with ANY MCP-compatible client
3. **Thin** - Just translates MCP tool calls to REST API calls
4. **Stateless** - All state lives in the web app's database

---

## 3. User Flows

### 3.1 Manual Flow (Human-Initiated)

```
Human Author                        MDReview                        Human Reviewer
     │                                   │                                │
     │  1. Upload markdown               │                                │
     │─────────────────────────────────►│                                │
     │                                   │                                │
     │  2. Receive shareable URL         │                                │
     │◄─────────────────────────────────│                                │
     │     mdreview.vercel.app/review/abc123                             │
     │                                   │                                │
     │  3. Share URL (Slack, email, etc) │                                │
     │───────────────────────────────────┼───────────────────────────────►│
     │                                   │                                │
     │                                   │  4. Open URL, view markdown    │
     │                                   │◄───────────────────────────────│
     │                                   │                                │
     │                                   │  5. Select text, add comment   │
     │                                   │◄───────────────────────────────│
     │                                   │                                │
     │                                   │  6. Click Approve/Reject       │
     │                                   │◄───────────────────────────────│
     │                                   │                                │
     │  7. Poll for status / notification │                               │
     │─────────────────────────────────►│                                │
     │                                   │                                │
     │  8. Export to YAML/clipboard      │                                │
     │─────────────────────────────────►│                                │
     │                                   │                                │
     │  9. Feed YAML to AI agent         │                                │
     ▼                                   ▼                                ▼
```

### 3.2 Programmatic Flow (Agent-Initiated)

```
AI Agent (Any MCP Client)               @mdreview/mcp              MDReview Web App           Human Reviewer
     │                                       │                            │                         │
     │  1. MCP: request_review(content)      │                            │                         │
     │─────────────────────────────────────►│                            │                         │
     │                                       │                            │                         │
     │                                       │  2. POST /api/reviews      │                         │
     │                                       │──────────────────────────►│                         │
     │                                       │                            │                         │
     │                                       │  3. Return review data     │                         │
     │                                       │◄──────────────────────────│                         │
     │                                       │                            │                         │
     │  4. Return { reviewId, url }          │                            │                         │
     │◄─────────────────────────────────────│                            │                         │
     │                                       │                            │                         │
     │  5. Print URL for human               │                            │                         │
     │     "Please review: mdreview.vercel.app/review/abc123"            │                         │
     │                                       │                            │                         │
     │  6. MCP: wait_for_review(reviewId)    │                            │                         │
     │     (long-poll, timeout 5 min)        │                            │                         │
     │─────────────────────────────────────►│                            │                         │
     │                                       │                            │                         │
     │                                       │  7. GET /api/reviews/:id/wait                        │
     │                                       │──────────────────────────►│                         │
     │                                       │                            │                         │
     │                                       │                            │  8. Human opens URL     │
     │                                       │                            │◄─────────────────────────│
     │                                       │                            │                         │
     │                                       │                            │  9. Human adds comments │
     │                                       │                            │◄─────────────────────────│
     │                                       │                            │                         │
     │                                       │                            │  10. Human clicks Approve│
     │                                       │                            │◄─────────────────────────│
     │                                       │                            │                         │
     │                                       │  11. Long-poll returns     │                         │
     │                                       │◄──────────────────────────│                         │
     │                                       │                            │                         │
     │  12. Return review result             │                            │                         │
     │◄─────────────────────────────────────│                            │                         │
     │     { status: "approved",             │                            │                         │
     │       comments: [...],                │                            │                         │
     │       message: "LGTM!" }              │                            │                         │
     │                                       │                            │                         │
     │  13. Agent processes feedback         │                            │                         │
     ▼                                       ▼                            ▼                         ▼
```

---

## 4. Data Model

### 4.1 Core Entities

```sql
-- Reviews: The main document being reviewed
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(12) UNIQUE NOT NULL,  -- Short URL identifier

    -- Document content
    content         TEXT NOT NULL,                -- Raw markdown
    title           VARCHAR(255),                 -- Optional title

    -- Review status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
                    -- pending | approved | changes_requested | rejected
    decision_message TEXT,                        -- Optional message on decision
    decided_at      TIMESTAMP,

    -- Metadata
    source          VARCHAR(20) NOT NULL DEFAULT 'manual',
                    -- manual | agent
    agent_id        VARCHAR(100),                 -- For agent-initiated reviews

    -- Timestamps
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP                     -- Optional auto-cleanup
);

-- Threads: A comment thread attached to a text range
CREATE TABLE threads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,

    -- Text selection (character offsets in rendered markdown)
    start_offset    INTEGER NOT NULL,
    end_offset      INTEGER NOT NULL,
    selected_text   TEXT NOT NULL,                -- The highlighted text

    -- Thread state
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMP,

    -- Timestamps
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Comments: Individual messages within a thread
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,

    -- Content
    body            TEXT NOT NULL,
    author_type     VARCHAR(20) NOT NULL DEFAULT 'human',
                    -- human | agent
    author_name     VARCHAR(100),                 -- Optional display name

    -- Timestamps
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_reviews_slug ON reviews(slug);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_threads_review_id ON threads(review_id);
CREATE INDEX idx_comments_thread_id ON comments(thread_id);
```

### 4.2 Entity Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Review    │ 1───n │   Thread    │ 1───n │   Comment   │
│             │       │             │       │             │
│ id          │       │ id          │       │ id          │
│ slug        │       │ review_id   │       │ thread_id   │
│ content     │       │ start_offset│       │ body        │
│ status      │       │ end_offset  │       │ author_type │
│ ...         │       │ resolved    │       │ author_name │
└─────────────┘       └─────────────┘       └─────────────┘
```

### 4.3 Review Status State Machine

```
                    ┌──────────────────────┐
                    │                      │
                    ▼                      │
              ┌─────────┐                  │
    CREATE───►│ PENDING │                  │ (can be reset
              └────┬────┘                  │  for re-review)
                   │                       │
       ┌───────────┼───────────┐           │
       ▼           ▼           ▼           │
┌──────────┐ ┌───────────┐ ┌─────────┐     │
│ APPROVED │ │ CHANGES   │ │ REJECTED│     │
│          │ │ REQUESTED │ │         │     │
└──────────┘ └─────┬─────┘ └─────────┘     │
                   │                       │
                   └───────────────────────┘
```

---

## 5. API Design

### 5.1 REST Endpoints

#### Create Review

```http
POST /api/reviews
Content-Type: application/json

{
  "content": "# My Document\n\nContent here...",
  "title": "HLD v1",           // optional
  "source": "agent",           // "manual" | "agent"
  "agentId": "claude-code-123" // optional, for agent tracking
}

Response 201:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "abc123xyz",
  "url": "https://mdreview.vercel.app/review/abc123xyz",
  "status": "pending",
  "createdAt": "2025-01-05T12:00:00Z"
}
```

#### Get Review

```http
GET /api/reviews/:id

Response 200:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "abc123xyz",
  "content": "# My Document\n\nContent here...",
  "title": "HLD v1",
  "status": "pending",         // pending | approved | changes_requested | rejected
  "decisionMessage": null,
  "decidedAt": null,
  "threads": [
    {
      "id": "thread-uuid",
      "startOffset": 10,
      "endOffset": 25,
      "selectedText": "My Document",
      "resolved": false,
      "comments": [
        {
          "id": "comment-uuid",
          "body": "Consider a more descriptive title",
          "authorType": "human",
          "authorName": "Reviewer",
          "createdAt": "2025-01-05T12:30:00Z"
        }
      ]
    }
  ],
  "createdAt": "2025-01-05T12:00:00Z",
  "updatedAt": "2025-01-05T12:30:00Z"
}
```

#### Wait for Review (Long-Polling)

```http
GET /api/reviews/:id/wait?timeout=300

Response 200 (when decision made):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "approved",
  "decisionMessage": "LGTM! Great design.",
  "decidedAt": "2025-01-05T13:00:00Z",
  "threads": [...],            // Full thread/comment data
  "summary": {                 // Computed summary
    "totalThreads": 3,
    "resolvedThreads": 2,
    "unresolvedThreads": 1,
    "totalComments": 8
  }
}

Response 408 (timeout, still pending):
{
  "status": "pending",
  "message": "Review still pending. Poll again."
}
```

#### Submit Review Decision

```http
POST /api/reviews/:id/submit
Content-Type: application/json

{
  "status": "approved",                    // approved | changes_requested | rejected
  "message": "Great work! Minor nits only." // optional
}

Response 200:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "approved",
  "decisionMessage": "Great work! Minor nits only.",
  "decidedAt": "2025-01-05T13:00:00Z"
}
```

#### Export Review

```http
GET /api/reviews/:id/export?format=yaml

Response 200 (format=yaml):
Content-Type: text/yaml

review:
  id: 550e8400-e29b-41d4-a716-446655440000
  title: HLD v1
  status: approved
  decisionMessage: "Great work!"
  decidedAt: "2025-01-05T13:00:00Z"

threads:
  - id: thread-1
    selectedText: "My Document"
    resolved: false
    comments:
      - body: "Consider a more descriptive title"
        authorType: human
        createdAt: "2025-01-05T12:30:00Z"
      - body: "Fixed in next iteration"
        authorType: agent
        createdAt: "2025-01-05T12:35:00Z"

Response 200 (format=json):
Content-Type: application/json
{ ... same structure as JSON ... }
```

#### Create Thread

```http
POST /api/reviews/:reviewId/threads
Content-Type: application/json

{
  "startOffset": 10,
  "endOffset": 25,
  "selectedText": "My Document",
  "body": "Consider a more descriptive title",
  "authorType": "human",
  "authorName": "Reviewer"
}

Response 201:
{
  "id": "thread-uuid",
  "reviewId": "review-uuid",
  "startOffset": 10,
  "endOffset": 25,
  "selectedText": "My Document",
  "resolved": false,
  "comments": [
    {
      "id": "comment-uuid",
      "body": "Consider a more descriptive title",
      "authorType": "human",
      "authorName": "Reviewer",
      "createdAt": "2025-01-05T12:30:00Z"
    }
  ]
}
```

#### Add Reply to Thread

```http
POST /api/threads/:threadId/replies
Content-Type: application/json

{
  "body": "Good point, I'll update the title.",
  "authorType": "agent",
  "authorName": "Claude"
}

Response 201:
{
  "id": "comment-uuid",
  "threadId": "thread-uuid",
  "body": "Good point, I'll update the title.",
  "authorType": "agent",
  "authorName": "Claude",
  "createdAt": "2025-01-05T12:35:00Z"
}
```

#### Resolve/Unresolve Thread

```http
PATCH /api/threads/:threadId
Content-Type: application/json

{
  "resolved": true
}

Response 200:
{
  "id": "thread-uuid",
  "resolved": true,
  "resolvedAt": "2025-01-05T12:40:00Z"
}
```

---

## 6. MCP Server Design

### 6.1 Overview

The MCP server (`@mdreview/mcp`) is a **standalone npm package** that:

- Works with **any MCP-compatible client** (Claude Code, Cursor, OpenCode, etc.)
- Acts as a **thin wrapper** around the web app's REST API
- Is **stateless** - all data lives in the web app's PostgreSQL database
- Requires only a base URL configuration to connect to the web app

### 6.2 Installation & Usage

```bash
# Run directly with npx
npx @mdreview/mcp

# Or install globally
npm install -g @mdreview/mcp
mdreview-mcp

# Or install locally in a project
npm install @mdreview/mcp
```

### 6.3 MCP Client Configuration

Example configuration for various MCP clients:

```json
// Claude Code / Cursor / OpenCode MCP config
{
  "mcpServers": {
    "mdreview": {
      "command": "npx",
      "args": ["@mdreview/mcp"],
      "env": {
        "MDREVIEW_BASE_URL": "https://mdreview.vercel.app"
      }
    }
  }
}
```

### 6.4 Tool: `request_review`

Creates a new review and returns the shareable URL.

```typescript
interface RequestReviewInput {
  content: string; // Markdown content to review
  title?: string; // Optional document title
}

interface RequestReviewOutput {
  reviewId: string;
  url: string;
  message: string; // Human-readable message for display
}

// Example usage in any MCP client:
// > request_review({ content: "# My HLD\n...", title: "Auth Redesign" })
// Returns: { reviewId: "abc123", url: "https://mdreview.vercel.app/review/abc123", message: "Review created. Share this link with reviewer: ..." }
```

### 6.5 Tool: `wait_for_review`

Long-polls until the review is complete or timeout.

```typescript
interface WaitForReviewInput {
  reviewId: string;
  timeoutSeconds?: number; // Default: 300 (5 min)
}

interface WaitForReviewOutput {
  status: "pending" | "approved" | "changes_requested" | "rejected";
  decisionMessage?: string;
  threads: Thread[];
  summary: {
    totalThreads: number;
    resolvedThreads: number;
    totalComments: number;
  };
}

// Example usage:
// > wait_for_review({ reviewId: "abc123" })
// Blocks until human reviews...
// Returns: { status: "approved", decisionMessage: "LGTM!", threads: [...] }
```

### 6.6 Tool: `get_review_status`

Non-blocking check of current status.

```typescript
interface GetReviewStatusInput {
  reviewId: string;
}

interface GetReviewStatusOutput {
  status: "pending" | "approved" | "changes_requested" | "rejected";
  decisionMessage?: string;
  threadCount: number;
  commentCount: number;
}
```

### 6.7 Tool: `add_comment`

Allows agents to reply to human comments.

```typescript
interface AddCommentInput {
  reviewId: string;
  threadId: string;
  body: string;
}

interface AddCommentOutput {
  commentId: string;
  createdAt: string;
}
```

### 6.8 MCP Server Implementation

```typescript
// packages/mcp/src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const BASE_URL = process.env.MDREVIEW_BASE_URL || "https://mdreview.vercel.app";

const server = new Server({
  name: "mdreview",
  version: "1.0.0",
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "request_review",
      description: "Create a markdown review and get shareable URL",
      inputSchema: {
        /* ... */
      },
    },
    {
      name: "wait_for_review",
      description: "Wait for human to complete review (long-poll)",
      inputSchema: {
        /* ... */
      },
    },
    // ...
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "request_review":
      // POST to BASE_URL/api/reviews
      return handleRequestReview(request.params.arguments);
    case "wait_for_review":
      // GET BASE_URL/api/reviews/:id/wait
      return handleWaitForReview(request.params.arguments);
    // ...
  }
});
```

---

## 7. UI Components

### 7.1 Key Pages

| Route           | Description  | Key Features                                                   |
| --------------- | ------------ | -------------------------------------------------------------- |
| `/`             | Landing page | Upload markdown, paste content, recent reviews (local storage) |
| `/review/:slug` | Review page  | Markdown viewer, comment sidebar, action buttons               |
| `/api/*`        | API routes   | REST endpoints for programmatic access                         |

### 7.2 Component Hierarchy

```
App
├── LandingPage
│   ├── MarkdownUploader
│   │   ├── FileDropzone
│   │   └── TextInput (paste mode)
│   └── RecentReviews (local storage)
│
└── ReviewPage
    ├── ReviewHeader
    │   ├── Title
    │   ├── StatusBadge
    │   └── ShareButton
    │
    ├── ReviewContent (split pane)
    │   ├── MarkdownViewer
    │   │   ├── HighlightedText (with thread markers)
    │   │   └── SelectionHandler (for creating threads)
    │   │
    │   └── CommentSidebar
    │       ├── ThreadList
    │       │   └── ThreadCard
    │       │       ├── SelectedTextPreview
    │       │       ├── CommentList
    │       │       │   └── CommentItem
    │       │       ├── ReplyInput
    │       │       └── ResolveButton
    │       └── NewThreadForm
    │
    └── ReviewActions
        ├── ApproveButton
        ├── RequestChangesButton
        ├── RejectButton
        ├── DecisionMessageInput
        └── ExportButton
            ├── CopyToClipboard
            └── DownloadYAML
```

### 7.3 Key UI Patterns

1. **Text Selection → Thread Creation**
   - User selects text in rendered markdown
   - Floating "Add Comment" button appears
   - Click opens new thread form

2. **Thread Markers**
   - Highlighted text spans show existing threads
   - Click highlight to scroll sidebar to thread
   - Click thread to scroll content to highlight

3. **Review Actions**
   - Sticky footer with approve/reject buttons
   - Optional message textarea on decision
   - Confirmation modal before submission

4. **Export Flow**
   - Click "Export" → Choose format (YAML/JSON)
   - Option: Copy to clipboard / Download file
   - Success toast with copy confirmation

---

## 8. Tech Stack

### 8.1 Monorepo Tooling

| Tool          | Purpose         | Why                                                  |
| ------------- | --------------- | ---------------------------------------------------- |
| **Turborepo** | Build system    | Fast incremental builds, caching, task orchestration |
| **pnpm**      | Package manager | Fast, efficient, native workspace support            |

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

```json
// package.json (root)
{
  "name": "mdreview",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### 8.2 Web App (apps/web)

| Layer            | Technology                  | Rationale                                   |
| ---------------- | --------------------------- | ------------------------------------------- |
| **Framework**    | Next.js 15 (App Router)     | Modern React, API routes, server components |
| **Language**     | TypeScript                  | Type safety, better DX                      |
| **Styling**      | Tailwind CSS + shadcn/ui    | Rapid development, accessible components    |
| **Database**     | PostgreSQL                  | Reliable, self-hostable, full-featured      |
| **ORM**          | Drizzle ORM                 | Type-safe, lightweight, great DX            |
| **Markdown**     | react-markdown + remark-gfm | Standard markdown rendering                 |
| **Highlighting** | Custom text selection API   | Browser Selection API                       |
| **Runtime**      | Node.js / Bun               | Both supported                              |

```json
// apps/web/package.json
{
  "name": "@mdreview/web",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "nanoid": "^5.0.0",
    "yaml": "^2.6.0",
    "tailwind-merge": "^2.5.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 8.3 MCP Server (packages/mcp)

```json
// packages/mcp/package.json
{
  "name": "@mdreview/mcp",
  "version": "1.0.0",
  "description": "MCP server for MDReview - markdown document review tool",
  "bin": {
    "mdreview-mcp": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  },
  "keywords": ["mcp", "markdown", "review", "ai", "claude"],
  "repository": {
    "type": "git",
    "url": "https://github.com/scottsus/mdreview"
  }
}
```

---

## 9. Deployment

### 9.1 Overview

| Component      | Deployment Target         | URL/Distribution                       |
| -------------- | ------------------------- | -------------------------------------- |
| **Web App**    | Vercel                    | `mdreview.vercel.app` (auto-generated) |
| **MCP Server** | npm registry              | `@mdreview/mcp`                        |
| **Database**   | Neon / Supabase / Railway | Managed PostgreSQL                     |

### 9.2 Web App Deployment (Vercel)

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
│                                                              │
│  URL: mdreview.vercel.app                                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Next.js Application                    │    │
│  │               (apps/web)                             │    │
│  │                                                      │    │
│  │   Edge Functions (API routes)                       │    │
│  │   Static Assets (auto-CDN)                          │    │
│  │   Server Components                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Neon / Supabase / Railway                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 PostgreSQL                           │    │
│  │                                                      │    │
│  │   Serverless (auto-scale to zero)                   │    │
│  │   Connection pooling (PgBouncer)                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Vercel Environment Variables:**

```bash
DATABASE_URL=postgres://user:pass@host:5432/mdreview
NEXT_PUBLIC_BASE_URL=https://mdreview.vercel.app
```

**Vercel Project Settings:**

```json
// vercel.json (in apps/web)
{
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@mdreview/web",
  "outputDirectory": ".next",
  "installCommand": "cd ../.. && pnpm install"
}
```

### 9.3 MCP Server Distribution (npm)

```bash
# Publishing workflow
cd packages/mcp
pnpm build
npm publish --access public
```

Users can then install/run:

```bash
# Run directly
npx @mdreview/mcp

# Or install globally
npm install -g @mdreview/mcp
mdreview-mcp
```

### 9.4 Self-Hosted (Docker)

For users who want to self-host the entire stack:

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/mdreview
      - NEXT_PUBLIC_BASE_URL=http://localhost:3000
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=mdreview
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres

volumes:
  postgres_data:
```

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm turbo
COPY . .
RUN pnpm install
RUN pnpm turbo build --filter=@mdreview/web

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

### 9.5 Database Migrations

```bash
# Development
pnpm --filter @mdreview/web drizzle-kit generate   # Generate SQL from schema
pnpm --filter @mdreview/web drizzle-kit push       # Apply to dev DB

# Production
pnpm --filter @mdreview/web drizzle-kit migrate    # Run migrations
```

---

## 10. Future Considerations

### 10.1 Intentionally Deferred (Post-MVP)

| Feature                     | Reason Deferred                 | Potential Timeline |
| --------------------------- | ------------------------------- | ------------------ |
| **Real-time collaboration** | Complexity (WebSocket, CRDT)    | v2 if needed       |
| **User accounts**           | Anonymous works for MVP         | v2 if demand       |
| **Diff view**               | Nice-to-have, not core          | v2                 |
| **Webhooks**                | Can poll for now                | v1.1               |
| **Multiple reviewers**      | Single reviewer is fine for MVP | v2                 |
| **Review templates**        | Adds complexity                 | v2                 |
| **Inline suggestions**      | Like GitHub PR suggestions      | v2                 |
| **Mobile app**              | Web-first, responsive is enough | v3                 |
| **Custom domain**           | Vercel auto-generated is fine   | v1.1               |

### 10.2 Technical Debt to Watch

1. **Long-polling** - Works for MVP, but WebSocket would be better for scale
2. **Text selection offsets** - May drift if markdown is modified; accept limitation for v1
3. **No rate limiting** - Add before public launch
4. **No analytics** - Add basic usage tracking if needed

### 10.3 Potential Integrations

- **Slack notifications** - Notify when review requested/completed
- **GitHub integration** - Create PRs from approved reviews
- **VS Code extension** - Review without leaving editor
- **OpenCode plugin** - Direct integration (original use case)

---

## 11. Success Criteria

### MVP Definition of Done

1. [ ] Human can upload markdown via web UI
2. [ ] Human can share URL with reviewer (no auth required)
3. [ ] Reviewer can add inline comments on text selections
4. [ ] Reviewer can reply to threads
5. [ ] Reviewer can resolve/unresolve threads
6. [ ] Reviewer can approve/reject/request-changes
7. [ ] Author can export comments to YAML/clipboard
8. [ ] Agent can create review via MCP tool (`npx @mdreview/mcp`)
9. [ ] Agent can long-poll for review completion
10. [ ] Agent can read final comments/decision
11. [ ] Web app deployable to Vercel (`mdreview.vercel.app`)
12. [ ] MCP server published to npm (`@mdreview/mcp`)
13. [ ] Self-hostable via Docker

### Performance Targets

- **Page load**: < 2s (including markdown render)
- **API response**: < 200ms (excluding long-poll)
- **Long-poll**: Up to 5 min timeout, check every 2s internally

---

## Appendix A: Glossary

| Term             | Definition                                              |
| ---------------- | ------------------------------------------------------- |
| **Review**       | A markdown document submitted for feedback              |
| **Thread**       | A comment conversation attached to a text selection     |
| **Comment**      | A single message within a thread                        |
| **Slug**         | Short unique identifier for URLs (e.g., "abc123xyz")    |
| **Decision**     | The final status: approved, changes_requested, rejected |
| **Long-polling** | HTTP request held open until data available or timeout  |
| **MCP**          | Model Context Protocol - standard for AI agent tools    |
| **Monorepo**     | Single repository containing multiple packages/apps     |
| **Turborepo**    | Build system for JavaScript/TypeScript monorepos        |

---

## 12. UI Enhancement: GitHub-Style Line-Based Commenting

**Author**: Apollo (Planner)
**Date**: 2025-01-06
**Status**: Planning Complete

### 12.1 Overview

This enhancement transforms MDReview's current text-range selection commenting system into a GitHub-style line-based commenting system, providing a more familiar and intuitive experience for developers accustomed to code review workflows.

### 12.2 Problem Statement

**Current State:**
- Comments are attached via character offsets (`startOffset`, `endOffset`)
- Users must select arbitrary text ranges to add comments
- Highlighting uses CSS Custom Highlights API with character-based Range objects
- No visible line numbers in the markdown viewer
- Comment creation happens inline in the sidebar

**Issues:**
1. Character offsets can drift if content changes
2. Text selection UX is clunky - hard to select exact ranges
3. No clear visual anchor for where comments are attached
4. Unfamiliar paradigm for developers used to GitHub PR reviews

### 12.3 Proposed Solution

Transform to a GitHub-style line-based system:

1. **Line-based data model**: Replace `startOffset/endOffset` with `startLine/endLine`
2. **Line numbers visible**: Show line numbers in a gutter alongside markdown content
3. **Hover "+" button**: Clicking a "+" that appears on hover opens the comment modal
4. **GitHub-style comment modal**: Modal with Write/Preview tabs and formatting toolbar

### 12.4 Key Design Decisions

#### 12.4.1 Line-Based Selection (Single-Line for v1)

For v1, we only support single-line comments. Multi-line range selection (shift-click or drag) is deferred to v2.

**Rationale:**
- Simpler implementation
- Covers 90%+ of use cases
- Multi-line adds significant complexity (drag gestures, shift-click state)

#### 12.4.2 Line Rendering Strategy

**Chosen approach: Split markdown by newlines, render each line**

The markdown content is split by `\n` and each line is rendered as a separate `ReactMarkdown` instance wrapped in a line container with:
- Line number gutter
- Hover detection for "+" button
- CSS class-based highlighting

**Trade-offs:**
- Pro: Full control over line structure
- Pro: Easy to attach click handlers to specific lines
- Con: Multiple small ReactMarkdown renders (mitigated with React.memo)
- Con: Multi-line markdown elements (code blocks, lists) need special handling

#### 12.4.3 Comment Modal vs Inline Form

**Chosen: Modal dialog (GitHub-style)**

- Modal with Write/Preview tabs
- Formatting toolbar (stubbed icons for v1)
- Cancel / Comment buttons
- Shows which line the comment is for

**Rationale:**
- More space for writing
- Preview functionality is important for markdown
- Matches user expectations from GitHub

#### 12.4.4 Highlighting Approach

**Chosen: CSS class-based highlighting on line elements**

Replace CSS Custom Highlights API with simpler CSS classes:
```css
.line-wrapper.has-comment {
  background-color: rgba(250, 204, 21, 0.15);
  border-left: 3px solid #facc15;
}
```

**Rationale:**
- Simpler and more reliable than Highlight API
- Works consistently across browsers
- Easy to add/remove with React state

### 12.5 Schema Migration

#### Current Schema (character offsets):
```sql
threads (
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  selected_text TEXT NOT NULL
)
```

#### New Schema (line numbers):
```sql
threads (
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  selected_text TEXT NOT NULL  -- Keep for sidebar display
)
```

**Migration strategy:** Since MDReview is not yet in production with real data, we can do a clean schema change. If there were existing data, we'd compute line numbers from offsets.

### 12.6 Component Architecture Changes

```
Before:
ReviewClient
├── MarkdownViewer (text selection → popup → sidebar form)
│   └── ReactMarkdown (single render)
│   └── CSS Custom Highlight API
└── CommentSidebar (inline thread creation form)

After:
ReviewClient
├── MarkdownViewer (line-based rendering)
│   └── LineWrapper[] (line number + content + hover button)
│       └── ReactMarkdown (per-line)
│   └── CSS class-based highlights
├── CommentModal (GitHub-style modal)
│   └── Tabs (Write/Preview)
│   └── FormattingToolbar (stubbed)
└── CommentSidebar (displays threads, no creation form)
```

### 12.7 New Dependencies

```bash
# Add shadcn/ui tabs component
npx shadcn@latest add tabs
```

No other external dependencies required. We'll use existing:
- Lucide icons for toolbar
- ReactMarkdown for preview
- Dialog from shadcn/ui

### 12.8 Scope

**In Scope (v1):**
- Line numbers visible in gutter
- Hover "+" button on line number
- GitHub-style comment modal with Write/Preview tabs
- Formatting toolbar (visual only, icons stubbed)
- Single-line comments only
- CSS class-based line highlighting
- Database schema change (startLine/endLine)
- API route updates

**Out of Scope (v2+):**
- Multi-line range selection (drag or shift-click)
- Functional formatting toolbar buttons
- Keyboard shortcuts
- Mobile-optimized touch interactions
- Code syntax highlighting in the modal preview

### 12.9 Success Criteria

- [ ] Markdown renders with visible line numbers
- [ ] Hover over line shows "+" button
- [ ] Click "+" opens GitHub-style modal
- [ ] Modal has Write/Preview tabs
- [ ] Modal has formatting toolbar (icons, non-functional)
- [ ] Comments attach to specific lines
- [ ] Lines with comments are highlighted
- [ ] Clicking thread in sidebar scrolls to line
- [ ] Clicking highlighted line opens thread in sidebar

---

**End of HLD**
