# Tech Debt Analysis - MDReview Codebase

**Date**: 2025-01-07  
**Analyst**: Athena (Scout)  
**Status**: Complete

---

## Executive Summary

The MDReview codebase is relatively clean for an initial build, but has accumulated several tech debt items that should be addressed before scaling. The most significant issues are:

1. **Type mismatches between web and MCP packages** (Critical)
2. **Duplicated response transformation logic** across API routes and page component (High)
3. **Large monolithic components** violating SRP (High)
4. **Inline API calls in components** lacking abstraction (Medium)
5. **Hardcoded BASE_URL fallbacks** repeated across files (Medium)

---

## Critical Issues (Must Fix)

### 1. Type Mismatch Between Web and MCP Packages

**Files**:
- `packages/mcp/src/api-client.ts` (lines 25-32)
- `apps/web/src/types/index.ts` (lines 51-60)

**Problem**: The MCP package's `ThreadResponse` interface uses different property names than the web API:

```typescript
// MCP api-client.ts (WRONG)
interface ThreadResponse {
  startOffset: number;  // Should be startLine
  endOffset: number;    // Should be endLine
  // Missing: resolvedAt, createdAt
}

// Web types/index.ts (CORRECT)
export interface ThreadResponse {
  startLine: number;
  endLine: number;
  resolvedAt: string | null;
  createdAt: string;
}
```

**Impact**: Runtime errors when MCP tools try to access thread data. The `get_review_status` tool will fail to display correct line numbers.

**Suggested Fix**: Update MCP's `ThreadResponse` interface to match web types exactly. Consider sharing types via a shared package.

---

### 2. Incorrect Type in API Error Response

**File**: `apps/web/src/lib/api.ts` (line 12)

**Problem**: 
```typescript
export function errorResponse(
  error: string,
  message: string,
  status: number,
  issues?: unknown[],  // Should be z.ZodIssue[]
)
```

**Impact**: Loses type safety for Zod validation errors.

**Suggested Fix**:
```typescript
import { ZodIssue } from "zod";

export function errorResponse(
  error: string,
  message: string,
  status: number,
  issues?: ZodIssue[],
)
```

---

### 3. Unsafe parseInt in Wait Route

**File**: `apps/web/src/app/api/reviews/[id]/wait/route.ts` (line 17-20)

**Problem**:
```typescript
const timeout = Math.min(
  parseInt(searchParams.get("timeout") || String(DEFAULT_TIMEOUT)),
  DEFAULT_TIMEOUT,
);
```

If an invalid string like "abc" is passed, `parseInt` returns `NaN`, and `Math.min(NaN, 300)` returns `NaN`, causing the polling loop to malfunction.

**Suggested Fix**: Add validation:
```typescript
const parsed = parseInt(searchParams.get("timeout") || "");
const timeout = Math.min(
  isNaN(parsed) || parsed <= 0 ? DEFAULT_TIMEOUT : parsed,
  DEFAULT_TIMEOUT,
);
```

---

## High Priority (Should Fix Soon)

### 4. Duplicated Review Response Transformation Logic

**Files**:
- `apps/web/src/app/api/reviews/[id]/route.ts` (lines 34-62)
- `apps/web/src/app/api/reviews/[id]/wait/route.ts` (lines 53-78)
- `apps/web/src/app/api/reviews/[id]/export/route.ts` (lines 38-57)
- `apps/web/src/app/review/[slug]/page.tsx` (lines 30-58)

**Problem**: The same review-to-response transformation is duplicated 4 times:

```typescript
// This pattern repeats in 4 files:
{
  id: review.id,
  slug: review.slug,
  url: `${baseUrl}/review/${review.slug}`,
  content: review.content,
  title: review.title,
  status: review.status,
  threads: review.threads.map((thread) => ({
    id: thread.id,
    startLine: thread.startLine,
    // ... same mapping logic
  })),
}
```

**Suggested Fix**: Create a shared transformer function:
```typescript
// lib/transformers.ts
export function transformReviewToResponse(review: ReviewWithThreads, baseUrl: string): ReviewResponse {
  return {
    id: review.id,
    // ... centralized transformation logic
  };
}
```

---

### 5. BASE_URL Hardcoded in Multiple Places

**Files**:
- `apps/web/src/app/api/reviews/route.ts` (line 14)
- `apps/web/src/app/api/reviews/[id]/route.ts` (line 32)
- `apps/web/src/app/review/[slug]/page.tsx` (line 28)
- `packages/mcp/src/api-client.ts` (line 1)

