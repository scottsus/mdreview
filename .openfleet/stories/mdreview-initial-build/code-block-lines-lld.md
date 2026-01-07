# Code Block Line-Level Selection - Low Level Design

**Author**: Apollo (Planner)
**Date**: 2025-01-06
**Story**: mdreview-initial-build
**Task**: Implement line-level selection within fenced code blocks

---

## Problem

Currently, fenced code blocks are treated as single commentable units. Users cannot select individual lines within code blocks - they can only comment on the entire block.

**Desired**: Each line within a code block should be individually selectable and participate in the existing multi-block selection system.

---

## Solution Overview

1. Replace the default `<pre>` component with a custom `CodeBlockWithLines` component
2. Use `prism-react-renderer` to render code line-by-line with syntax highlighting
3. Each code line registers as its own "block" in the existing selection system
4. Reuse all existing selection logic - no changes to selection state management

---

## Step 1: Install Dependencies

```bash
cd apps/web
pnpm add prism-react-renderer
```

**Verification**: `pnpm build` should succeed without errors.

---

## Step 2: Create `CodeBlockWithLines` Component

**File**: `apps/web/src/components/review/code-block-with-lines.tsx`

```tsx
"use client";

import { cn } from "@/lib/utils";
import { Highlight, themes } from "prism-react-renderer";
import { Plus } from "lucide-react";
import React, { useState } from "react";

interface CodeBlockWithLinesProps {
  code: string;
  language: string;
  sourceStartLine: number;
  
  // Selection system integration
  getNextBlockIndex: () => number;
  registerBlock: (index: number, startLine: number, endLine: number) => void;
  
  // Selection state (passed from parent)
  selectedRange: { start: number; end: number } | null;
  isSelecting: boolean;
  finalSelection: {
    startBlockIndex: number;
    endBlockIndex: number;
  } | null;
  
  // Thread info
  getThreadsForLine: (line: number) => string[];
  activeThreadId: string | null;
  
  // Callbacks
  onPointerDown: (blockIndex: number, e: React.PointerEvent) => void;
  onAddComment: (blockIndex: number, startLine: number, endLine: number, content: string) => void;
  onThreadClick: (threadId: string) => void;
}

export function CodeBlockWithLines({
  code,
  language,
  sourceStartLine,
  getNextBlockIndex,
  registerBlock,
  selectedRange,
  isSelecting,
  finalSelection,
  getThreadsForLine,
  activeThreadId,
  onPointerDown,
  onAddComment,
  onThreadClick,
}: CodeBlockWithLinesProps) {
  return (
    <Highlight code={code} language={language} theme={themes.github}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="relative overflow-x-auto rounded-md bg-zinc-50 dark:bg-zinc-900 p-4 text-sm">
          {tokens.map((line, lineIndex) => {
            const blockIndex = getNextBlockIndex();
            const sourceLine = sourceStartLine + lineIndex;
            
            registerBlock(blockIndex, sourceLine, sourceLine);
            
            return (
              <CodeLine
                key={lineIndex}
                blockIndex={blockIndex}
                sourceLine={sourceLine}
                lineNumber={lineIndex + 1}
                selectedRange={selectedRange}
                isSelecting={isSelecting}
                finalSelection={finalSelection}
                getThreadsForLine={getThreadsForLine}
                activeThreadId={activeThreadId}
                onPointerDown={onPointerDown}
                onAddComment={onAddComment}
                onThreadClick={onThreadClick}
                lineProps={getLineProps({ line })}
              >
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </CodeLine>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}

interface CodeLineProps {
  blockIndex: number;
  sourceLine: number;
  lineNumber: number;
  selectedRange: { start: number; end: number } | null;
  isSelecting: boolean;
  finalSelection: { startBlockIndex: number; endBlockIndex: number } | null;
  getThreadsForLine: (line: number) => string[];
  activeThreadId: string | null;
  onPointerDown: (blockIndex: number, e: React.PointerEvent) => void;
  onAddComment: (blockIndex: number, startLine: number, endLine: number, content: string) => void;
  onThreadClick: (threadId: string) => void;
  lineProps: React.HTMLAttributes<HTMLDivElement>;
  children: React.ReactNode;
}

function CodeLine({
  blockIndex,
  sourceLine,
  lineNumber,
  selectedRange,
  isSelecting,
  finalSelection,
  getThreadsForLine,
  activeThreadId,
  onPointerDown,
  onAddComment,
  onThreadClick,
  lineProps,
  children,
}: CodeLineProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const threadIds = getThreadsForLine(sourceLine);
  const hasThread = threadIds.length > 0;
  const isActive = activeThreadId !== null && threadIds.includes(activeThreadId);
  
  const isInSelectionRange =
    selectedRange !== null &&
    blockIndex >= selectedRange.start &&
    blockIndex <= selectedRange.end;
  
  const isInFinalSelection =
    finalSelection !== null &&
    blockIndex >= finalSelection.startBlockIndex &&
    blockIndex <= finalSelection.endBlockIndex;
  
  const showBlueHighlight = isInSelectionRange || isInFinalSelection;

  return (
    <div
      {...lineProps}
      className={cn(
        "flex relative transition-colors select-none",
        showBlueHighlight && "bg-blue-100 dark:bg-blue-900/40",
        !isSelecting && !showBlueHighlight && isHovered && !hasThread && "bg-blue-50/50 dark:bg-blue-900/10",
        !showBlueHighlight && hasThread && "bg-yellow-50 dark:bg-yellow-900/20",
        !showBlueHighlight && isActive && "bg-yellow-100 dark:bg-yellow-900/40",
        hasThread && "cursor-pointer"
      )}
      data-block-index={blockIndex}
      data-source-line={sourceLine}
      onPointerDown={(e) => onPointerDown(blockIndex, e)}
      onMouseEnter={() => !isSelecting && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={hasThread ? () => onThreadClick(threadIds[0]) : undefined}
    >
      {/* Plus button on hover */}
      {isHovered && !isSelecting && !hasThread && (
        <button
          className="absolute -left-6 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-primary/10 text-primary"
          onClick={(e) => {
            e.stopPropagation();
            // Get line content from children (text nodes)
            const content = (e.currentTarget.parentElement?.textContent || "").slice(0, 100);
            onAddComment(blockIndex, sourceLine, sourceLine, content);
          }}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
      
      {/* Line number */}
      <span className="select-none text-muted-foreground text-right w-8 pr-4 shrink-0">
        {lineNumber}
      </span>
      
      {/* Code content */}
      <span className="flex-1">{children}</span>
    </div>
  );
}
```

