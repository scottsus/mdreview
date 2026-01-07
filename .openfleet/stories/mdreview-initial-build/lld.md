# MDReview - Low-Level Design

**Author**: Apollo (Planner)
**Date**: 2025-01-06
**Status**: Draft
**Story**: md-reviewer-nextjs-migration
**HLD Reference**: [hld.md](./hld.md)

---

## Table of Contents

1. [Repository Setup](#1-repository-setup)
2. [File Structure](#2-file-structure)
3. [Database Schema](#3-database-schema)
4. [Implementation Phases](#4-implementation-phases)
5. [API Route Implementations](#5-api-route-implementations)
6. [Key Components](#6-key-components)
7. [MCP Server Implementation](#7-mcp-server-implementation)
8. [Environment Variables](#8-environment-variables)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Repository Setup

### 1.1 Create Monorepo Structure

```bash
# Navigate to workspace (sibling to openfleet)
cd ~/workspace

# Create project directory
mkdir mdreview && cd mdreview

# Initialize git
git init

# Create directory structure
mkdir -p apps/web packages/mcp packages/typescript-config

# Initialize pnpm
pnpm init
```

### 1.2 Root package.json

```json
{
  "name": "mdreview",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "db:generate": "turbo run db:generate --filter=@mdreview/web",
    "db:push": "turbo run db:push --filter=@mdreview/web",
    "db:studio": "turbo run db:studio --filter=@mdreview/web"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20"
  }
}
```

### 1.3 pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 1.4 turbo.json

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 1.5 TypeScript Configs

**packages/typescript-config/package.json**:

```json
{
  "name": "@mdreview/typescript-config",
  "version": "0.0.0",
  "private": true,
  "files": ["*.json"]
}
```

**packages/typescript-config/base.json**:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "incremental": false,
    "isolatedModules": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "NodeNext",
    "moduleDetection": "force",
    "moduleResolution": "NodeNext",
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  }
}
```

**packages/typescript-config/nextjs.json**:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "jsx": "preserve",
    "noEmit": true
  }
}
```

**packages/typescript-config/node-library.json**:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### 1.6 Create Next.js App

```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd web

# Update package.json name
# Change "name": "web" to "name": "@mdreview/web"
```

**apps/web/package.json** (updated):

```json
{
  "name": "@mdreview/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.5",
    "nanoid": "^5.0.9",
    "zod": "^3.24.0",
    "yaml": "^2.6.1",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.468.0",
    "sonner": "^1.7.1"
  },
  "devDependencies": {
    "@mdreview/typescript-config": "workspace:*",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "drizzle-kit": "^0.30.0",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.0"
  }
}
```

**apps/web/tsconfig.json**:

```json
{
  "extends": "@mdreview/typescript-config/nextjs.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 1.7 Initialize shadcn/ui

```bash
cd apps/web
pnpm dlx shadcn@latest init

# Select options:
# - Style: New York
# - Base color: Zinc
# - CSS variables: Yes
```

**apps/web/components.json** (generated):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Install required shadcn components**:

```bash
pnpm dlx shadcn@latest add button card dialog dropdown-menu textarea badge scroll-area separator avatar tooltip
```

### 1.8 Create MCP Package

```bash
cd packages/mcp
pnpm init
```

**packages/mcp/package.json**:

```json
{
  "name": "@mdreview/mcp",
  "version": "0.1.0",
  "description": "MCP server for MDReview - markdown document review tool",
  "type": "module",
  "bin": {
    "mdreview-mcp": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc && chmod +x dist/index.js",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@mdreview/typescript-config": "workspace:*",
    "@types/node": "^22.10.0",
    "typescript": "^5.7.0"
  },
  "keywords": ["mcp", "markdown", "review", "ai", "claude", "cursor", "opencode"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/scottsus/mdreview"
  }
}
```

**packages/mcp/tsconfig.json**:

```json
{
  "extends": "@mdreview/typescript-config/node-library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.9 Install All Dependencies

```bash
# From root
cd ~/workspace/mdreview
pnpm install
```

### 1.10 Git Setup

**.gitignore** (root):

```gitignore
# Dependencies
node_modules
.pnpm-store

# Build outputs
dist
.next
out

# Environment
.env
.env.local
.env.*.local

# IDE
.idea
.vscode
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Turbo
.turbo

# Drizzle
drizzle/*.sql
```

---

## 2. File Structure

```
mdreview/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── .gitignore
├── README.md
│
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── components.json
│       ├── drizzle.config.ts
│       │
│       ├── drizzle/                    # Generated migrations
│       │   └── *.sql
│       │
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx            # Landing page
│           │   ├── globals.css
│           │   │
│           │   ├── review/
│           │   │   └── [slug]/
│           │   │       └── page.tsx    # Review page
│           │   │
│           │   └── api/
│           │       ├── reviews/
│           │       │   ├── route.ts              # POST /api/reviews
│           │       │   └── [id]/
│           │       │       ├── route.ts          # GET /api/reviews/:id
│           │       │       ├── wait/
│           │       │       │   └── route.ts      # GET /api/reviews/:id/wait
│           │       │       ├── submit/
│           │       │       │   └── route.ts      # POST /api/reviews/:id/submit
│           │       │       ├── export/
│           │       │       │   └── route.ts      # GET /api/reviews/:id/export
│           │       │       └── threads/
│           │       │           └── route.ts      # POST /api/reviews/:id/threads
│           │       │
│           │       └── threads/
│           │           └── [threadId]/
│           │               ├── route.ts          # PATCH /api/threads/:id
│           │               └── replies/
│           │                   └── route.ts      # POST /api/threads/:id/replies
│           │
│           ├── components/
│           │   ├── ui/                           # shadcn components
│           │   │   ├── button.tsx
│           │   │   ├── card.tsx
│           │   │   ├── dialog.tsx
│           │   │   └── ...
│           │   │
│           │   ├── landing/
│           │   │   ├── markdown-uploader.tsx
│           │   │   └── recent-reviews.tsx
│           │   │
│           │   └── review/
│           │       ├── review-header.tsx
│           │       ├── markdown-viewer.tsx
│           │       ├── selection-handler.tsx
│           │       ├── comment-sidebar.tsx
│           │       ├── thread-card.tsx
│           │       ├── comment-item.tsx
│           │       ├── review-actions.tsx
│           │       └── export-dialog.tsx
│           │
│           ├── db/
│           │   ├── index.ts                      # DB client singleton
│           │   └── schema.ts                     # Drizzle schema
│           │
│           ├── lib/
│           │   ├── utils.ts                      # shadcn cn() utility
│           │   ├── api.ts                        # API response helpers
│           │   └── slug.ts                       # Slug generation
│           │
│           └── types/
│               └── index.ts                      # Shared TypeScript types
│
└── packages/
    ├── mcp/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts                          # MCP server entry
    │       ├── tools/
    │       │   ├── request-review.ts
    │       │   ├── wait-for-review.ts
    │       │   ├── get-review-status.ts
    │       │   └── add-comment.ts
    │       └── api-client.ts                     # REST API client
    │
    └── typescript-config/
        ├── package.json
        ├── base.json
        ├── nextjs.json
        └── node-library.json
```

---

## 3. Database Schema

### 3.1 Drizzle Config

**apps/web/drizzle.config.ts**:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 3.2 Database Client

**apps/web/src/db/index.ts**:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
```

### 3.3 Schema Definition

**apps/web/src/db/schema.ts**:

```typescript
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 12 }).unique().notNull(),
    content: text("content").notNull(),
    title: varchar("title", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    decisionMessage: text("decision_message"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    agentId: varchar("agent_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("reviews_slug_idx").on(table.slug),
    index("reviews_status_idx").on(table.status),
    index("reviews_created_at_idx").on(table.createdAt),
  ],
);

export const reviewsRelations = relations(reviews, ({ many }) => ({
  threads: many(threads),
}));

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    selectedText: text("selected_text").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("threads_review_id_idx").on(table.reviewId),
    index("threads_created_at_idx").on(table.createdAt),
  ],
);

export const threadsRelations = relations(threads, ({ one, many }) => ({
  review: one(reviews, {
    fields: [threads.reviewId],
    references: [reviews.id],
  }),
  comments: many(comments),
}));

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorType: varchar("author_type", { length: 20 }).notNull().default("human"),
    authorName: varchar("author_name", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("comments_thread_id_idx").on(table.threadId),
    index("comments_created_at_idx").on(table.createdAt),
  ],
);

export const commentsRelations = relations(comments, ({ one }) => ({
  thread: one(threads, {
    fields: [comments.threadId],
    references: [threads.id],
  }),
}));

// Type exports for use in application
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// Status type
export type ReviewStatus = "pending" | "approved" | "changes_requested" | "rejected";
```

### 3.4 Migration Commands

```bash
# Generate migration from schema
cd apps/web
pnpm db:generate

# Push schema to database (dev only)
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

---

## 4. Implementation Phases

### Phase 1: Repository Setup + Database (Day 1)

**Goal**: Working monorepo with database connection

**Steps**:

1. Create directory structure per Section 1
2. Set up all config files (package.json, turbo.json, tsconfigs)
3. Install dependencies with `pnpm install`
4. Create Neon/Supabase PostgreSQL database
5. Set up `DATABASE_URL` in `.env.local`
6. Create Drizzle schema
7. Run `pnpm db:push` to create tables

**Verification**:

```bash
# Should compile without errors
pnpm typecheck

# Should start dev server
pnpm dev

# Should show tables
pnpm db:studio
```

---

### Phase 2: Core API Routes (Day 1-2)

**Goal**: Working REST API for reviews

**Steps**:

1. Create API helpers (`lib/api.ts`, `lib/slug.ts`)
2. Implement `POST /api/reviews` - create review
3. Implement `GET /api/reviews/:id` - get review with threads/comments
4. Test with curl

**Verification**:

```bash
# Create review
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"content": "# Test\n\nHello world", "title": "Test Review"}'

# Get review
curl http://localhost:3000/api/reviews/{id}
```

---

### Phase 3: Basic UI (Day 2-3)

**Goal**: Landing page and review page skeleton

**Steps**:

1. Create landing page with markdown upload
2. Create review page layout (header, content area, sidebar)
3. Implement `MarkdownViewer` component
4. Add basic navigation between pages

**Verification**:

- Can upload markdown and see review URL
- Can navigate to review page and see rendered markdown

---

### Phase 4: Inline Commenting (Day 3-4)

**Goal**: Text selection and comment creation

**Steps**:

1. Implement `SelectionHandler` for text selection
2. Create `POST /api/reviews/:id/threads` endpoint
3. Create `POST /api/threads/:id/replies` endpoint
4. Implement `CommentSidebar` with thread list
5. Implement `ThreadCard` and `CommentItem` components
6. Add highlight restoration on page load

**Verification**:

- Can select text and see "Add Comment" button
- Can create thread with initial comment
- Can reply to threads
- Highlights persist on page refresh

---

### Phase 5: Review Workflow (Day 4-5)

**Goal**: Approve/reject flow and export

**Steps**:

1. Create `POST /api/reviews/:id/submit` endpoint
2. Create `PATCH /api/threads/:id` endpoint (resolve)
3. Create `GET /api/reviews/:id/export` endpoint
4. Implement `ReviewActions` component (approve/reject buttons)
5. Implement `ExportDialog` with YAML/JSON/clipboard options

**Verification**:

- Can approve/reject review with message
- Can resolve/unresolve threads
- Can export comments as YAML

---

### Phase 6: MCP Server (Day 5-6)

**Goal**: Working MCP server published to npm

**Steps**:

1. Implement `ApiClient` for REST calls
2. Implement `request_review` tool
3. Implement `wait_for_review` tool
4. Implement `get_review_status` tool
5. Implement `add_comment` tool
6. Test locally with Claude Code

**Verification**:

```bash
# Build MCP server
cd packages/mcp && pnpm build

# Test in Claude Code config
{
  "mcpServers": {
    "mdreview": {
      "command": "node",
      "args": ["/path/to/mdreview/packages/mcp/dist/index.js"],
      "env": {
        "MDREVIEW_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

---

### Phase 7: Polish + Deployment (Day 6-7)

**Goal**: Production-ready deployment

**Steps**:

1. Add loading states and error handling
2. Add toast notifications
3. Deploy web app to Vercel
4. Provision production database
5. Run migrations on production
6. Publish MCP server to npm
7. Update README with usage instructions

**Verification**:

- App works on Vercel URL
- `npx @mdreview/mcp` works

---

## 5. API Route Implementations

### 5.1 Shared Types

**apps/web/src/types/index.ts**:

```typescript
import { z } from "zod";

// Request schemas
export const createReviewSchema = z.object({
  content: z.string().min(1, "Content is required"),
  title: z.string().max(255).optional(),
  source: z.enum(["manual", "agent"]).default("manual"),
  agentId: z.string().max(100).optional(),
});

export const submitReviewSchema = z.object({
  status: z.enum(["approved", "changes_requested", "rejected"]),
  message: z.string().optional(),
});

export const createThreadSchema = z.object({
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
  selectedText: z.string().min(1),
  body: z.string().min(1),
  authorType: z.enum(["human", "agent"]).default("human"),
  authorName: z.string().max(100).optional(),
});

export const updateThreadSchema = z.object({
  resolved: z.boolean(),
});

export const createReplySchema = z.object({
  body: z.string().min(1),
  authorType: z.enum(["human", "agent"]).default("human"),
  authorName: z.string().max(100).optional(),
});

export const exportFormatSchema = z.enum(["yaml", "json"]).default("yaml");

// Response types
export interface ReviewResponse {
  id: string;
  slug: string;
  url: string;
  content: string;
  title: string | null;
  status: string;
  decisionMessage: string | null;
  decidedAt: string | null;
  source: string;
  threads: ThreadResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ThreadResponse {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  resolved: boolean;
  resolvedAt: string | null;
  comments: CommentResponse[];
  createdAt: string;
}

export interface CommentResponse {
  id: string;
  body: string;
  authorType: string;
  authorName: string | null;
  createdAt: string;
}

export interface ApiError {
  error: string;
  message: string;
  issues?: z.ZodIssue[];
}
```

### 5.2 API Helpers

**apps/web/src/lib/api.ts**:

```typescript
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: string, message: string, status: number, issues?: unknown[]) {
  return NextResponse.json({ error, message, issues }, { status });
}

export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    return errorResponse("validation_error", "Invalid request data", 400, error.errors);
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return errorResponse("internal_server_error", message, 500);
}
```

**apps/web/src/lib/slug.ts**:

```typescript
import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 10);

export function generateSlug(): string {
  return nanoid();
}
```

### 5.3 POST /api/reviews

**apps/web/src/app/api/reviews/route.ts**:

```typescript
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { handleApiError, successResponse } from "@/lib/api";
import { generateSlug } from "@/lib/slug";
import { createReviewSchema } from "@/types";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createReviewSchema.parse(body);

    const slug = generateSlug();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const [review] = await db
      .insert(reviews)
      .values({
        slug,
        content: data.content,
        title: data.title,
        source: data.source,
        agentId: data.agentId,
      })
      .returning();

    return successResponse(
      {
        id: review.id,
        slug: review.slug,
        url: `${baseUrl}/review/${review.slug}`,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 5.4 GET /api/reviews/[id]

**apps/web/src/app/api/reviews/[id]/route.ts**:

```typescript
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, id),
      with: {
        threads: {
          with: {
            comments: {
              orderBy: (comments, { asc }) => [asc(comments.createdAt)],
            },
          },
          orderBy: (threads, { asc }) => [asc(threads.createdAt)],
        },
      },
    });

    if (!review) {
      return errorResponse("not_found", "Review not found", 404);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    return successResponse({
      id: review.id,
      slug: review.slug,
      url: `${baseUrl}/review/${review.slug}`,
      content: review.content,
      title: review.title,
      status: review.status,
      decisionMessage: review.decisionMessage,
      decidedAt: review.decidedAt?.toISOString() ?? null,
      source: review.source,
      threads: review.threads.map((thread) => ({
        id: thread.id,
        startOffset: thread.startOffset,
        endOffset: thread.endOffset,
        selectedText: thread.selectedText,
        resolved: thread.resolved,
        resolvedAt: thread.resolvedAt?.toISOString() ?? null,
        comments: thread.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          authorType: comment.authorType,
          authorName: comment.authorName,
          createdAt: comment.createdAt.toISOString(),
        })),
        createdAt: thread.createdAt.toISOString(),
      })),
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 5.5 GET /api/reviews/[id]/wait (Long-Polling)

**apps/web/src/app/api/reviews/[id]/wait/route.ts**:

```typescript
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

const DEFAULT_TIMEOUT = 300; // 5 minutes
const POLL_INTERVAL = 2000; // 2 seconds

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const timeout = Math.min(
      parseInt(searchParams.get("timeout") || String(DEFAULT_TIMEOUT)),
      DEFAULT_TIMEOUT,
    );

    const startTime = Date.now();
    const timeoutMs = timeout * 1000;

    while (Date.now() - startTime < timeoutMs) {
      // Check if client disconnected
      if (request.signal.aborted) {
        return errorResponse("aborted", "Request aborted by client", 499);
      }

      const review = await db.query.reviews.findFirst({
        where: eq(reviews.id, id),
        with: {
          threads: {
            with: {
              comments: true,
            },
          },
        },
      });

      if (!review) {
        return errorResponse("not_found", "Review not found", 404);
      }

      // If review is decided, return immediately
      if (review.status !== "pending") {
        const totalThreads = review.threads.length;
        const resolvedThreads = review.threads.filter((t) => t.resolved).length;
        const totalComments = review.threads.reduce((sum, t) => sum + t.comments.length, 0);

        return successResponse({
          id: review.id,
          status: review.status,
          decisionMessage: review.decisionMessage,
          decidedAt: review.decidedAt?.toISOString() ?? null,
          threads: review.threads.map((thread) => ({
            id: thread.id,
            startOffset: thread.startOffset,
            endOffset: thread.endOffset,
            selectedText: thread.selectedText,
            resolved: thread.resolved,
            comments: thread.comments.map((c) => ({
              id: c.id,
              body: c.body,
              authorType: c.authorType,
              authorName: c.authorName,
              createdAt: c.createdAt.toISOString(),
            })),
          })),
          summary: {
            totalThreads,
            resolvedThreads,
            unresolvedThreads: totalThreads - resolvedThreads,
            totalComments,
          },
        });
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    // Timeout reached
    return successResponse(
      {
        status: "pending",
        message: "Review still pending. Poll again.",
      },
      408,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// Increase timeout for this route
export const maxDuration = 300; // 5 minutes (Vercel Pro)
```

### 5.6 POST /api/reviews/[id]/submit

**apps/web/src/app/api/reviews/[id]/submit/route.ts**:

```typescript
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { submitReviewSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = submitReviewSchema.parse(body);

    const [review] = await db
      .update(reviews)
      .set({
        status: data.status,
        decisionMessage: data.message,
        decidedAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning();

    if (!review) {
      return errorResponse("not_found", "Review not found", 404);
    }

    return successResponse({
      id: review.id,
      status: review.status,
      decisionMessage: review.decisionMessage,
      decidedAt: review.decidedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 5.7 GET /api/reviews/[id]/export

**apps/web/src/app/api/reviews/[id]/export/route.ts**:

```typescript
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { errorResponse, handleApiError } from "@/lib/api";
import { exportFormatSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import YAML from "yaml";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = exportFormatSchema.parse(searchParams.get("format") || "yaml");

    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, id),
      with: {
        threads: {
          with: {
            comments: {
              orderBy: (comments, { asc }) => [asc(comments.createdAt)],
            },
          },
          orderBy: (threads, { asc }) => [asc(threads.createdAt)],
        },
      },
    });

    if (!review) {
      return errorResponse("not_found", "Review not found", 404);
    }

    const exportData = {
      review: {
        id: review.id,
        title: review.title,
        status: review.status,
        decisionMessage: review.decisionMessage,
        decidedAt: review.decidedAt?.toISOString() ?? null,
      },
      threads: review.threads.map((thread) => ({
        id: thread.id,
        selectedText: thread.selectedText,
        resolved: thread.resolved,
        comments: thread.comments.map((comment) => ({
          body: comment.body,
          authorType: comment.authorType,
          authorName: comment.authorName,
          createdAt: comment.createdAt.toISOString(),
        })),
      })),
    };

    if (format === "yaml") {
      return new NextResponse(YAML.stringify(exportData), {
        headers: {
          "Content-Type": "text/yaml",
          "Content-Disposition": `attachment; filename="review-${review.slug}.yaml"`,
        },
      });
    }

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="review-${review.slug}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 5.8 POST /api/reviews/[id]/threads

**apps/web/src/app/api/reviews/[id]/threads/route.ts**:

```typescript
import { db } from "@/db";
import { comments, reviews, threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { createThreadSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reviewId } = await params;
    const body = await request.json();
    const data = createThreadSchema.parse(body);

    // Verify review exists
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      return errorResponse("not_found", "Review not found", 404);
    }

    // Create thread and initial comment in transaction
    const result = await db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(threads)
        .values({
          reviewId,
          startOffset: data.startOffset,
          endOffset: data.endOffset,
          selectedText: data.selectedText,
        })
        .returning();

      const [comment] = await tx
        .insert(comments)
        .values({
          threadId: thread.id,
          body: data.body,
          authorType: data.authorType,
          authorName: data.authorName,
        })
        .returning();

      return { thread, comment };
    });

    return successResponse(
      {
        id: result.thread.id,
        reviewId: result.thread.reviewId,
        startOffset: result.thread.startOffset,
        endOffset: result.thread.endOffset,
        selectedText: result.thread.selectedText,
        resolved: result.thread.resolved,
        comments: [
          {
            id: result.comment.id,
            body: result.comment.body,
            authorType: result.comment.authorType,
            authorName: result.comment.authorName,
            createdAt: result.comment.createdAt.toISOString(),
          },
        ],
        createdAt: result.thread.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 5.9 PATCH /api/threads/[threadId]

**apps/web/src/app/api/threads/[threadId]/route.ts**:

```typescript
import { db } from "@/db";
import { threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { updateThreadSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const body = await request.json();
    const data = updateThreadSchema.parse(body);

    const [thread] = await db
      .update(threads)
      .set({
        resolved: data.resolved,
        resolvedAt: data.resolved ? new Date() : null,
      })
      .where(eq(threads.id, threadId))
      .returning();

    if (!thread) {
      return errorResponse("not_found", "Thread not found", 404);
    }

    return successResponse({
      id: thread.id,
      resolved: thread.resolved,
      resolvedAt: thread.resolvedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 5.10 POST /api/threads/[threadId]/replies

**apps/web/src/app/api/threads/[threadId]/replies/route.ts**:

```typescript
import { db } from "@/db";
import { comments, threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { createReplySchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const body = await request.json();
    const data = createReplySchema.parse(body);

    // Verify thread exists
    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, threadId),
    });

    if (!thread) {
      return errorResponse("not_found", "Thread not found", 404);
    }

    const [comment] = await db
      .insert(comments)
      .values({
        threadId,
        body: data.body,
        authorType: data.authorType,
        authorName: data.authorName,
      })
      .returning();

    return successResponse(
      {
        id: comment.id,
        threadId: comment.threadId,
        body: comment.body,
        authorType: comment.authorType,
        authorName: comment.authorName,
        createdAt: comment.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 6. Key Components

### 6.1 MarkdownViewer

**apps/web/src/components/review/markdown-viewer.tsx**:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { ThreadResponse } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  threads: ThreadResponse[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onSelectionComplete: (selection: TextSelection) => void;
}

export interface TextSelection {
  startOffset: number;
  endOffset: number;
  selectedText: string;
  rect: DOMRect;
}

export function MarkdownViewer({
  content,
  threads,
  activeThreadId,
  onThreadClick,
  onSelectionComplete,
}: MarkdownViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const text = range.toString().trim();

    if (text.length > 0 && contentRef.current?.contains(range.commonAncestorContainer)) {
      // Calculate offset relative to content container
      const preRange = document.createRange();
      preRange.selectNodeContents(contentRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = preRange.toString().length;

      setSelection({
        startOffset,
        endOffset: startOffset + text.length,
        selectedText: text,
        rect: range.getBoundingClientRect(),
      });
    } else {
      setSelection(null);
    }
  }, []);

  // Clear selection when clicking elsewhere
  const handleMouseDown = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".selection-popup")) {
      setSelection(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [handleMouseUp, handleMouseDown]);

  // Restore highlights using CSS Custom Highlights API
  useEffect(() => {
    if (!contentRef.current || threads.length === 0) return;
    if (!("Highlight" in window)) return; // Fallback for older browsers

    const ranges: Range[] = [];

    threads.forEach((thread) => {
      const range = createRangeFromOffsets(
        contentRef.current!,
        thread.startOffset,
        thread.endOffset,
      );
      if (range) ranges.push(range);
    });

    if (ranges.length > 0) {
      const highlight = new Highlight(...ranges);
      CSS.highlights.set("comment-threads", highlight);
    }

    return () => {
      CSS.highlights.delete("comment-threads");
    };
  }, [threads]);

  const handleAddComment = useCallback(() => {
    if (selection) {
      onSelectionComplete(selection);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, onSelectionComplete]);

  return (
    <div className="relative">
      <div ref={contentRef} className="prose prose-zinc dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>

      {/* Selection popup */}
      {selection && (
        <div
          className="selection-popup fixed z-50 bg-background border rounded-lg shadow-lg p-1"
          style={{
            left: selection.rect.left + selection.rect.width / 2,
            top: selection.rect.bottom + 8,
            transform: "translateX(-50%)",
          }}
        >
          <button
            onClick={handleAddComment}
            className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add Comment
          </button>
        </div>
      )}

      {/* CSS for highlights */}
      <style jsx global>{`
        ::highlight(comment-threads) {
          background-color: rgba(250, 204, 21, 0.3);
        }
      `}</style>
    </div>
  );
}

function createRangeFromOffsets(container: HTMLElement, start: number, end: number): Range | null {
  const range = document.createRange();
  let charCount = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;

  function traverse(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;

      if (!startNode && charCount + textLength >= start) {
        startNode = node;
        startOffset = start - charCount;
      }

      if (startNode && charCount + textLength >= end) {
        endNode = node;
        endOffset = end - charCount;
        return true;
      }

      charCount += textLength;
    } else {
      for (const child of Array.from(node.childNodes)) {
        if (traverse(child)) return true;
      }
    }
    return false;
  }

  traverse(container);

  if (startNode && endNode) {
    try {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    } catch {
      return null;
    }
  }

  return null;
}
```

### 6.2 CommentSidebar

**apps/web/src/components/review/comment-sidebar.tsx**:

```tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThreadResponse } from "@/types";
import { useState } from "react";

import { TextSelection } from "./markdown-viewer";
import { ThreadCard } from "./thread-card";

interface CommentSidebarProps {
  reviewId: string;
  threads: ThreadResponse[];
  activeThreadId: string | null;
  pendingSelection: TextSelection | null;
  onThreadClick: (threadId: string) => void;
  onThreadCreated: (thread: ThreadResponse) => void;
  onThreadUpdated: (thread: Partial<ThreadResponse> & { id: string }) => void;
  onCancelSelection: () => void;
}

export function CommentSidebar({
  reviewId,
  threads,
  activeThreadId,
  pendingSelection,
  onThreadClick,
  onThreadCreated,
  onThreadUpdated,
  onCancelSelection,
}: CommentSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCommentBody, setNewCommentBody] = useState("");

  const handleCreateThread = async () => {
    if (!pendingSelection || !newCommentBody.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startOffset: pendingSelection.startOffset,
          endOffset: pendingSelection.endOffset,
          selectedText: pendingSelection.selectedText,
          body: newCommentBody.trim(),
          authorType: "human",
        }),
      });

      if (response.ok) {
        const thread = await response.json();
        onThreadCreated(thread);
        setNewCommentBody("");
        onCancelSelection();
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col border-l">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Comments</h2>
        <p className="text-sm text-muted-foreground">
          {threads.length} thread{threads.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* New thread form */}
          {pendingSelection && (
            <div className="border rounded-lg p-3 bg-muted/50">
              <p className="text-sm font-medium mb-2">New comment on:</p>
              <p className="text-sm text-muted-foreground italic mb-3 line-clamp-2">
                "{pendingSelection.selectedText}"
              </p>
              <textarea
                value={newCommentBody}
                onChange={(e) => setNewCommentBody(e.target.value)}
                placeholder="Write your comment..."
                className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateThread}
                  disabled={isCreating || !newCommentBody.trim()}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Comment"}
                </button>
                <button
                  onClick={onCancelSelection}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {pendingSelection && threads.length > 0 && <Separator />}

          {/* Existing threads */}
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => onThreadClick(thread.id)}
              onReply={async (body) => {
                const response = await fetch(`/api/threads/${thread.id}/replies`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ body, authorType: "human" }),
                });
                if (response.ok) {
                  const comment = await response.json();
                  onThreadUpdated({
                    id: thread.id,
                    comments: [...thread.comments, comment],
                  });
                }
              }}
              onResolve={async () => {
                const response = await fetch(`/api/threads/${thread.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ resolved: !thread.resolved }),
                });
                if (response.ok) {
                  const updated = await response.json();
                  onThreadUpdated({
                    id: thread.id,
                    resolved: updated.resolved,
                    resolvedAt: updated.resolvedAt,
                  });
                }
              }}
            />
          ))}

          {threads.length === 0 && !pendingSelection && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Select text to add a comment
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

### 6.3 ThreadCard

**apps/web/src/components/review/thread-card.tsx**:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { CommentResponse, ThreadResponse } from "@/types";
import { Check, Reply } from "lucide-react";
import { useState } from "react";

import { CommentItem } from "./comment-item";

interface ThreadCardProps {
  thread: ThreadResponse;
  isActive: boolean;
  onClick: () => void;
  onReply: (body: string) => Promise<void>;
  onResolve: () => Promise<void>;
}

export function ThreadCard({ thread, isActive, onClick, onReply, onResolve }: ThreadCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyBody.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(replyBody.trim());
      setReplyBody("");
      setIsReplying(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden cursor-pointer transition-colors",
        isActive && "ring-2 ring-primary",
        thread.resolved && "opacity-60",
      )}
      onClick={onClick}
    >
      {/* Selected text preview */}
      <div className="px-3 py-2 bg-muted/50 border-b">
        <p className="text-xs text-muted-foreground line-clamp-2 italic">"{thread.selectedText}"</p>
      </div>

      {/* Comments */}
      <div className="divide-y">
        {thread.comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {/* Reply form */}
      {isReplying && (
        <div className="p-3 border-t bg-muted/30">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            className="w-full min-h-[60px] p-2 text-sm border rounded-md resize-none"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSubmitReply();
              }}
              disabled={isSubmitting || !replyBody.trim()}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Reply"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsReplying(false);
                setReplyBody("");
              }}
              className="px-2 py-1 text-xs border rounded hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsReplying(true);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Reply className="h-3 w-3" />
          Reply
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResolve();
          }}
          className={cn(
            "flex items-center gap-1 text-xs",
            thread.resolved ? "text-green-600" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Check className="h-3 w-3" />
          {thread.resolved ? "Resolved" : "Resolve"}
        </button>
      </div>
    </div>
  );
}
```

### 6.4 ReviewActions

**apps/web/src/components/review/review-actions.tsx**:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, Download, X } from "lucide-react";
import { useState } from "react";

interface ReviewActionsProps {
  reviewId: string;
  status: string;
  onStatusChange: (status: string, message: string | null) => void;
  onExport: (format: "yaml" | "json") => void;
}

type ActionType = "approved" | "changes_requested" | "rejected" | null;

export function ReviewActions({ reviewId, status, onStatusChange, onExport }: ReviewActionsProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedAction,
          message: message.trim() || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onStatusChange(result.status, result.decisionMessage);
        setSelectedAction(null);
        setMessage("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = status === "pending";

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport("yaml")}>
              <Download className="h-4 w-4 mr-1" />
              Export YAML
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport("json")}>
              <Download className="h-4 w-4 mr-1" />
              Export JSON
            </Button>
          </div>

          {isPending && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAction("changes_requested")}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Request Changes
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setSelectedAction("rejected")}>
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button variant="default" size="sm" onClick={() => setSelectedAction("approved")}>
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          )}

          {!isPending && (
            <div className="text-sm text-muted-foreground">Review {status.replace("_", " ")}</div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === "approved" && "Approve Review"}
              {selectedAction === "changes_requested" && "Request Changes"}
              {selectedAction === "rejected" && "Reject Review"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium">Message (optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message for the author..."
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              variant={selectedAction === "rejected" ? "destructive" : "default"}
            >
              {isSubmitting ? "Submitting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 7. MCP Server Implementation

### 7.1 API Client

**packages/mcp/src/api-client.ts**:

```typescript
const BASE_URL = process.env.MDREVIEW_BASE_URL || "https://mdreview.vercel.app";

interface CreateReviewResponse {
  id: string;
  slug: string;
  url: string;
  status: string;
  createdAt: string;
}

interface ReviewResponse {
  id: string;
  slug: string;
  url: string;
  content: string;
  title: string | null;
  status: string;
  decisionMessage: string | null;
  decidedAt: string | null;
  threads: ThreadResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ThreadResponse {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  resolved: boolean;
  comments: CommentResponse[];
}

interface CommentResponse {
  id: string;
  body: string;
  authorType: string;
  authorName: string | null;
  createdAt: string;
}

interface WaitResponse {
  id: string;
  status: string;
  decisionMessage: string | null;
  decidedAt: string | null;
  threads: ThreadResponse[];
  summary: {
    totalThreads: number;
    resolvedThreads: number;
    unresolvedThreads: number;
    totalComments: number;
  };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BASE_URL;
  }

  async createReview(content: string, title?: string): Promise<CreateReviewResponse> {
    const response = await fetch(`${this.baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        title,
        source: "agent",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create review");
    }

    return response.json();
  }

  async getReview(reviewId: string): Promise<ReviewResponse> {
    const response = await fetch(`${this.baseUrl}/api/reviews/${reviewId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get review");
    }

    return response.json();
  }

  async waitForReview(reviewId: string, timeoutSeconds = 300): Promise<WaitResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/reviews/${reviewId}/wait?timeout=${timeoutSeconds}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to wait for review");
    }

    return response.json();
  }

  async addComment(threadId: string, body: string): Promise<CommentResponse> {
    const response = await fetch(`${this.baseUrl}/api/threads/${threadId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        authorType: "agent",
        authorName: "AI Agent",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add comment");
    }

    return response.json();
  }
}
```

### 7.2 MCP Server Entry Point

**packages/mcp/src/index.ts**:

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { ApiClient } from "./api-client.js";

const server = new McpServer({
  name: "mdreview",
  version: "0.1.0",
});

const apiClient = new ApiClient(process.env.MDREVIEW_BASE_URL);

// Tool: request_review
server.registerTool(
  "request_review",
  {
    title: "Request Review",
    description:
      "Create a markdown document review and get a shareable URL. Share this URL with the reviewer and they can add inline comments and approve/reject the document.",
    inputSchema: {
      content: z.string().describe("The markdown content to review"),
      title: z.string().optional().describe("Optional title for the review"),
    },
  },
  async ({ content, title }) => {
    const result = await apiClient.createReview(content, title);

    return {
      content: [
        {
          type: "text",
          text: `Review created successfully!\n\nReview URL: ${result.url}\n\nShare this URL with your reviewer. They can:\n- Add inline comments by selecting text\n- Approve, reject, or request changes\n\nUse 'wait_for_review' with reviewId "${result.id}" to wait for the review to complete.`,
        },
      ],
      structuredContent: {
        reviewId: result.id,
        url: result.url,
        status: result.status,
      },
    };
  },
);

// Tool: wait_for_review
server.registerTool(
  "wait_for_review",
  {
    title: "Wait for Review",
    description:
      "Wait for a review to be completed (approved, rejected, or changes requested). This will block until the reviewer makes a decision or the timeout is reached.",
    inputSchema: {
      reviewId: z.string().describe("The review ID to wait for"),
      timeoutSeconds: z
        .number()
        .min(1)
        .max(300)
        .default(300)
        .describe("Maximum time to wait in seconds (default: 300)"),
    },
  },
  async ({ reviewId, timeoutSeconds }) => {
    const result = await apiClient.waitForReview(reviewId, timeoutSeconds);

    if (result.status === "pending") {
      return {
        content: [
          {
            type: "text",
            text: `Review is still pending after ${timeoutSeconds} seconds. You can call wait_for_review again to continue waiting.`,
          },
        ],
        structuredContent: { status: "pending", timedOut: true },
      };
    }

    const commentsText = result.threads
      .map((thread) => {
        const comments = thread.comments.map((c) => `  - ${c.authorType}: ${c.body}`).join("\n");
        return `[${thread.resolved ? "RESOLVED" : "UNRESOLVED"}] "${thread.selectedText}"\n${comments}`;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Review completed!\n\nStatus: ${result.status.toUpperCase()}\nMessage: ${result.decisionMessage || "(none)"}\n\nSummary:\n- Total threads: ${result.summary.totalThreads}\n- Resolved: ${result.summary.resolvedThreads}\n- Unresolved: ${result.summary.unresolvedThreads}\n- Total comments: ${result.summary.totalComments}\n\n${commentsText ? `Comments:\n${commentsText}` : "No comments."}`,
        },
      ],
      structuredContent: result,
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

    return {
      content: [
        {
          type: "text",
          text: `Review Status: ${result.status.toUpperCase()}\nTitle: ${result.title || "(untitled)"}\nThreads: ${result.threads.length}\nURL: ${result.url}`,
        },
      ],
      structuredContent: {
        status: result.status,
        threadCount: result.threads.length,
        commentCount: result.threads.reduce((sum, t) => sum + t.comments.length, 0),
      },
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
          type: "text",
          text: `Comment added successfully!\n\nThread: ${result.threadId}\nComment: ${result.body}`,
        },
      ],
      structuredContent: {
        commentId: result.id,
        createdAt: result.createdAt,
      },
    };
  },
);

