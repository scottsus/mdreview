# Tech Debt Cleanup - Implementation Plan

**Date**: 2025-01-07
**Status**: in-progress
**Priority**: High

---

## Overview

Comprehensive tech debt cleanup for MDReview codebase, addressing all issues identified in the tech debt analysis plus adding integration tests.

## Execution Strategy

**Tests First!** - Write integration tests for all existing functionality BEFORE any refactoring. This creates a safety net so we can refactor with confidence.

## Tasks

### Phase 0: Integration Tests (DO FIRST) ✅ COMPLETE

| # | Task | Files | Effort | Status |
|---|------|-------|--------|--------|
| 0.1 | Set up test infrastructure (vitest, config) | New: `apps/web/tests/integration/` | Medium | ✅ done |
| 0.2 | Write review CRUD tests (create, get) | New: `tests/reviews.test.ts` | Medium | ✅ done |
| 0.3 | Write thread/comment tests | New: `tests/threads.test.ts` | Medium | ✅ done |
| 0.4 | Write submit decision tests | New: `tests/submit.test.ts` | Low | ✅ done |
| 0.5 | Write export tests (YAML/JSON) | New: `tests/export.test.ts` | Low | ✅ done |
| 0.6 | Write wait/polling tests | New: `tests/wait.test.ts` | Medium | ✅ done |
| 0.7 | Verify ALL tests pass | - | - | ✅ 46/46 pass |

### Phase 1: Quick Wins (Critical + Easy Fixes) ✅ COMPLETE

| # | Task | Files | Effort | Status |
|---|------|-------|--------|--------|
| 1.1 | Fix MCP ThreadResponse types | `packages/mcp/src/api-client.ts` | Low | ✅ done |
| 1.2 | Fix errorResponse Zod type | `apps/web/src/lib/api.ts` | Low | ✅ done |
| 1.3 | Fix unsafe parseInt in wait route | `apps/web/src/app/api/reviews/[id]/wait/route.ts` | Low | ✅ done |
| 1.4 | Remove dead code (comment-modal.tsx) | `apps/web/src/components/review/comment-modal.tsx` | Low | ✅ deleted |
| 1.5 | Remove unused reviewId prop | `apps/web/src/components/review/comment-sidebar.tsx` | Low | ✅ done |

### Phase 2: Centralization & DRY ✅ COMPLETE

| # | Task | Files | Effort | Status |
|---|------|-------|--------|--------|
| 2.1 | Create centralized config | New: `apps/web/src/lib/config.ts` | Low | ✅ done |
| 2.2 | Create shared response transformer | New: `apps/web/src/lib/transformers.ts` | Medium | ✅ done |
| 2.3 | Update all API routes to use transformer | 4 routes + 1 page | Medium | ✅ done |
| 2.4 | Extract highlight styling to shared utility | New: `apps/web/src/lib/highlight-styles.ts` | Low | ✅ done |
| 2.5 | Centralize ReviewStatus type usage | Multiple files | Low | ✅ skipped (minimal impact) |
| 2.6 | Centralize magic numbers/constants | New: `apps/web/src/lib/constants.ts` | Low | ✅ done |

### Phase 3: API Service Layer ✅ COMPLETE

| # | Task | Files | Effort | Status |
|---|------|-------|--------|--------|
| 3.1 | Create API service layer | New: `apps/web/src/lib/api-service.ts` | Medium | ✅ done |
| 3.2 | Refactor review-client.tsx to use API service | `apps/web/src/components/review/review-client.tsx` | Medium | ✅ done |
| 3.3 | Refactor comment-sidebar.tsx to use API service | `apps/web/src/components/review/comment-sidebar.tsx` | Medium | ✅ done |
| 3.4 | Refactor review-actions.tsx to use API service | `apps/web/src/components/review/review-actions.tsx` | Medium | ✅ done |
| 3.5 | Add proper error handling with user feedback | All components using API | Medium | ✅ done (sonner toasts) |

### Phase 4: SRP Refactoring (markdown-viewer.tsx) ✅ COMPLETE

| # | Task | Files | Effort | Status |
|---|------|-------|--------|--------|
| 4.1 | Extract useBlockSelection hook | New: `apps/web/src/hooks/use-block-selection.ts` | High | ✅ done |
| 4.2 | Extract useBlockRegistry hook | New: `apps/web/src/hooks/use-block-registry.ts` | Medium | ✅ done |
| 4.3 | Extract useThreadHighlighting hook | New: `apps/web/src/hooks/use-thread-highlighting.ts` | Medium | ✅ done |
| 4.4 | Refactor markdown-viewer.tsx as orchestrator | `apps/web/src/components/review/markdown-viewer.tsx` | High | ✅ 535→335 lines |

### Phase 5: Medium Priority Fixes ✅ COMPLETE

| # | Task | Files | Effort | Status |
|---|------|-------|--------|--------|
| 5.1 | Remove or implement includeContent param | `packages/mcp/src/api-client.ts` | Low | ✅ removed |
| 5.2 | Add export error handling with toast | `apps/web/src/components/review/review-client.tsx` | Low | ✅ already done in Phase 3 |
| 5.3 | Remove console.error statements | `apps/web/src/lib/api.ts` | Low | ✅ removed |
| 5.4 | Remove non-functional toolbar buttons | `apps/web/src/components/review/inline-comment-form.tsx` | Low | ✅ removed (153→108 lines) |

### Phase 6: Integration Tests

| # | Task | Files | Effort |
|---|------|-------|--------|
| 6.1 | Set up test infrastructure | New: `apps/web/tests/integration/` | Medium |
| 6.2 | Write review CRUD tests | New: `tests/integration/src/tests/reviews.test.ts` | Medium |
| 6.3 | Write thread/comment tests | New: `tests/integration/src/tests/threads.test.ts` | Medium |
| 6.4 | Write export tests | New: `tests/integration/src/tests/export.test.ts` | Low |
| 6.5 | Write wait/polling tests | New: `tests/integration/src/tests/wait.test.ts` | Medium |

---

## Success Criteria

1. All TypeScript errors resolved
2. No code duplication in response transformation
3. All API calls go through service layer
4. markdown-viewer.tsx < 200 lines
5. All integration tests pass
6. Existing functionality preserved (manual verification)

## Test Verification

After each phase:
1. Run `pnpm build` to verify no TypeScript errors
2. Run `pnpm dev` and manually test core flows
3. After Phase 6: Run `pnpm test:integration`

---

## Execution Order

```
Phase 0 (Integration Tests) ← START HERE
    ↓
    All tests pass? ✅
    ↓
Phase 1 (Quick Wins) → run tests
    ↓
Phase 2 (Centralization) → run tests
    ↓
Phase 3 (API Service Layer) → run tests
    ↓
Phase 4 (SRP Refactoring) → run tests
    ↓
Phase 5 (Medium Priority) → run tests
    ↓
    All tests still pass? ✅ DONE
```