**Verification**: TypeScript compilation should pass. `pnpm tsc --noEmit` in `apps/web`.

---

## Step 3: Modify `markdown-viewer.tsx`

### 3.1 Add Import

```tsx
// At top of file, add:
import { CodeBlockWithLines } from "./code-block-with-lines";
```

### 3.2 Create Helper Function for Thread Lookup by Line

Already exists as `threadsByLine` map and `getThreadsForRange`. Add a simpler helper:

```tsx
// Inside MarkdownViewer component, after threadsByLine useMemo:
const getThreadsForLine = useCallback(
  (line: number): string[] => {
    return threadsByLine.get(line) || [];
  },
  [threadsByLine]
);
```

### 3.3 Create Custom `pre` Component

Replace the `pre: createBlockComponent("pre")` in the `components` object with a custom handler.

**Location**: Inside `createBlockComponent` callback, but we need a separate component for `pre`.

Add this **before** the `components` useMemo (around line 368):

```tsx
const PreComponent: React.FC<BlockComponentProps> = useCallback(
  ({ node, children, ...rest }) => {
    // Extract code element from children
    const childArray = React.Children.toArray(children);
    const codeElement = childArray.find(
      (child): child is React.ReactElement =>
        React.isValidElement(child) && child.type === "code"
    );

    // If no code element or no language, fall back to regular block
    if (!codeElement) {
      const position = node?.position;
      const startLine = position?.start?.line ?? 1;
      const endLine = position?.end?.line ?? 1;
      const blockIndex = blockIndexRef.current++;
      blocksRef.current[blockIndex] = { startLine, endLine };

      return (
        <CommentableBlock
          blockIndex={blockIndex}
          startLine={startLine}
          endLine={endLine}
          hasThread={false}
          isActive={false}
          isInSelectionRange={false}
          isSelecting={selectionState.isSelecting}
          isInFinalSelection={false}
          onPointerDown={(e) => handleBlockPointerDown(blockIndex, e)}
          onAddComment={() => {}}
          onClick={() => {}}
        >
          <pre {...rest}>{children}</pre>
        </CommentableBlock>
      );
    }

    // Extract language and code content
    const className = (codeElement.props as { className?: string }).className || "";
    const languageMatch = /language-(\w+)/.exec(className);
    const language = languageMatch ? languageMatch[1] : "text";
    const codeContent = String(
      (codeElement.props as { children?: React.ReactNode }).children || ""
    ).replace(/\n$/, "");

    // Source line mapping: node.position.start.line points to opening fence
    // Code content starts at start.line + 1
    const position = node?.position;
    const sourceStartLine = (position?.start?.line ?? 0) + 1;

    return (
      <CodeBlockWithLines
        code={codeContent}
        language={language}
        sourceStartLine={sourceStartLine}
        getNextBlockIndex={() => blockIndexRef.current++}
        registerBlock={(index, start, end) => {
          blocksRef.current[index] = { startLine: start, endLine: end };
        }}
        selectedRange={selectedRange}
        isSelecting={selectionState.isSelecting}
        finalSelection={selectionState.finalSelection}
        getThreadsForLine={getThreadsForLine}
        activeThreadId={activeThreadId}
        onPointerDown={handleBlockPointerDown}
        onAddComment={(blockIndex, startLine, endLine, content) => {
          setSelectionState({
            isSelecting: false,
            anchorBlockIndex: null,
            focusBlockIndex: null,
            finalSelection: {
              startBlockIndex: blockIndex,
              endBlockIndex: blockIndex,
              startLine,
              endLine,
              blockContent: content,
            },
          });
        }}
        onThreadClick={onThreadClick}
      />
    );
  },
  [
    activeThreadId,
    getThreadsForLine,
    handleBlockPointerDown,
    onThreadClick,
    selectedRange,
    selectionState.isSelecting,
    selectionState.finalSelection,
  ]
);
```