// Main entry point
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MDReview MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

---

## 8. Environment Variables

### 8.1 Development (.env.local)

**apps/web/.env.local**:

```bash
# Database (Neon/Supabase connection string)
DATABASE_URL="postgresql://user:password@host:5432/mdreview?sslmode=require"

# Public base URL (used for generating review URLs)
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 8.2 Production (Vercel)

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable               | Value                         | Environment |
| ---------------------- | ----------------------------- | ----------- |
| `DATABASE_URL`         | `postgresql://...`            | Production  |
| `NEXT_PUBLIC_BASE_URL` | `https://mdreview.vercel.app` | Production  |

### 8.3 MCP Server

The MCP server reads one environment variable:

```bash
# Set in MCP client config (claude_desktop_config.json, etc.)
MDREVIEW_BASE_URL="https://mdreview.vercel.app"
```

Default: `https://mdreview.vercel.app`

---

## 9. Testing Strategy

### 9.1 API Testing with curl

**Create review**:

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Test Document\n\nThis is a test review.\n\n## Section 1\n\nSome content here.",
    "title": "Test Review"
  }'
```

**Get review**:

```bash
curl http://localhost:3000/api/reviews/{id}
```

**Create thread**:

```bash
curl -X POST http://localhost:3000/api/reviews/{id}/threads \
  -H "Content-Type: application/json" \
  -d '{
    "startOffset": 0,
    "endOffset": 14,
    "selectedText": "Test Document",
    "body": "Consider a more descriptive title",
    "authorType": "human"
  }'
