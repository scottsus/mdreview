# Research: Markdown Reviewer Next.js Migration

**Date**: 2025-01-05
**Status**: Complete
**Researcher**: Athena (Scout)

---

## Executive Summary

**Feasibility Verdict**: ✅ **Feasible with caveats**

Migrating from the inline Hono server to a separate Next.js application is technically feasible and offers clear benefits for UI/UX. However, the migration introduces complexity that may not justify the effort for the current use case.

**Recommended Approach**: **Option C (Hybrid)** - Local development with embedded server, optional cloud deployment later.

**Key Trade-off**: The current Hono implementation is simple, works well, and keeps everything in one process. Next.js provides a richer UI ecosystem but adds deployment complexity and state synchronization challenges.

---

## 1. Current Implementation Analysis

### Architecture (ss/md-reviewer branch)

```
┌─────────────────────────────────────────────────────────┐
│                    Openfleet Plugin                      │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │  Agent Tools    │    │     Hono Server (4242)      │ │
│  │  - request_review    │  - REST API endpoints       │ │
│  │  - get_status   │◄──►│  - HTML UI serving          │ │
│  │  - add_reply    │    │  - In-memory + file storage │ │
│  │  - resolve_comment   │                             │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│                                                          │
│  Storage: .openfleet/reviews/{reviewId}.json            │
│           .openfleet/reviews/{reviewId}_threads.json    │
└─────────────────────────────────────────────────────────┘
```

### Key Files

| File                           | Purpose                          | Lines |
| ------------------------------ | -------------------------------- | ----- |
| `src/review-server/index.ts`   | Hono server setup, port handling | ~100  |
| `src/review-server/routes.ts`  | REST API endpoints               | ~400  |
| `src/review-server/storage.ts` | File-based persistence           | ~90   |
| `src/review-server/types.ts`   | TypeScript interfaces            | ~90   |
| `src/review-server/ui/`        | HTML/CSS/JS (1124 lines JS)      | ~1200 |
| `src/tools/document-review/`   | Agent tools (4 files)            | ~250  |

### Current API Endpoints

| Method | Endpoint                                     | Purpose                 |
| ------ | -------------------------------------------- | ----------------------- |
| GET    | `/api/health`                                | Health check            |
| POST   | `/api/reviews`                               | Create review           |
| GET    | `/api/reviews/:id`                           | Get review details      |
| GET    | `/api/reviews/:id/document`                  | Get document content    |
| GET    | `/api/reviews/:id/threads`                   | List comment threads    |
| POST   | `/api/reviews/:id/threads`                   | Create thread           |
| PATCH  | `/api/reviews/:id/threads/:threadId`         | Update thread (resolve) |
| POST   | `/api/reviews/:id/threads/:threadId/replies` | Add reply               |
| POST   | `/api/reviews/:id/submit`                    | Submit review decision  |
| POST   | `/api/reviews/:id/resubmit`                  | Resubmit after changes  |
| GET    | `/review/:id`                                | Browser UI              |

### What Works Well

1. **Single process** - No coordination between plugin and server
2. **Direct filesystem access** - Server reads documents directly
3. **Simple state** - JSON files in `.openfleet/reviews/`
4. **Immediate availability** - Server starts with plugin

---

## 2. Architecture Options Analysis

### Option A: Next.js Runs Locally (Spawned by Plugin)

```
┌─────────────────────┐       ┌─────────────────────┐
│   Openfleet Plugin  │       │  Next.js App (3000) │
│   ┌─────────────┐   │  HTTP │  ┌───────────────┐  │
│   │ Agent Tools │◄──┼───────┼─►│  API Routes   │  │
│   └─────────────┘   │       │  └───────────────┘  │
│   ┌─────────────┐   │       │  ┌───────────────┐  │
│   │ Process Mgr │───┼─spawn─┼─►│  React UI     │  │
│   └─────────────┘   │       │  └───────────────┘  │
└─────────────────────┘       └─────────────────────┘
        │                              │
        └──────────┬───────────────────┘
                   ▼
         .openfleet/reviews/ (shared filesystem)
```

**Pros:**

- Full React ecosystem for rich UI
- Hot reload during development
- Familiar Next.js patterns
- Local - no internet required

**Cons:**

- Plugin must spawn/manage Next.js process
- Startup latency (~3-5s for Next.js dev server)
- Two processes to coordinate
- Port conflicts more likely
- Requires Node.js/Bun installed separately

