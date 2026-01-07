# MCP Tool Improvements

**Status**: complete
**Created**: 2025-01-07
**Assignee**: Hercules

## Overview

Improve the MCP tools to be more ergonomic for AI agents.

## Requirements

### 1. `request_review` - Read from file path instead of content string

**Current**:
```typescript
inputSchema: {
  content: z.string().describe("The markdown content to review"),
  title: z.string().optional().describe("Optional title for the review"),
}
```

**Target**:
```typescript
inputSchema: {
  filePath: z.string().describe("Path to the markdown file to review"),
  title: z.string().optional().describe("Optional title for the review"),
}
```

- Read the file from disk using `fs.readFileSync`
- Handle file not found errors gracefully
- Keep the API call the same (still sends content to the server)

### 2. `get_review_status` - Return full comments/threads

**Current**: Returns only counts
```typescript
structuredContent: {
  status: result.status,
  threadCount: result.threads.length,
  commentCount: result.threads.reduce((sum, t) => sum + t.comments.length, 0),
}
```

**Target**: Return full thread/comment data (like `wait_for_review` does)

### 3. `get_review_status` - Exclude content by default

**Current**: API returns `content` field always

**Target**:
- Add `includeContent: boolean` optional parameter (default: false)
- Only include `content` in response when explicitly requested
- Rationale: The caller (AI agent) already has the file locally

## Files to Modify

- `packages/mcp/src/index.ts` - Update tool definitions
- `packages/mcp/src/api-client.ts` - May need query param for includeContent

## After Implementation

1. Build: `cd packages/mcp && pnpm build`
2. Bump version in `package.json` to `0.2.0`
3. Publish: `npm publish --access public`
4. Test in OpenCode

## Acceptance Criteria

- [x] `request_review` accepts `filePath` and reads file from disk
- [x] `get_review_status` returns full thread/comment structure
- [x] `get_review_status` has `includeContent` optional flag
- [x] TypeScript compiles without errors
- [ ] MCP server starts correctly (needs testing)
- [ ] Publish to npm