```

**Add reply**:

```bash
curl -X POST http://localhost:3000/api/threads/{threadId}/replies \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Good point, I will update this",
    "authorType": "agent",
    "authorName": "Claude"
  }'
```

**Resolve thread**:

```bash
curl -X PATCH http://localhost:3000/api/threads/{threadId} \
  -H "Content-Type: application/json" \
  -d '{"resolved": true}'
```

**Submit review**:

```bash
curl -X POST http://localhost:3000/api/reviews/{id}/submit \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "message": "LGTM!"
  }'
```

**Export review**:

```bash
# YAML
curl "http://localhost:3000/api/reviews/{id}/export?format=yaml"

# JSON
curl "http://localhost:3000/api/reviews/{id}/export?format=json"
```

**Long-poll wait**:

```bash
curl "http://localhost:3000/api/reviews/{id}/wait?timeout=30"
```

### 9.2 MCP Testing

**Local testing**:

```bash
# Build MCP server
cd packages/mcp && pnpm build

# Add to Claude Code config (~/.config/claude/claude_desktop_config.json)
{
  "mcpServers": {
    "mdreview": {
      "command": "node",
      "args": ["/absolute/path/to/mdreview/packages/mcp/dist/index.js"],
      "env": {
        "MDREVIEW_BASE_URL": "http://localhost:3000"
      }
    }
  }
}