**Complexity**: Medium-High

### Option B: Next.js Deployed to Cloud (Vercel)

```
┌─────────────────────┐       ┌─────────────────────┐
│   Openfleet Plugin  │       │  Vercel (cloud)     │
│   ┌─────────────┐   │ HTTPS │  ┌───────────────┐  │
│   │ Agent Tools │◄──┼───────┼─►│  API Routes   │  │
│   └─────────────┘   │       │  └───────────────┘  │
│   ┌─────────────┐   │       │  ┌───────────────┐  │
│   │ File Upload │───┼───────┼─►│  React UI     │  │
│   └─────────────┘   │       │  └───────────────┘  │
└─────────────────────┘       │  ┌───────────────┐  │
                              │  │  Database     │  │
                              │  └───────────────┘  │
                              └─────────────────────┘
```

**Pros:**

- Professional deployment, always available
- No local process management
- Sharable review URLs
- Multi-user capable

**Cons:**

- **No offline capability**
- Requires file upload (plugin → cloud)
- Authentication/authorization required
- Database needed (Vercel KV, Postgres, etc.)
- Privacy concerns (documents leave local machine)
- Latency for API calls

**Complexity**: High

### Option C: Hybrid (Recommended)

```
Development Mode:
┌─────────────────────┐       ┌─────────────────────┐
│   Openfleet Plugin  │       │  Next.js (local)    │
│   (embedded server) │ HTTP  │  or embedded        │
│   ┌─────────────┐   │◄─────►│  Hono equivalent    │
│   │ Agent Tools │   │       │                     │
│   └─────────────┘   │       │  Rich React UI      │
└─────────────────────┘       └─────────────────────┘

Production Mode (Optional):
┌─────────────────────┐       ┌─────────────────────┐
│   Openfleet Plugin  │ HTTPS │  Vercel (optional)  │
│   ┌─────────────┐   │◄─────►│  Same API           │
│   │ Agent Tools │   │       │  Persistent storage │
│   └─────────────┘   │       │                     │
└─────────────────────┘       └─────────────────────┘
```

**Approach:**

1. Keep Hono server for API (already works)
2. Build Next.js UI separately, served as static files OR
3. Embed Next.js standalone build into plugin
4. Optional: Deploy to cloud later for sharing

**Pros:**

- Incremental migration path
- Local-first, works offline
- Can add cloud deployment later
- Reuses existing API

**Cons:**

- Still need to build/bundle Next.js UI
- Two codebases to maintain

**Complexity**: Medium

---

## 3. API Design for Agent Programmatic Access

The current API is already well-designed. For a Next.js migration, keep the same endpoints:

### Proposed Next.js App Router Structure

```
app/
├── api/
│   ├── health/
│   │   └── route.ts              # GET /api/health
│   ├── reviews/
│   │   ├── route.ts              # GET (list), POST (create)
│   │   └── [reviewId]/
│   │       ├── route.ts          # GET review details
│   │       ├── document/
│   │       │   └── route.ts      # GET document content
│   │       ├── threads/
│   │       │   ├── route.ts      # GET (list), POST (create)
│   │       │   └── [threadId]/
│   │       │       ├── route.ts  # PATCH (resolve)
│   │       │       └── replies/
│   │       │           └── route.ts  # POST reply
│   │       ├── submit/
│   │       │   └── route.ts      # POST submit decision
│   │       └── resubmit/
│   │           └── route.ts      # POST resubmit
├── review/
│   └── [id]/
│       └── page.tsx              # Browser UI
└── page.tsx                      # Dashboard/landing
```

### Agent Operations Mapping

| Agent Operation           | HTTP Method | Endpoint                                     | Notes                             |
| ------------------------- | ----------- | -------------------------------------------- | --------------------------------- |
| Request review            | POST        | `/api/reviews`                               | Body: `{ documentPath, message }` |
| Poll status               | GET         | `/api/reviews/:id`                           | Returns status, round             |
| Read comments             | GET         | `/api/reviews/:id/threads`                   | All threads with replies          |
| Add reply                 | POST        | `/api/reviews/:id/threads/:threadId/replies` | Body: `{ body }`                  |
| Resolve comment           | PATCH       | `/api/reviews/:id/threads/:threadId`         | Body: `{ resolved: true }`        |
| Download with annotations | GET         | `/api/reviews/:id/export`                    | **NEW** - see below               |