### 3.4 Update Components Object

Change line 378 from:
```tsx
pre: createBlockComponent("pre") as Components["pre"],
```

To:
```tsx
pre: PreComponent as Components["pre"],
```

Also add `getThreadsForLine` to the dependencies of `components` useMemo.

---

## Step 4: Handle Inline Comment Form for Code Lines

The `InlineCommentForm` appears after the last block in `finalSelection`. For code blocks, this works automatically because each code line is registered as a block.

However, the form currently renders inside `createBlockComponent`. For code lines, we need to render the form after the `CodeBlockWithLines` component.

**Option A (Simpler)**: Render `InlineCommentForm` at container level, positioned after the last selected block.

**Option B**: Pass form rendering logic into `CodeBlockWithLines`.

**Recommendation**: Option A - add a separate `InlineCommentForm` render after the entire markdown, positioned based on `finalSelection.endBlockIndex`.

For now, the existing logic should work since the parent `markdown-viewer` handles the form. The code lines just need to participate in selection.

**Update**: Looking at the code, `showInlineForm` logic is inside `createBlockComponent`. Since we're handling `pre` separately, we need to add the form rendering inside `CodeBlockWithLines` or after it.

Add to `PreComponent`, after `CodeBlockWithLines`:

```tsx
// After CodeBlockWithLines, before the closing return:
{selectionState.finalSelection && (() => {
  // Find if any code line in this block is the final selected block
  const codeLines = codeContent.split("\n");
  const firstBlockIndex = blockIndexRef.current - codeLines.length;
  const lastBlockIndex = blockIndexRef.current - 1;
  
  // Check if final selection ends within this code block
  const showForm = 
    selectionState.finalSelection.endBlockIndex >= firstBlockIndex &&
    selectionState.finalSelection.endBlockIndex <= lastBlockIndex;
  
  if (showForm) {
    return (
      <InlineCommentForm
        lineSelection={{
          startLine: selectionState.finalSelection.startLine,
          endLine: selectionState.finalSelection.endLine,
          blockContent: selectionState.finalSelection.blockContent,
        }}
        onSubmit={handleCommentSubmit}
        onCancel={handleCommentCancel}
      />
    );
  }
  return null;
})()}
```

**Note**: This is getting complex. Simpler approach: track whether form should appear after code block by checking block indices.

---

## Step 5: Source Line Mapping Formula

```
Markdown source:
Line 9:  ```javascript     <- fence marker (position.start.line = 9)
Line 10: function hello()  <- code line 0 = source line 10
Line 11:   return true;    <- code line 1 = source line 11  
Line 12: }                 <- code line 2 = source line 12
Line 13: ```               <- closing fence

Formula:
sourceStartLine = node.position.start.line + 1
sourceLine[i] = sourceStartLine + i
```

---

## Testing Plan

### Test 1: Basic Rendering
1. Create a markdown with a fenced code block
2. Verify line numbers appear
3. Verify syntax highlighting works

### Test 2: Single Line Selection
1. Click on a code line
2. Verify blue highlight appears
3. Verify inline comment form appears

### Test 3: Multi-Line Selection (within code block)
1. Click and drag from line 2 to line 5
2. Verify all lines 2-5 are highlighted
3. Verify form appears after line 5

### Test 4: Mixed Selection (code + regular blocks)
1. Start selection on a code line
2. Drag to a paragraph after the code block
3. Verify both code lines and paragraph are highlighted
4. Verify selection spans correctly

### Test 5: Thread Highlights
1. Add a comment on a code line
2. Verify yellow highlight appears on that line
3. Click the highlighted line
4. Verify sidebar shows the thread

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `prism-react-renderer` |
| `code-block-with-lines.tsx` | Create | New component with line-by-line rendering |
| `markdown-viewer.tsx` | Modify | Custom `pre` handler, `getThreadsForLine` helper |

---

## Estimated Effort

| Task | Time |
|------|------|
| Install dependency | 5 min |
| Create `CodeBlockWithLines` | 1-2 hours |
| Modify `markdown-viewer.tsx` | 1 hour |
| Testing and fixes | 1-2 hours |
| **Total** | **3-5 hours** |

---

## Edge Cases to Handle

1. **Empty lines**: Still render as selectable divs (handled by prism-react-renderer tokens)
2. **No language**: Use `"text"` as fallback
3. **Very long lines**: `overflow-x: auto` on `<pre>` handles horizontal scroll
4. **Inline code**: Not affected - only fenced code blocks (detected by `language-*` class)

---

**LLD Complete**: Ready for implementation.