# Restart Claude Code, then test:
# > Use the request_review tool to create a review for this markdown...
```

### 9.3 UI Testing Checklist

- [ ] Can upload markdown on landing page
- [ ] Review URL is generated and displayed
- [ ] Can navigate to review page
- [ ] Markdown renders correctly with syntax highlighting
- [ ] Can select text and see "Add Comment" button
- [ ] Can create thread with initial comment
- [ ] Thread appears in sidebar
- [ ] Highlight appears over selected text
- [ ] Can reply to thread
- [ ] Can resolve/unresolve thread
- [ ] Can approve/reject review with message
- [ ] Status updates after submission
- [ ] Can export to YAML/JSON
- [ ] Review URL works after page refresh
- [ ] Highlights restore on page load

---

## 10. Deployment Checklist

### 10.1 Database Setup (Neon)

1. Create account at https://neon.tech
2. Create new project: "mdreview"
3. Copy connection string
4. Add to `.env.local` and Vercel

```bash
# Run migrations
cd apps/web
DATABASE_URL="postgresql://..." pnpm db:push
```

### 10.2 Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Configure:
   - Framework: Next.js
   - Root Directory: `apps/web`
   - Build Command: `cd ../.. && pnpm turbo build --filter=@mdreview/web`
   - Install Command: `cd ../.. && pnpm install`
4. Add environment variables:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_BASE_URL` = `https://mdreview.vercel.app`
5. Deploy