### New Endpoint: Export with Annotations

```typescript
// GET /api/reviews/:id/export?format=markdown
// Returns document with inline comments as markdown annotations

interface ExportResponse {
  content: string; // Document with embedded comments
  format: "markdown" | "json";
  threads: CommentThread[]; // Full thread data
}

// Example output (markdown format):
`
# Document Title

Some content here.

> **[Comment by human on lines 5-7]**
> This section needs more detail.
> 
> **[Reply by agent]**
> Added clarification in the next revision.
> 
> ✅ Resolved

More content...
`;
```

---

## 4. Technical Considerations

### 4.1 State Management

**Source of Truth Options:**

| Option                   | Description                         | Pros                         | Cons                         |
| ------------------------ | ----------------------------------- | ---------------------------- | ---------------------------- |
| **Filesystem** (current) | JSON files in `.openfleet/reviews/` | Simple, works offline, no DB | No multi-user, no cloud sync |
| **SQLite** (local)       | Embedded database                   | Transactions, queries        | Still local only             |
| **Cloud DB**             | Vercel Postgres/KV                  | Multi-user, persistent       | Requires internet, cost      |
| **Hybrid**               | Local-first with optional sync      | Best of both                 | Complex sync logic           |

**Recommendation**: Keep filesystem for local mode. Add database only if cloud deployment is needed.

### 4.2 File Transfer (Plugin → Next.js)

**Challenge**: The plugin has filesystem access, but a remote Next.js app doesn't.

**Solutions:**

1. **Local mode**: Both share filesystem - no transfer needed
2. **Cloud mode**: Plugin uploads document content via API
   ```typescript
   // POST /api/reviews
   {
     "documentContent": "# Full markdown content...",
     "documentPath": "/Users/.../HLD.md", // For reference only
     "documentHash": "sha256:abc...",
     "message": "Please review this design"
   }
   ```

### 4.3 Authentication

**Local mode**: Not strictly required (localhost only), but good practice:

```typescript
// Simple token-based auth for localhost
const PLUGIN_TOKEN = crypto.randomUUID();

// Plugin passes token in header
fetch("/api/reviews", {
  headers: { "X-Plugin-Token": PLUGIN_TOKEN },
});
```

**Cloud mode**: Required. Options:

- API key per installation
- JWT tokens
- OAuth (overkill for single-user)

### 4.4 Real-time Updates

**For status polling**, the current approach works fine (agents poll periodically).

**For browser UI updates** (human sees new agent replies), options:

| Method    | Complexity | Support                        |
| --------- | ---------- | ------------------------------ |
| Polling   | Low        | Works everywhere               |
| SSE       | Medium     | Next.js supports via streaming |
| WebSocket | High       | Requires separate WS server    |

**Recommendation**: Start with polling, add SSE if UX demands it.

```typescript
// Next.js SSE route handler
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
      }, 1000);

      request.signal.addEventListener("abort", () => clearInterval(interval));
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

---

## 5. Local Development Experience

### Current (Hono - Simple)

```bash
# Start OpenCode - plugin automatically starts server
opencode
# Server available at http://localhost:4242
```

### Option A: Separate Next.js Dev Server

```bash
# Terminal 1: Start OpenCode
opencode

# Terminal 2: Start Next.js (manual)
cd md-reviewer-ui && bun dev
# Server at http://localhost:3000
```

**Friction**: Developer must start two processes.

### Option B: Plugin Spawns Next.js

```typescript
// Plugin spawns Next.js dev server
import { spawn } from "child_process";

const nextProcess = spawn("bun", ["run", "dev"], {
  cwd: path.join(__dirname, "ui"),
  stdio: "pipe",
});

// Wait for server ready
await waitForPort(3000);
```

**Friction**: Slow startup (~3-5s), process management complexity.

### Option C: Embedded Static Build (Recommended for Production)

```bash
# Build Next.js once
cd md-reviewer-ui && bun run build