**Problem**: Same fallback pattern repeated:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
```

**Suggested Fix**: Create a centralized config:
```typescript
// lib/config.ts
export const config = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
} as const;
```

---

### 6. markdown-viewer.tsx is Too Large (536 lines)

**File**: `apps/web/src/components/review/markdown-viewer.tsx`

**Problem**: This component handles too many responsibilities:
1. Markdown rendering via ReactMarkdown
2. Block registration and tracking (lines 64-96)
3. Selection state management (lines 67-73, 147-218)
4. Thread association logic (lines 242-271)
5. Inline comment form rendering
6. Event handling (pointer events, keyboard events)

**Suggested Fix**: Extract into smaller components/hooks:
- `useBlockSelection()` - selection state and pointer handling
- `useBlockRegistry()` - block registration and lookup
- `useThreadHighlighting()` - thread association logic
- Keep `MarkdownViewer` as orchestrator only

---

### 7. Inline API Calls in Components

**Files**:
- `apps/web/src/components/review/review-client.tsx` (lines 56-73, 76-96)
- `apps/web/src/components/review/comment-sidebar.tsx` (lines 91-122)
- `apps/web/src/components/review/review-actions.tsx` (lines 34-57)

**Problem**: API calls are made directly in components without abstraction:

```typescript
// comment-sidebar.tsx - inline fetch in render prop
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
    onThreadUpdated({...});
  }
}}
```

**Impact**: No error handling, no loading states for some calls, duplicated fetch patterns, hard to test.

**Suggested Fix**: Create an API service layer:
```typescript
// lib/api-service.ts
export const reviewApi = {
  createThread: async (reviewId: string, data: CreateThreadData) => {...},
  addReply: async (threadId: string, body: string) => {...},
  resolveThread: async (threadId: string) => {...},
  submitDecision: async (reviewId: string, decision: Decision) => {...},
};
```

---

## Medium Priority (Fix When Convenient)

### 8. Unused MCP Parameter: includeContent

**File**: `packages/mcp/src/api-client.ts` (lines 80-86)

**Problem**: The `getReview` method accepts `includeContent` parameter but the web API doesn't use it:

```typescript
async getReview(reviewId: string, includeContent = false): Promise<ReviewResponse> {
  const url = includeContent
    ? `${this.baseUrl}/api/reviews/${reviewId}?includeContent=true`
    : `${this.baseUrl}/api/reviews/${reviewId}`;
  // ...
}
```

The API route at `apps/web/src/app/api/reviews/[id]/route.ts` doesn't check for this query parameter.

**Suggested Fix**: Either:
1. Remove the parameter from MCP if not needed
2. Implement the functionality in the API route

---

### 9. Missing Error Handling in Export Function

**File**: `apps/web/src/components/review/review-client.tsx` (lines 56-74)

**Problem**: Silent failure on export error:
```typescript
const handleExport = useCallback(
  async (format: "yaml" | "json") => {
    const response = await fetch(
      `/api/reviews/${review.id}/export?format=${format}`,
    );
    if (!response.ok) return;  // Silent failure, no user feedback
    // ...
  },
  [review.id, review.slug],
);
```

**Suggested Fix**: Add error handling with toast notification:
```typescript
if (!response.ok) {
  toast.error("Failed to export review");
  return;
}
```

---

### 10. Console Logging in Production Code

**Files**:
- `apps/web/src/lib/api.ts` (line 18): `console.error("API Error:", error);`
- `packages/mcp/src/index.ts` (lines 226, 230): `console.error(...)`

**Problem**: Console statements should be replaced with proper logging infrastructure for production.

**Suggested Fix**: Use a logging library or remove in production builds.

---

### 11. Toolbar Buttons Don't Work

**File**: `apps/web/src/components/review/inline-comment-form.tsx` (lines 135-152)

**Problem**: Toolbar buttons have no functionality:
```typescript
function ToolbarButton({icon: Icon, title}: {...}) {
  return (
    <button
      type="button"
      title={title}
      className="..."
      onClick={(e) => e.preventDefault()}  // Does nothing!
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
```

**Impact**: Misleading UX - buttons appear clickable but do nothing.

**Suggested Fix**: Either implement markdown insertion or remove the toolbar until implemented.

---

## Low Priority (Nice to Have)

### 12. Dead Code: comment-modal.tsx

**File**: `apps/web/src/components/review/comment-modal.tsx`

**Problem**: File exists but is never imported or used anywhere in the codebase. The inline comment form replaced this functionality.

**Suggested Fix**: Delete unused file.

---

### 13. reviewId Prop Unused in CommentSidebar

**File**: `apps/web/src/components/review/comment-sidebar.tsx` (line 22)

**Problem**: 
```typescript
export function CommentSidebar({
  reviewId,  // Destructured but never used
  threads,
  activeThreadId,
  onThreadClick,
  onThreadUpdated,
}: CommentSidebarProps) {
```

**Suggested Fix**: Remove from props interface and component signature.

---

### 14. Duplicate Highlight Styling Logic

**Files**:
- `apps/web/src/components/review/commentable-block.tsx` (lines 46-62)
- `apps/web/src/components/review/code-block-with-lines.tsx` (lines 176-187)

**Problem**: Same highlighting class logic is duplicated:
```typescript
// Both files have this pattern:
cn(
  "relative transition-colors select-none",
  showBlueHighlight && "bg-blue-100 dark:bg-blue-900/40",
  !isSelecting && !showBlueHighlight && isHovered && !hasThread && "bg-blue-50/50 dark:bg-blue-900/10",
  !showBlueHighlight && hasThread && "bg-violet-50 dark:bg-violet-900/20",
  !showBlueHighlight && isActive && "bg-violet-100 dark:bg-violet-900/40",
  hasThread && "cursor-pointer"
)
```

**Suggested Fix**: Extract to a shared utility:
```typescript
// lib/highlight-styles.ts
export function getBlockHighlightClasses({
  showBlueHighlight,
  isSelecting,
  isHovered,
  hasThread,
  isActive
}: HighlightState): string { ... }
```

---

### 15. Magic Numbers

**Files**:
- `apps/web/src/components/review/comment-sidebar.tsx` (lines 18-20): `MIN_WIDTH = 320`, `MAX_WIDTH = 800`, `DEFAULT_WIDTH = 480`
- `apps/web/src/components/review/comment-item.tsx` (line 11): `MAX_COLLAPSED_HEIGHT = 150`
- `apps/web/src/app/api/reviews/[id]/wait/route.ts` (lines 7-8): `DEFAULT_TIMEOUT = 300`, `POLL_INTERVAL = 2000`

**Problem**: Constants are defined locally. Not a major issue but could be centralized.

**Suggested Fix**: Create a constants file for configurable values.

---

### 16. Inconsistent Status Type

**Files**:
- `apps/web/src/db/schema.ts` (lines 119-123): `ReviewStatus` type
- `apps/web/src/types/index.ts` (line 11): `submitReviewSchema`
- `apps/web/src/components/review/review-header.tsx` (lines 12-20): `statusConfig`

**Problem**: Status values defined in multiple places. The schema has:
```typescript
export type ReviewStatus = "pending" | "approved" | "changes_requested" | "rejected";
```

But `submitReviewSchema` doesn't reuse this type, and `review-header.tsx` hardcodes the same values.

**Suggested Fix**: Export `ReviewStatus` from schema and import everywhere.

---

## Summary of Recommended Actions

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| Critical | Fix MCP ThreadResponse types | Low | High |
| Critical | Fix errorResponse type | Low | Medium |
| Critical | Fix parseInt validation | Low | Medium |
| High | Extract response transformer | Medium | High |
| High | Centralize BASE_URL config | Low | Medium |
| High | Refactor markdown-viewer.tsx | High | High |
| High | Create API service layer | Medium | High |
| Medium | Remove/implement includeContent | Low | Low |
| Medium | Add export error handling | Low | Medium |
| Medium | Replace console.error | Low | Medium |
| Medium | Implement or remove toolbar | Medium | Medium |
| Low | Delete comment-modal.tsx | Low | Low |
| Low | Remove unused reviewId prop | Low | Low |
| Low | Extract highlight styles | Low | Low |
| Low | Centralize constants | Low | Low |
| Low | Reuse ReviewStatus type | Low | Low |

---

## Files Changed Summary

**Primary Focus**:
- `packages/mcp/src/api-client.ts` - Type fixes
- `apps/web/src/lib/api.ts` - Type and error handling
- `apps/web/src/components/review/markdown-viewer.tsx` - SRP refactor
- New file: `apps/web/src/lib/transformers.ts`
- New file: `apps/web/src/lib/api-service.ts`
- New file: `apps/web/src/lib/config.ts`

**Secondary**:
- All API routes - use centralized transformer and config
- `apps/web/src/app/review/[slug]/page.tsx` - use centralized transformer
- `apps/web/src/components/review/comment-sidebar.tsx` - use API service
- `apps/web/src/components/review/review-client.tsx` - use API service
- `apps/web/src/components/review/review-actions.tsx` - use API service