**apps/web/vercel.json** (optional):

```json
{
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@mdreview/web",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "nextjs"
}
```

### 10.3 MCP Package Publishing

```bash
cd packages/mcp

# Build
pnpm build

# Login to npm
npm login

# Publish (first time)
npm publish --access public

# Publish updates
npm version patch  # or minor/major
npm publish
```

**After publishing**:

```bash
# Users can run directly
npx @mdreview/mcp

# Or configure in MCP client
{
  "mcpServers": {
    "mdreview": {
      "command": "npx",
      "args": ["-y", "@mdreview/mcp"]
    }
  }
}
```

### 10.4 Post-Deployment Verification

- [ ] Visit https://mdreview.vercel.app - landing page loads
- [ ] Create a review - URL generated
- [ ] Open review URL - content displays
- [ ] Add inline comment - works
- [ ] Approve review - status updates
- [ ] Export to YAML - downloads correctly
- [ ] Test `npx @mdreview/mcp` - starts without error
- [ ] Test MCP tools in Claude Code - all work

---

## Appendix A: Complete File List

```
mdreview/
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
│
├── apps/web/
│   ├── .env.local
│   ├── components.json
│   ├── drizzle.config.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vercel.json
│   │
│   ├── drizzle/
│   │   └── *.sql (generated)
│   │
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   │
│       │   ├── review/[slug]/
│       │   │   └── page.tsx
│       │   │
│       │   └── api/
│       │       ├── reviews/
│       │       │   ├── route.ts
│       │       │   └── [id]/
│       │       │       ├── route.ts
│       │       │       ├── wait/route.ts
│       │       │       ├── submit/route.ts
│       │       │       ├── export/route.ts
│       │       │       └── threads/route.ts
│       │       │
│       │       └── threads/[threadId]/
│       │           ├── route.ts
│       │           └── replies/route.ts
│       │
│       ├── components/
│       │   ├── ui/ (shadcn - ~10 files)
│       │   ├── landing/
│       │   │   ├── markdown-uploader.tsx
│       │   │   └── recent-reviews.tsx
│       │   └── review/
│       │       ├── markdown-viewer.tsx
│       │       ├── comment-sidebar.tsx
│       │       ├── thread-card.tsx
│       │       ├── comment-item.tsx
│       │       ├── review-header.tsx
│       │       ├── review-actions.tsx
│       │       └── export-dialog.tsx
│       │
│       ├── db/
│       │   ├── index.ts
│       │   └── schema.ts
│       │
│       ├── lib/
│       │   ├── utils.ts
│       │   ├── api.ts
│       │   └── slug.ts
│       │
│       └── types/
│           └── index.ts
│
└── packages/
    ├── mcp/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       └── api-client.ts
    │
    └── typescript-config/
        ├── package.json
        ├── base.json
        ├── nextjs.json
        └── node-library.json
```