# Plugin serves static files via Hono
app.get('/review/*', serveStatic({ root: './ui/out' }));
```

**Friction**: Need to rebuild after UI changes.

---

## 6. Recommended Architecture

Given the analysis, here's the recommended path:

### Phase 1: Keep Hono, Improve UI (Low Risk)

```
┌─────────────────────────────────────────────────────────┐
│                    Openfleet Plugin                      │
│  ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │ Agent Tools │◄──►│  Hono Server (existing)         │ │
│  └─────────────┘    │  - Same REST API                │ │
│                     │  - Serve React SPA (new)        │ │
│                     └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Changes:**

1. Keep Hono server and existing API
2. Replace vanilla JS UI with React (built as static SPA)
3. Hono serves the built React app
4. No separate process, no coordination issues

**Implementation:**

```
openfleet/
├── src/
│   ├── review-server/
│   │   ├── index.ts      # Hono server (keep)
│   │   ├── routes.ts     # API routes (keep)
│   │   └── static/       # Built React app (new)
│   └── ...
└── ui/                   # React app source (new)
    ├── src/
    ├── package.json
    └── vite.config.ts    # or next.config.js
```

### Phase 2: Extract to Standalone App (If Needed)

Only pursue if:

- Need cloud deployment for sharing
- Need multi-user support
- UI complexity justifies separate repo

```
openfleet/          # Plugin repo
md-reviewer-app/    # Separate Next.js repo
```

---

## 7. Risks and Mitigations

| Risk                                | Likelihood | Impact | Mitigation                                      |
| ----------------------------------- | ---------- | ------ | ----------------------------------------------- |
| Complexity doesn't justify benefits | High       | Medium | Start with Phase 1 (Hono + React SPA)           |
| Port conflicts                      | Medium     | Low    | Dynamic port selection (already implemented)    |
| Startup latency with Next.js        | Medium     | Medium | Use static build, not dev server                |
| State sync issues (if separated)    | High       | High   | Keep single source of truth (filesystem)        |
| Breaking existing API               | Low        | High   | Keep same endpoints, add new ones incrementally |

---

## 8. Open Questions for User

1. **UI Richness vs Simplicity**: Is the current vanilla JS UI insufficient? What specific features need React?

2. **Cloud Deployment**: Is shareable review URLs a requirement? (Changes architecture significantly)

3. **Multi-user**: Will multiple humans review the same document? (Requires real-time sync)

4. **Offline-first**: How important is working without internet? (Affects cloud options)

5. **Timeline**: Is this a "nice to have" or blocking current work?

---

## 9. Recommendation Summary

| Approach                       | Effort   | Benefit    | When to Choose              |
| ------------------------------ | -------- | ---------- | --------------------------- |
| **Keep Hono + vanilla JS**     | None     | Stable     | Works fine as-is            |
| **Hono + React SPA** (Phase 1) | 2-3 days | Better UI  | Need richer interactions    |
| **Separate Next.js (local)**   | 1 week   | Full React | UI is primary product       |
| **Cloud Next.js**              | 2+ weeks | Sharing    | Need collaboration features |

**My recommendation**: Start with **Hono + React SPA** (Phase 1). This gives 80% of the benefits with 20% of the complexity. Migrate to full Next.js only if cloud deployment becomes a requirement.

---

## Appendix: Implementation Sketch (Phase 1)

```typescript
// src/review-server/index.ts (modified)
import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

// Existing API routes
setupApiRoutes(app);

// Serve React SPA for review pages
app.use(
  "/review/*",
  serveStatic({
    root: "./dist/ui",
    rewriteRequestPath: () => "/index.html", // SPA fallback
  }),
);

// Static assets
app.use("/assets/*", serveStatic({ root: "./dist/ui" }));
```

```json
// ui/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build --outDir ../src/review-server/dist/ui"
  }
}
```

This approach:

- Keeps the working Hono API
- Adds React for better UI
- No separate process
- No cloud dependency
- Can evolve to full Next.js later if needed

---

## 10. Commercial Markdown Review/Collaboration Tools Analysis

**Research Date**: 2025-01-05
**Purpose**: Understand existing SaaS solutions for markdown review and collaboration

### 10.1 HackMD (Commercial SaaS)

**Website**: https://hackmd.io
**Pricing**: https://hackmd.io/pricing

#### Pricing Tiers

| Plan | Price | Users | Key Features |
|------|-------|-------|--------------|
| **Free** | $0 | Up to 3 teammates | Unlimited notes, 3 invitees, 3 custom templates, suggest edit, GitHub integration (20 pushes/month), 1MB image uploads |
| **Prime** | $5/seat/month (annual) | Unlimited | Full-text search, 20MB images, PDF export, unlimited invites/versions/GitHub pushes, 20K API calls/month |
| **Team+** | $16.67/seat/month (annual) | Unlimited | Unlimited workspaces, private workspaces, custom user groups, SAML SSO, custom domain |
| **Enterprise** | Custom | Custom | Role-based access control, SSO (SAML/LDAP), custom domain, custom homepage, GitLab integration, dedicated account manager |

#### Key Features for Review/Collaboration

✅ **Inline commenting**: Yes - page and in-line commenting
✅ **Suggest edit**: Yes (Free tier and above)
✅ **Real-time collaboration**: Yes
✅ **Shareable links**: Yes - customize permalink to your note
✅ **API access**: Yes - 2,000 calls/month (Free), 20,000 calls/month (Prime)
✅ **Export formats**: PDF (Prime+), Markdown
✅ **GitHub integration**: Yes - push to GitHub (20/month Free, unlimited Prime+)
✅ **Self-hosted option**: Yes - CodiMD/HedgeDoc (see below)
❌ **Structured review workflow**: No formal approve/reject flow
❌ **Export to YAML/JSON**: Not documented

#### API Capabilities

- **Documented**: Limited public API documentation
- **Endpoints**: Note CRUD, team management, permissions
- **Rate limits**: 2K-20K calls/month depending on tier
- **Authentication**: API tokens

#### Strengths

- Mature product with 1M+ users
- Strong GitHub integration
- Real-time collaboration works well
- Free tier is generous

#### Weaknesses

- No formal review workflow (approve/reject/request changes)
- API documentation is sparse
- Commenting is basic (not threaded discussions)
- No structured export of comments to YAML/JSON

---

### 10.2 HedgeDoc (Open Source, Self-Hosted)

**Website**: https://hedgedoc.org
**GitHub**: https://github.com/hedgedoc/hedgedoc
**License**: AGPL-3.0

#### Overview

- **Formerly**: CodiMD (renamed in 2020)
- **Based on**: HackMD open source codebase
- **Status**: HedgeDoc 1.x stable, HedgeDoc 2.x in development (complete rewrite)
- **Deployment**: Self-hosted only (Docker, manual)

#### Pricing

| Plan | Price | Notes |
|------|-------|-------|
| **Self-hosted** | Free (AGPL) | Full features, you manage infrastructure |

#### Key Features

✅ **Real-time collaboration**: Yes
✅ **Markdown support**: Full CommonMark + extensions
✅ **Presentation mode**: Yes (reveal.js)
✅ **Graphs & diagrams**: Mermaid, PlantUML, etc.
✅ **Revisions**: Track changes, revert to older versions
✅ **Permission system**: Simple dropdown (view/edit/owner)
✅ **Self-hosted**: Complete control over data
✅ **Low resource requirements**: Runs on Raspberry Pi
❌ **Inline commenting**: Basic (not as rich as HackMD commercial)
❌ **API**: Limited (primarily for integrations)
❌ **Structured review workflow**: No
❌ **Export to structured formats**: Markdown, HTML, PDF only

#### Deployment Options

```bash
# Docker (recommended)
docker run -d -p 3000:3000 quay.io/hedgedoc/hedgedoc:latest

# Manual installation
git clone https://github.com/hedgedoc/hedgedoc.git
cd hedgedoc
npm install
npm start
```

#### Strengths

- Free and open source
- Complete data ownership
- Active community
- Low system requirements
- Works offline

#### Weaknesses

- No formal review workflow
- Limited API for programmatic access
- Commenting is basic
- No structured export of review data
- Requires self-hosting (infrastructure overhead)

---

### 10.3 GitBook

**Website**: https://www.gitbook.com
**Pricing**: https://www.gitbook.com/pricing

#### Pricing Tiers

| Plan | Price | Key Features |
|------|-------|--------------|
| **Free** | $0/site | 1 free user, unlimited page views, basic forms, basic sites, Git Sync |
| **Premium** | $65/site + $12/user/month (annual) | Custom domain, branded docs, AI-powered instant answers, site insights, user feedback |
| **Ultimate** | $249/site + $12/user/month (annual) | Sections & groups, search across all docs, authenticated access, custom fonts, adaptive content, AI Assistant |
| **Enterprise** | Custom | SAML SSO, white-glove migration, custom integrations, 1:1 support, user training, custom contract |