**Total files**: ~45 files (excluding node_modules, generated files)

---

## Appendix B: Time Estimates

| Phase     | Description                          | Estimate                    |
| --------- | ------------------------------------ | --------------------------- |
| 1         | Repository Setup + Database          | 2-3 hours                   |
| 2         | Core API Routes                      | 3-4 hours                   |
| 3         | Basic UI (Landing + Review skeleton) | 3-4 hours                   |
| 4         | Inline Commenting                    | 4-6 hours                   |
| 5         | Review Workflow + Export             | 2-3 hours                   |
| 6         | MCP Server                           | 2-3 hours                   |
| 7         | Polish + Deployment                  | 2-3 hours                   |
| **Total** |                                      | **18-26 hours** (~3-4 days) |

---

## 11. UI Enhancement: GitHub-Style Line-Based Commenting - LLD

**Author**: Apollo (Planner)
**Date**: 2025-01-06
**HLD Reference**: [hld.md](./hld.md#12-ui-enhancement-github-style-line-based-commenting)

---

### 11.1 Implementation Overview

This section provides step-by-step implementation details for transforming MDReview to use GitHub-style line-based commenting.

**Key Changes:**
1. Schema migration: `startOffset/endOffset` → `startLine/endLine`
2. Types update: `TextSelection` → `LineSelection`
3. New component: `CommentModal`
4. Rewrite: `MarkdownViewer` (line-based rendering)
5. Update: `CommentSidebar` (remove inline form, display line numbers)
6. Update: API routes to use line numbers

---

### 11.2 Phase 1: Add shadcn/ui Tabs Component

**Goal:** Add the tabs component needed for Write/Preview tabs in the modal.

**Commands:**
```bash
cd apps/web
npx shadcn@latest add tabs
```

**Verification:** Check that `apps/web/src/components/ui/tabs.tsx` exists.

---

### 11.3 Phase 2: Database Schema Update

**Goal:** Replace character offset columns with line number columns.

**File:** `apps/web/src/db/schema.ts`

**Changes:**

```typescript
// BEFORE (lines 52-53):
startOffset: integer("start_offset").notNull(),
endOffset: integer("end_offset").notNull(),

// AFTER:
startLine: integer("start_line").notNull(),
endLine: integer("end_line").notNull(),
```

**Full context for the change:**

```typescript
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    startLine: integer("start_line").notNull(),       // Changed
    endLine: integer("end_line").notNull(),           // Changed
    selectedText: text("selected_text").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    reviewIdIdx: index("threads_review_id_idx").on(table.reviewId),
    createdAtIdx: index("threads_created_at_idx").on(table.createdAt),
  }),
);
```

**After schema change, run:**
```bash
cd apps/web
pnpm db:push
```

**Verification:** Use `pnpm db:studio` to confirm columns changed.

---

### 11.4 Phase 3: Update Types

**Goal:** Update TypeScript types and Zod schemas to use line numbers.

**File:** `apps/web/src/types/index.ts`

**Change 1: Update `createThreadSchema`**

```typescript
// BEFORE:
export const createThreadSchema = z.object({
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
  selectedText: z.string().min(1),
  body: z.string().min(1),
  authorType: z.enum(["human", "agent"]).default("human"),
  authorName: z.string().max(100).optional(),
});

// AFTER:
export const createThreadSchema = z.object({
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  selectedText: z.string().min(1),
  body: z.string().min(1),
  authorType: z.enum(["human", "agent"]).default("human"),
  authorName: z.string().max(100).optional(),
});
```

**Change 2: Update `ThreadResponse` interface**

```typescript
// BEFORE:
export interface ThreadResponse {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  resolved: boolean;
  resolvedAt: string | null;
  comments: CommentResponse[];
  createdAt: string;
}

// AFTER:
export interface ThreadResponse {
  id: string;
  startLine: number;
  endLine: number;
  selectedText: string;
  resolved: boolean;
  resolvedAt: string | null;
  comments: CommentResponse[];
  createdAt: string;
}
```

**Change 3: Add new `LineSelection` interface (add at end of file)**

```typescript
export interface LineSelection {
  lineNumber: number;
  lineContent: string;
}
```

**Verification:** Run `pnpm typecheck` - expect errors (will fix in next phases).

---

### 11.5 Phase 4: Update API Routes

**Goal:** Update all API routes that reference offset fields.

#### 11.5.1 File: `apps/web/src/app/api/reviews/[id]/threads/route.ts`

**Full replacement:**

```typescript
import { db } from "@/db";
import { comments, reviews, threads } from "@/db/schema";
import { errorResponse, handleApiError, successResponse } from "@/lib/api";
import { createThreadSchema } from "@/types";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reviewId } = await params;
    const body = await request.json();
    const data = createThreadSchema.parse(body);

    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      return errorResponse("not_found", "Review not found", 404);
    }

    const result = await db.transaction(async (tx) => {
      const threadResult = await tx
        .insert(threads)
        .values({
          reviewId,
          startLine: data.startLine,
          endLine: data.endLine,
          selectedText: data.selectedText,
        })
        .returning();

      const thread = threadResult[0];
      if (!thread) {
        throw new Error("Failed to create thread");
      }

      const commentResult = await tx
        .insert(comments)
        .values({
          threadId: thread.id,
          body: data.body,
          authorType: data.authorType,
          authorName: data.authorName,
        })
        .returning();

      const comment = commentResult[0];
      if (!comment) {
        throw new Error("Failed to create comment");
      }

      return { thread, comment };
    });

    return successResponse(
      {
        id: result.thread.id,
        reviewId: result.thread.reviewId,
        startLine: result.thread.startLine,
        endLine: result.thread.endLine,
        selectedText: result.thread.selectedText,
        resolved: result.thread.resolved,
        comments: [
          {
            id: result.comment.id,
            body: result.comment.body,
            authorType: result.comment.authorType,
            authorName: result.comment.authorName,
            createdAt: result.comment.createdAt.toISOString(),
          },
        ],
        createdAt: result.thread.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
```

#### 11.5.2 File: `apps/web/src/app/api/reviews/[id]/route.ts`

**Change:** Update the thread mapping to use `startLine/endLine`:

Find this section and update:
```typescript
// BEFORE:
threads: review.threads.map((thread) => ({
  id: thread.id,
  startOffset: thread.startOffset,
  endOffset: thread.endOffset,
  selectedText: thread.selectedText,
  // ...
})),

// AFTER:
threads: review.threads.map((thread) => ({
  id: thread.id,
  startLine: thread.startLine,
  endLine: thread.endLine,
  selectedText: thread.selectedText,
  // ...
})),
```

#### 11.5.3 File: `apps/web/src/app/api/reviews/[id]/wait/route.ts`

**Change:** Same thread mapping update:

```typescript
// BEFORE in the response mapping:
startOffset: thread.startOffset,
endOffset: thread.endOffset,

// AFTER:
startLine: thread.startLine,
endLine: thread.endLine,
```

**Verification:** Run `pnpm typecheck` - should have fewer errors now.

---

### 11.6 Phase 5: Create Comment Modal Component

**Goal:** Create the GitHub-style comment modal with Write/Preview tabs.

**File:** `apps/web/src/components/review/comment-modal.tsx` (NEW FILE)

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LineSelection } from "@/types";
import {
  Bold,
  Code,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CommentModalProps {
  isOpen: boolean;
  lineSelection: LineSelection | null;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}

export function CommentModal({
  isOpen,
  lineSelection,
  onClose,
  onSubmit,
}: CommentModalProps) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

  const handleSubmit = async () => {
    if (!body.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody("");
      setActiveTab("write");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setBody("");
    setActiveTab("write");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Add comment</span>
            {lineSelection && (
              <span className="text-sm font-normal text-muted-foreground">
                Line {lineSelection.lineNumber}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {lineSelection && (
          <div className="px-3 py-2 bg-muted/50 rounded-md border text-sm">
            <code className="text-xs text-muted-foreground">
              {lineSelection.lineContent.slice(0, 100)}
              {lineSelection.lineContent.length > 100 && "..."}
            </code>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-3">
            <div className="flex items-center gap-1 border-b pb-2">
              <ToolbarButton icon={Bold} title="Bold" />
              <ToolbarButton icon={Italic} title="Italic" />
              <ToolbarButton icon={Heading} title="Heading" />
              <div className="w-px h-4 bg-border mx-1" />
              <ToolbarButton icon={Code} title="Code" />
              <ToolbarButton icon={Link} title="Link" />
              <div className="w-px h-4 bg-border mx-1" />
              <ToolbarButton icon={List} title="Bullet list" />
              <ToolbarButton icon={ListOrdered} title="Numbered list" />
              <ToolbarButton icon={Quote} title="Quote" />
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Leave a comment..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </TabsContent>

          <TabsContent value="preview">
            <div className="min-h-[160px] p-3 border rounded-md bg-background">
              {body.trim() ? (
                <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {body}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nothing to preview
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !body.trim()}
          >
            {isSubmitting ? "Commenting..." : "Comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToolbarButton({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      onClick={(e) => e.preventDefault()}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
```

**Verification:** Import in a test file to check for syntax errors.

---

### 11.7 Phase 6: Rewrite MarkdownViewer Component

**Goal:** Transform to line-based rendering with line numbers and hover buttons.

**File:** `apps/web/src/components/review/markdown-viewer.tsx`

**Full replacement:**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { LineSelection, ThreadResponse } from "@/types";
import { Plus } from "lucide-react";
import React, { useCallback, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  threads: ThreadResponse[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onLineClick: (selection: LineSelection) => void;
}

interface LineInfo {
  lineNumber: number;
  content: string;
  hasThread: boolean;
  threadIds: string[];
}

export function MarkdownViewer({
  content,
  threads,
  activeThreadId,
  onThreadClick,
  onLineClick,
}: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const lines: LineInfo[] = useMemo(() => {
    const rawLines = content.split("\n");

    const threadsByLine = new Map<number, string[]>();
    threads.forEach((thread) => {
      for (let line = thread.startLine; line <= thread.endLine; line++) {
        const existing = threadsByLine.get(line) || [];
        existing.push(thread.id);
        threadsByLine.set(line, existing);
      }
    });

    return rawLines.map((lineContent, index) => {
      const lineNumber = index + 1;
      const threadIds = threadsByLine.get(lineNumber) || [];
      return {
        lineNumber,
        content: lineContent,
        hasThread: threadIds.length > 0,
        threadIds,
      };
    });
  }, [content, threads]);

  const handleLineClick = useCallback(
    (line: LineInfo) => {
      if (line.hasThread && line.threadIds.length > 0) {
        const threadId = line.threadIds[0];
        if (threadId) {
          onThreadClick(threadId);
        }
      }
    },
    [onThreadClick],
  );

  const handleAddComment = useCallback(
    (line: LineInfo) => {
      onLineClick({
        lineNumber: line.lineNumber,
        lineContent: line.content,
      });
    },
    [onLineClick],
  );

  const isLineInActiveThread = useCallback(
    (line: LineInfo) => {
      return activeThreadId !== null && line.threadIds.includes(activeThreadId);
    },
    [activeThreadId],
  );

  return (
    <div ref={containerRef} className="markdown-viewer font-mono text-sm">
      {lines.map((line) => (
        <LineWrapper
          key={line.lineNumber}
          line={line}
          isActive={isLineInActiveThread(line)}
          onClick={() => handleLineClick(line)}
          onAddComment={() => handleAddComment(line)}
        />
      ))}
    </div>
  );
}

interface LineWrapperProps {
  line: LineInfo;
  isActive: boolean;
  onClick: () => void;
  onAddComment: () => void;
}

const LineWrapper = React.memo(function LineWrapper({
  line,
  isActive,
  onClick,
  onAddComment,
}: LineWrapperProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className={cn(
        "group flex min-h-[1.5rem] transition-colors",
        line.hasThread && "bg-yellow-50 dark:bg-yellow-900/20",
        line.hasThread && "border-l-2 border-yellow-400",
        isActive && "bg-yellow-100 dark:bg-yellow-900/40",
      )}
      data-line={line.lineNumber}
      onClick={line.hasThread ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-12 flex-shrink-0 select-none text-right pr-2 text-muted-foreground border-r border-border">
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddComment();
            }}
            className="absolute left-0 top-0 h-full w-6 flex items-center justify-center text-primary hover:bg-primary/10 rounded-sm"
            title="Add comment"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="text-xs leading-6">{line.lineNumber}</span>
      </div>

      <div
        className={cn(
          "flex-1 pl-4 leading-6",
          line.hasThread && "cursor-pointer",
        )}
      >
        {line.content ? (
          <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none [&>*]:my-0 [&>*]:leading-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {line.content}
            </ReactMarkdown>
          </div>
        ) : (
          <span className="invisible">.</span>
        )}
      </div>
    </div>
  );
});
```

**Verification:** Check imports, then run `pnpm typecheck`.

---

### 11.8 Phase 7: Update CommentSidebar Component

**Goal:** Remove inline thread creation form, update to show line numbers.

**File:** `apps/web/src/components/review/comment-sidebar.tsx`

**Full replacement:**

```tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ThreadResponse } from "@/types";

import { ThreadCard } from "./thread-card";

interface CommentSidebarProps {
  reviewId: string;
  threads: ThreadResponse[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onThreadUpdated: (thread: Partial<ThreadResponse> & { id: string }) => void;
}

export function CommentSidebar({
  threads,
  activeThreadId,
  onThreadClick,
  onThreadUpdated,
}: CommentSidebarProps) {
  return (
    <div className="h-full flex flex-col border-l">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Comments</h2>
        <p className="text-sm text-muted-foreground">
          {threads.length} thread{threads.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onClick={() => onThreadClick(thread.id)}
              onReply={async (body) => {
                const response = await fetch(
                  `/api/threads/${thread.id}/replies`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ body, authorType: "human" }),
                  },
                );
                if (response.ok) {
                  const comment = await response.json();
                  onThreadUpdated({
                    id: thread.id,
                    comments: [...thread.comments, comment],
                  });
                }
              }}
              onResolve={async () => {
                const response = await fetch(`/api/threads/${thread.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ resolved: !thread.resolved }),
                });
                if (response.ok) {
                  const updated = await response.json();
                  onThreadUpdated({
                    id: thread.id,
                    resolved: updated.resolved,
                    resolvedAt: updated.resolvedAt,
                  });
                }
              }}
            />
          ))}

          {threads.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Click the + button on any line to add a comment
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

---

### 11.9 Phase 8: Update ThreadCard Component

**Goal:** Show line number instead of selected text in header.

**File:** `apps/web/src/components/review/thread-card.tsx`

**Change:** Update the header section to show line number:

```tsx
// BEFORE (around line 50-54):
<div className="px-3 py-2 bg-muted/50 border-b">
  <p className="text-xs text-muted-foreground line-clamp-2 italic">
    &quot;{thread.selectedText}&quot;
  </p>
</div>

// AFTER:
<div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
  <span className="text-xs font-medium text-foreground">
    Line {thread.startLine}
    {thread.endLine !== thread.startLine && `-${thread.endLine}`}
  </span>
  <span className="text-xs text-muted-foreground line-clamp-1 ml-2 italic max-w-[60%] text-right">
    {thread.selectedText.slice(0, 50)}
    {thread.selectedText.length > 50 && "..."}
  </span>
</div>
```

---

### 11.10 Phase 9: Update ReviewClient Component

**Goal:** Wire up the new CommentModal and updated component props.

**File:** `apps/web/src/components/review/review-client.tsx`

**Full replacement:**

```tsx
"use client";

import { LineSelection, ReviewResponse, ThreadResponse } from "@/types";
import { useCallback, useState } from "react";

import { CommentModal } from "./comment-modal";
import { CommentSidebar } from "./comment-sidebar";
import { MarkdownViewer } from "./markdown-viewer";
import { ReviewActions } from "./review-actions";
import { ReviewHeader } from "./review-header";

interface ReviewClientProps {
  initialReview: ReviewResponse;
}

export function ReviewClient({ initialReview }: ReviewClientProps) {
  const [review, setReview] = useState(initialReview);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [pendingLineSelection, setPendingLineSelection] =
    useState<LineSelection | null>(null);

  const handleLineClick = useCallback((selection: LineSelection) => {
    setPendingLineSelection(selection);
  }, []);

  const handleThreadClick = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  const handleThreadCreated = useCallback((thread: ThreadResponse) => {
    setReview((prev) => ({
      ...prev,
      threads: [...prev.threads, thread],
    }));
    setActiveThreadId(thread.id);
  }, []);

  const handleThreadUpdated = useCallback(
    (update: Partial<ThreadResponse> & { id: string }) => {
      setReview((prev) => ({
        ...prev,
        threads: prev.threads.map((t) =>
          t.id === update.id ? { ...t, ...update } : t,
        ),
      }));
    },
    [],
  );

  const handleStatusChange = useCallback(
    (status: string, decisionMessage: string | null) => {
      setReview((prev) => ({
        ...prev,
        status,
        decisionMessage,
      }));
    },
    [],
  );

  const handleExport = useCallback(
    async (format: "yaml" | "json") => {
      const response = await fetch(
        `/api/reviews/${review.id}/export?format=${format}`,
      );
      if (!response.ok) return;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `review-${review.slug}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [review.id, review.slug],
  );

  const handleCreateThread = useCallback(
    async (body: string) => {
      if (!pendingLineSelection) return;

      const response = await fetch(`/api/reviews/${review.id}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startLine: pendingLineSelection.lineNumber,
          endLine: pendingLineSelection.lineNumber,
          selectedText: pendingLineSelection.lineContent,
          body,
          authorType: "human",
        }),
      });

      if (response.ok) {
        const thread = await response.json();
        handleThreadCreated(thread);
        setPendingLineSelection(null);
      }
    },
    [pendingLineSelection, review.id, handleThreadCreated],
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex h-[calc(100vh-5rem)]">
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <ReviewHeader
              title={review.title}
              status={review.status}
              decisionMessage={review.decisionMessage}
            />
            <MarkdownViewer
              content={review.content}
              threads={review.threads}
              activeThreadId={activeThreadId}
              onThreadClick={handleThreadClick}
              onLineClick={handleLineClick}
            />
          </div>
        </div>

        <div className="w-96 h-full">
          <CommentSidebar
            reviewId={review.id}
            threads={review.threads}
            activeThreadId={activeThreadId}
            onThreadClick={handleThreadClick}
            onThreadUpdated={handleThreadUpdated}
          />
        </div>
      </div>

      <CommentModal
        isOpen={pendingLineSelection !== null}
        lineSelection={pendingLineSelection}
        onClose={() => setPendingLineSelection(null)}
        onSubmit={handleCreateThread}
      />

      <ReviewActions
        reviewId={review.id}
        status={review.status}
        onStatusChange={handleStatusChange}
        onExport={handleExport}
      />
    </div>
  );
}
```

---

### 11.11 Phase 10: Update Review Page to Fetch Correctly

**File:** `apps/web/src/app/review/[slug]/page.tsx`

Check this file to ensure it passes the correct data. The existing implementation should work since we're just changing field names in the response, but verify the structure matches.

---

### 11.12 Phase 11: Final Verification & Testing

**Commands:**
```bash
cd apps/web

# Type check
pnpm typecheck

# Start dev server
pnpm dev
```

**Manual Testing Checklist:**

1. **Line Numbers:**
   - [ ] Line numbers visible in left gutter
   - [ ] Numbers are properly aligned

2. **Hover Button:**
   - [ ] "+" button appears when hovering over line number area
   - [ ] Button disappears when mouse leaves

3. **Comment Modal:**
   - [ ] Click "+" opens modal
   - [ ] Modal shows correct line number
   - [ ] Modal shows line content preview
   - [ ] Write/Preview tabs work
   - [ ] Toolbar icons are visible (non-functional is OK)
   - [ ] Cancel closes modal
   - [ ] Comment button creates thread

4. **Thread Creation:**
   - [ ] Thread appears in sidebar after creation
   - [ ] Line becomes highlighted
   - [ ] Thread shows correct line number

5. **Thread Interaction:**
   - [ ] Clicking highlighted line activates thread in sidebar
   - [ ] Clicking thread in sidebar highlights the line
   - [ ] Reply functionality works
   - [ ] Resolve functionality works

6. **Edge Cases:**
   - [ ] Empty lines display correctly
   - [ ] Long lines don't break layout
   - [ ] Multiple threads on same line handled (shows first)

---

### 11.13 Summary of Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/web/src/db/schema.ts` | Modify | `startOffset/endOffset` → `startLine/endLine` |
| `apps/web/src/types/index.ts` | Modify | Update schemas and types for line numbers |
| `apps/web/src/app/api/reviews/[id]/threads/route.ts` | Modify | Use `startLine/endLine` |
| `apps/web/src/app/api/reviews/[id]/route.ts` | Modify | Return `startLine/endLine` |
| `apps/web/src/app/api/reviews/[id]/wait/route.ts` | Modify | Return `startLine/endLine` |
| `apps/web/src/components/review/comment-modal.tsx` | **New** | GitHub-style comment modal |
| `apps/web/src/components/review/markdown-viewer.tsx` | **Rewrite** | Line-based rendering |
| `apps/web/src/components/review/comment-sidebar.tsx` | Modify | Remove inline form, simplify props |
| `apps/web/src/components/review/thread-card.tsx` | Modify | Show line number in header |
| `apps/web/src/components/review/review-client.tsx` | Modify | Wire up CommentModal |

---

### 11.14 Time Estimate

| Phase | Description | Estimate |
|-------|-------------|----------|
| 1 | Add tabs component | 5 min |
| 2 | Schema update | 15 min |
| 3 | Types update | 15 min |
| 4 | API routes update | 30 min |
| 5 | Create CommentModal | 45 min |
| 6 | Rewrite MarkdownViewer | 60 min |
| 7 | Update CommentSidebar | 20 min |
| 8 | Update ThreadCard | 10 min |
| 9 | Update ReviewClient | 30 min |
| 10-11 | Testing & fixes | 45 min |
| **Total** | | **~4.5 hours** |

---

**End of LLD**