#### Key Features for Review/Collaboration

✅ **Commenting**: Yes - inline commenting
✅ **Change requests**: Yes - propose changes workflow
✅ **Merge rules**: Yes (Business tier)
✅ **Review & approve edits**: Yes (Business tier)
✅ **Real-time collaboration**: Yes (Plus tier and above)
✅ **Git Sync**: Yes - GitHub/GitLab integration
✅ **Version history**: Yes
✅ **Shareable links**: Yes - private share links (Plus+)
✅ **API**: Yes - public API available
✅ **Export**: PDF export (Plus+)
❌ **Self-hosted**: No
❌ **Export to YAML/JSON**: Not documented

#### API Capabilities

- **Documented**: Yes - https://developer.gitbook.com
- **Endpoints**: Spaces, content, users, integrations
- **Authentication**: API tokens, OAuth
- **Rate limits**: Varies by plan

#### Strengths

- Professional documentation platform
- Strong review workflow (change requests, approvals)
- Excellent Git integration
- AI-powered features (search, instant answers)
- Beautiful UI/UX

#### Weaknesses

- Expensive ($65/site minimum)
- No self-hosted option
- Focused on documentation, not general markdown collaboration
- Requires internet connection

---

### 10.4 Notion

**Website**: https://www.notion.so
**Pricing**: https://www.notion.so/pricing

#### Pricing Tiers

| Plan | Price | Key Features |
|------|-------|--------------|
| **Free** | $0 | Unlimited pages for individuals, limited blocks for teams, basic forms, basic sites |
| **Plus** | $10/user/month (annual) | Unlimited blocks, unlimited file uploads, unlimited charts, custom forms, custom sites, basic integrations |
| **Business** | $20/user/month (annual) | SAML SSO, granular database permissions, verify pages, private teamspaces, conditional forms, premium integrations |
| **Enterprise** | Custom | User provisioning (SCIM), advanced security & controls, audit log, customer success manager, DLP/SIEM integrations |

#### Markdown Support

⚠️ **Partial**: Notion uses its own block-based format, not pure markdown
- Can import markdown files
- Can export to markdown
- Inline editing is block-based, not raw markdown

#### Key Features for Review/Collaboration

✅ **Commenting**: Yes - inline comments on any block
✅ **Real-time collaboration**: Yes (Plus tier and above)
✅ **Version history**: 7 days (Free), 30 days (Plus), 90 days (Business), unlimited (Enterprise)
✅ **Shareable links**: Yes - public and private
✅ **API**: Yes - comprehensive API
✅ **Export**: Markdown, HTML, PDF
❌ **Pure markdown editing**: No (block-based)
❌ **Formal review workflow**: No approve/reject flow
❌ **Self-hosted**: No
❌ **Export comments to structured format**: Not documented

#### API Capabilities

- **Documented**: Yes - https://developers.notion.com
- **Endpoints**: Pages, databases, blocks, users, comments
- **Authentication**: OAuth 2.0, internal integrations
- **Rate limits**: 3 requests/second

#### Strengths

- Excellent collaboration features
- Rich API
- Beautiful UI
- Flexible content organization
- Strong commenting system

#### Weaknesses

- Not pure markdown (block-based format)
- No formal review workflow
- Expensive for teams
- Requires internet connection
- No self-hosted option

---

### 10.5 Other Tools (Brief Overview)

#### Dropbox Paper

**Website**: https://www.dropbox.com/paper
**Pricing**: Included with Dropbox plans ($0-$20/user/month)

- ✅ Real-time collaboration
- ✅ Commenting
- ⚠️ Limited markdown support (WYSIWYG editor)
- ❌ No API for comments
- ❌ No formal review workflow

#### Slite

**Website**: https://slite.com
**Pricing**: $8-$15/user/month

- ✅ Team knowledge base
- ✅ Commenting
- ⚠️ Limited markdown (WYSIWYG)
- ❌ No formal review workflow
- ❌ Limited API

#### Coda

**Website**: https://coda.io
**Pricing**: $0-$30/user/month

- ✅ Collaborative docs
- ✅ Commenting
- ⚠️ Not markdown-focused (block-based)
- ❌ No formal review workflow

#### Outline

**Website**: https://www.getoutline.com
**Pricing**: Self-hosted (open source) or $10/user/month (cloud)

- ✅ Markdown support
- ✅ Real-time collaboration
- ✅ Commenting
- ✅ Self-hosted option
- ❌ No formal review workflow
- ❌ Limited API for comments

---

### 10.6 Dedicated Markdown Review Tools

**Finding**: No dedicated SaaS product exists specifically for markdown review workflows (like GitHub PR reviews but for markdown documents).

**Closest alternatives**:

1. **GitHub Pull Requests** - Best for code review, works for markdown
   - ✅ Inline comments
   - ✅ Approve/reject workflow
   - ✅ Threaded discussions
   - ✅ API access
   - ❌ Requires Git workflow
   - ❌ Not optimized for document review

2. **Google Docs** - Best for document review, not markdown
   - ✅ Inline comments
   - ✅ Suggest mode
   - ✅ Approve/reject changes
   - ❌ Not markdown
   - ❌ No API for comments

---

### 10.7 Comparison Matrix

| Feature | HackMD | HedgeDoc | GitBook | Notion | Our Tool |
|---------|--------|----------|---------|--------|----------|
| **Pricing** | $0-$16.67/user | Free (self-host) | $65/site + $12/user | $0-$20/user | Free |
| **Inline commenting** | ✅ | ⚠️ Basic | ✅ | ✅ | ✅ |
| **Formal review workflow** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Shareable links (no auth)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **API access** | ✅ Limited | ⚠️ Basic | ✅ | ✅ | ✅ |
| **Export to YAML/JSON** | ❌ | ❌ | ❌ | ❌ | ✅ Planned |
| **Self-hosted** | ✅ (HedgeDoc) | ✅ | ❌ | ❌ | ✅ |
| **Pure markdown** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Offline capable** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Agent-friendly API** | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ |

---

### 10.8 Key Insights

1. **No direct competitor** exists for markdown review with formal approve/reject workflow
2. **HackMD/HedgeDoc** are closest for markdown collaboration, but lack review workflow
3. **GitBook** has the best review workflow, but is expensive and documentation-focused
4. **Notion** has great collaboration, but not pure markdown
5. **Self-hosted options** are limited (HedgeDoc, Outline)
6. **API access** varies widely - most tools don't expose comments via API
7. **Structured export** (YAML/JSON) is not a standard feature

### 10.9 Competitive Advantages of Our Tool

Based on this research, our markdown reviewer has unique value:

1. ✅ **Formal review workflow** (approve/reject/request changes) - rare in markdown tools
2. ✅ **Agent-first API** - designed for programmatic access, not just humans
3. ✅ **Structured export** - comments as YAML/JSON for automation
4. ✅ **Self-hosted & offline** - no cloud dependency
5. ✅ **Pure markdown** - not block-based or WYSIWYG
6. ✅ **Free & open source** - no per-user pricing
7. ✅ **Embedded in workflow** - part of OpenFleet, not separate tool

### 10.10 Recommendations Based on Market Research

1. **Keep the current architecture** - No commercial tool offers our exact feature set
2. **Focus on agent API** - This is our unique differentiator
3. **Add structured export** - YAML/JSON export of comments (no competitor has this)
4. **Consider HedgeDoc UI patterns** - They've solved real-time markdown collaboration
5. **Don't over-engineer** - Simple Hono + React SPA is sufficient
6. **Future: Cloud deployment** - Optional, not required (unlike competitors)

---

## 11. Final Recommendation (Updated)

After researching commercial tools, the recommendation remains:

**Phase 1: Hono + React SPA** (2-3 days effort)

**Rationale**:
- No commercial tool offers our exact feature set (formal review + agent API + structured export)
- Current Hono architecture is sound
- React SPA gives UI improvements without complexity
- Can add cloud deployment later if needed (but not required)

**Unique features to emphasize**:
1. Agent-friendly API (programmatic review workflow)
2. Structured export (YAML/JSON) for automation
3. Offline-first, self-hosted
4. Embedded in development workflow (not separate tool)

**Next steps**:
1. Improve current UI with React (keep Hono backend)
2. Add structured export endpoint (`/api/reviews/:id/export?format=yaml`)
3. Document agent API clearly
4. Consider HedgeDoc's real-time collaboration patterns if needed

---

**Research completed**: 2025-01-05
**Researcher**: Athena (Librarian mode)
