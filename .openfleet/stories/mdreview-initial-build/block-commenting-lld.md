# Block-Level Commenting - Low Level Design

**Created**: 2025-01-06
**Task**: Implement block-level commenting on rendered markdown
**Based on**: `line-highlight-research.md` (Scout's findings)

---

## Problem Statement

The current `MarkdownViewer` implementation splits markdown by newlines and renders each line separately, which breaks multi-line elements like tables, code blocks, and lists. The goal is to:

1. Render markdown correctly (tables, code blocks work)
2. Allow commenting on block elements (p, h1-h6, table, pre, ul, ol, blockquote)
3. Show source line ranges (L5 or L5-9) for each block
4. Display hover "+" button for adding comments
5. Highlight blocks with threads (yellow background + left border)
6. Click highlighted blocks to view thread in sidebar

---

## Solution Overview

Use ReactMarkdown's built-in `rawSourcePos={true}` prop to pass source position info directly to custom components. Wrap block elements with a `CommentableBlock` component that handles hover interactions, highlighting, and click events.

**Key insight from research**: No custom rehype plugin needed - `rawSourcePos` provides `sourcePosition` prop to all custom components.

---

## Implementation Steps

### Step 1: Update Types (`apps/web/src/types/index.ts`)

Update `LineSelection` to support block ranges with `startLine` and `endLine`.

```typescript
// BEFORE
export interface LineSelection {
  lineNumber: number;
  lineContent: string;
}

// AFTER
export interface BlockSelection {
  startLine: number;
  endLine: number;
  blockContent: string;
}

// Keep LineSelection as alias for backward compatibility if needed
export type LineSelection = BlockSelection;
```

**Test**: TypeScript compiles without errors.

---

### Step 2: Create `CommentableBlock` Component (`apps/web/src/components/review/commentable-block.tsx`)

New file. This wrapper component handles all block interaction logic.

```tsx
"use client";

import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import React, { useState } from "react";

interface CommentableBlockProps {
  startLine: number;
  endLine: number;
  hasThread: boolean;
  isActive: boolean;
  onAddComment: () => void;
  onClick: () => void;
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export function CommentableBlock({
  startLine,
  endLine,
  hasThread,
  isActive,
  onAddComment,
  onClick,
  children,
  as: Component = "div",
}: CommentableBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  const lineLabel = startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`;

  return (
    <div
      className={cn(
        "relative group -mx-4 px-4 py-1 transition-colors",
        hasThread && "bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400",
        isActive && "bg-yellow-100 dark:bg-yellow-900/40",
        hasThread && "cursor-pointer"
      )}
      data-start-line={startLine}
      data-end-line={endLine}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={hasThread ? onClick : undefined}
    >
      {/* Gutter with line number and add button */}
      <div
        className={cn(
          "absolute left-0 top-0 w-12 h-full flex items-start pt-1",
          "text-xs text-muted-foreground select-none"
        )}
      >
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddComment();
            }}
            className="absolute left-1 top-1 p-0.5 rounded hover:bg-primary/10 text-primary"
            title="Add comment"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="absolute right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {lineLabel}
        </span>
      </div>

      {/* Content with left padding for gutter */}
      <div className="pl-10">
        {children}
      </div>
    </div>
  );
}
```

**Test**: Import in a test page and render with mock props. Verify hover shows "+" and line label.

---

### Step 3: Rewrite `MarkdownViewer` (`apps/web/src/components/review/markdown-viewer.tsx`)

Complete rewrite using `rawSourcePos={true}` and custom components.

```tsx
"use client";

import { cn } from "@/lib/utils";
import { BlockSelection, ThreadResponse } from "@/types";
import React, { useCallback, useMemo, useRef } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CommentableBlock } from "./commentable-block";

interface MarkdownViewerProps {
  content: string;
  threads: ThreadResponse[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onLineClick: (selection: BlockSelection) => void;
}

export function MarkdownViewer({
  content,
  threads,
  activeThreadId,
  onThreadClick,
  onLineClick,
}: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Build map: line number -> thread IDs for quick lookup
  const threadsByLine = useMemo(() => {
    const map = new Map<number, string[]>();
    threads.forEach((thread) => {
      for (let line = thread.startLine; line <= thread.endLine; line++) {
        const existing = map.get(line) || [];
        existing.push(thread.id);
        map.set(line, existing);
      }
    });
    return map;
  }, [threads]);

  // Check if a line range has any threads
  const getThreadsForRange = useCallback(
    (startLine: number, endLine: number): string[] => {
      const threadIds = new Set<string>();
      for (let line = startLine; line <= endLine; line++) {
        const ids = threadsByLine.get(line) || [];
        ids.forEach((id) => threadIds.add(id));
      }
      return Array.from(threadIds);
    },
    [threadsByLine]
  );

  // Factory for creating wrapped block components
  const createBlockComponent = useCallback(
    (Tag: keyof JSX.IntrinsicElements) => {
      const BlockComponent = ({ node, children, ...props }: any) => {
        const position = node?.position;
        const startLine = position?.start?.line;
        const endLine = position?.end?.line;

        // If no position info, render as-is (shouldn't happen with rawSourcePos)
        if (!startLine || !endLine) {
          return <Tag {...props}>{children}</Tag>;
        }

        const threadIds = getThreadsForRange(startLine, endLine);
        const hasThread = threadIds.length > 0;
        const isActive = activeThreadId !== null && threadIds.includes(activeThreadId);

        // Get raw text content for the block
        const getTextContent = (node: any): string => {
          if (typeof node === "string") return node;
          if (node?.props?.children) {
            const children = node.props.children;
            if (typeof children === "string") return children;
            if (Array.isArray(children)) return children.map(getTextContent).join("");
          }
          if (Array.isArray(node)) return node.map(getTextContent).join("");
          return "";
        };
        const blockContent = getTextContent(children);

        return (
          <CommentableBlock
            startLine={startLine}
            endLine={endLine}
            hasThread={hasThread}
            isActive={isActive}
            onAddComment={() =>
              onLineClick({
                startLine,
                endLine,
                blockContent: blockContent.slice(0, 200),
              })
            }
            onClick={() => {
              if (threadIds[0]) {
                onThreadClick(threadIds[0]);
              }
            }}
          >
            <Tag {...props}>{children}</Tag>
          </CommentableBlock>
        );
      };
      BlockComponent.displayName = `Block${Tag}`;
      return BlockComponent;
    },
    [activeThreadId, getThreadsForRange, onLineClick, onThreadClick]
  );

  // Memoize components to prevent re-creation on every render
  const components: Components = useMemo(
    () => ({
      p: createBlockComponent("p"),
      h1: createBlockComponent("h1"),
      h2: createBlockComponent("h2"),
      h3: createBlockComponent("h3"),
      h4: createBlockComponent("h4"),
      h5: createBlockComponent("h5"),
      h6: createBlockComponent("h6"),
      pre: createBlockComponent("pre"),
      table: createBlockComponent("table"),
      ul: createBlockComponent("ul"),
      ol: createBlockComponent("ol"),
      blockquote: createBlockComponent("blockquote"),
      hr: createBlockComponent("hr"),
    }),
    [createBlockComponent]
  );

  return (
    <div ref={containerRef} className="markdown-viewer">
      <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-20">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rawSourcePos={true}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

**Test**: 
1. Render a markdown doc with tables, code blocks, lists
2. Verify all elements render correctly
3. Hover over blocks and verify "+" button appears
4. Verify line numbers show on hover

---

### Step 4: Update `CommentModal` (`apps/web/src/components/review/comment-modal.tsx`)

Minor updates to support block range display.

```tsx
// Change prop type
import { BlockSelection } from "@/types";

interface CommentModalProps {
  isOpen: boolean;
  lineSelection: BlockSelection | null;  // Was LineSelection
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}

// Update the display in DialogTitle (around line 69-76)
<DialogTitle className="flex items-center gap-2">
  <span>Add comment</span>
  {lineSelection && (
    <span className="text-sm font-normal text-muted-foreground">
      {lineSelection.startLine === lineSelection.endLine
        ? `Line ${lineSelection.startLine}`
        : `Lines ${lineSelection.startLine}-${lineSelection.endLine}`}
    </span>
  )}
</DialogTitle>

// Update the code preview (around line 79-86)
{lineSelection && (
  <div className="px-3 py-2 bg-muted/50 rounded-md border text-sm">
    <code className="text-xs text-muted-foreground">
      {lineSelection.blockContent.slice(0, 100)}
      {lineSelection.blockContent.length > 100 && "..."}
    </code>
  </div>
)}
```

**Test**: Open comment modal, verify it shows correct line range.

---

### Step 5: Update `ReviewClient` (`apps/web/src/components/review/review-client.tsx`)

Update state type and thread creation logic.

```tsx
// Change import
import { BlockSelection, ReviewResponse, ThreadResponse } from "@/types";

// Update state type (around line 19-20)
const [pendingLineSelection, setPendingLineSelection] =
  useState<BlockSelection | null>(null);

// Update handler type (around line 22-24)
const handleLineClick = useCallback((selection: BlockSelection) => {
  setPendingLineSelection(selection);
}, []);

// Update thread creation (around line 81-104)
const handleCreateThread = useCallback(
  async (body: string) => {
    if (!pendingLineSelection) return;

    const response = await fetch(`/api/reviews/${review.id}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startLine: pendingLineSelection.startLine,
        endLine: pendingLineSelection.endLine,
        selectedText: pendingLineSelection.blockContent,
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
  [pendingLineSelection, review.id, handleThreadCreated]
);
```

**Test**: Create a comment on a multi-line block. Verify the thread shows correct start/end lines in sidebar.

---

### Step 6: Update `CommentSidebar` Empty State (`apps/web/src/components/review/comment-sidebar.tsx`)

Minor text update.

```tsx
// Around line 74-78
{threads.length === 0 && (
  <p className="text-sm text-muted-foreground text-center py-8">
    Hover over any block and click + to add a comment
  </p>
)}
```

**Test**: View page with no threads. Verify updated empty state message.

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/web/src/types/index.ts` | Modify | Add `BlockSelection` interface, update `LineSelection` |
| `apps/web/src/components/review/commentable-block.tsx` | **New** | Block wrapper with hover/highlight logic |
| `apps/web/src/components/review/markdown-viewer.tsx` | Rewrite | Use `rawSourcePos`, custom components |
| `apps/web/src/components/review/comment-modal.tsx` | Modify | Support line ranges in display |
| `apps/web/src/components/review/review-client.tsx` | Modify | Update types and thread creation |
| `apps/web/src/components/review/comment-sidebar.tsx` | Modify | Update empty state text |

---

## Dependencies

No new dependencies needed! `rawSourcePos` is built into react-markdown.

---

## Testing Checklist

- [ ] Tables render as single block (not broken into rows)
- [ ] Code blocks render with syntax highlighting
- [ ] Lists render properly (nested items work)
- [ ] Hover shows "+" button on any block
- [ ] Hover shows line range (L5 or L5-9)
- [ ] Clicking "+" opens comment modal with correct lines
- [ ] Creating comment highlights the block in yellow
- [ ] Clicking highlighted block selects thread in sidebar
- [ ] Thread card shows correct line range
- [ ] Multi-line blocks (tables, code) show correct line range

---

## Visual Behavior

1. **Default state**: Clean rendered markdown, no gutter visible
2. **Hover over block**: 
   - "+" button appears at left edge
   - Line range (e.g., "L5-12") fades in
   - Subtle highlight optional
3. **Block with thread**:
   - Yellow background (`bg-yellow-50`)
   - Left border (`border-l-2 border-yellow-400`)
   - Cursor changes to pointer
4. **Active thread block**:
   - Darker yellow (`bg-yellow-100`)
   - Ring or border emphasis

---

## Future Enhancements (Out of Scope)

1. **Code block line-level comments**: Parse `<pre>` blocks specially to allow commenting on specific lines within code
2. **Table row comments**: Parse tables to allow row-level commenting
3. **Text selection within blocks**: Allow selecting specific text to create more granular comments

---

## Multi-Block Selection Implementation

**Added**: 2025-01-06
**Based on**: `tasks/multi-block-selection-research.md` (Scout's findings)

This extends the block commenting feature to support click-and-drag selection across multiple consecutive blocks, similar to GitHub's multi-line selection in code reviews.

---

### Problem Statement

Users need to select multiple consecutive blocks to leave comments spanning multiple markdown elements. Currently, clicking the "+" button only comments on a single block. We want:

1. **Click on block** → that block highlights blue (selected)
2. **Drag to another block** → all blocks from start to end highlight blue
3. **Release mouse** → comment modal opens for the entire range (Lines X-Y)
4. **Escape key** → cancels selection
5. **Prevent text selection** during drag

---

### Key Design Decisions

1. **Track by block index, not line numbers**: Simplifies range computation (just `Math.min`/`Math.max`)
2. **State lives in `MarkdownViewer`**: Selection is a view concern, not app state
3. **Use `setPointerCapture()`**: Prevents hover events on other elements during drag
4. **Use `elementFromPoint()`**: Find block under cursor during drag (works across scroll)

---

### Step 1: Add Selection State to `MarkdownViewer`

Add new state and refs for tracking selection.

**File**: `apps/web/src/components/review/markdown-viewer.tsx`

```typescript
// Add to existing imports
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Add new interface (inside file, near top)
interface SelectionState {
  isSelecting: boolean;
  anchorBlockIndex: number | null;
  focusBlockIndex: number | null;
}

// Add new state inside MarkdownViewer component (after containerRef)
const [selectionState, setSelectionState] = useState<SelectionState>({
  isSelecting: false,
  anchorBlockIndex: null,
  focusBlockIndex: null,
});

// Add ref to store blocks info for line number lookup
const blocksRef = useRef<Array<{ startLine: number; endLine: number }>>([]);

// Computed selection range
const selectedRange = useMemo(() => {
  const { anchorBlockIndex, focusBlockIndex } = selectionState;
  if (anchorBlockIndex === null || focusBlockIndex === null) return null;
  
  return {
    start: Math.min(anchorBlockIndex, focusBlockIndex),
    end: Math.max(anchorBlockIndex, focusBlockIndex),
  };
}, [selectionState.anchorBlockIndex, selectionState.focusBlockIndex]);
```

**Test**: App compiles. No visual change yet.

---

### Step 2: Add Pointer Event Handlers in `MarkdownViewer`

Add handlers for starting, updating, and ending selection.

**File**: `apps/web/src/components/review/markdown-viewer.tsx`

```typescript
// Handler to start selection (called from CommentableBlock)
const handleBlockPointerDown = useCallback(
  (blockIndex: number, e: React.PointerEvent) => {
    // Capture pointer to receive all events until release
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    setSelectionState({
      isSelecting: true,
      anchorBlockIndex: blockIndex,
      focusBlockIndex: blockIndex,
    });
  },
  []
);

// Handler for pointer move on container
const handleContainerPointerMove = useCallback(
  (e: React.PointerEvent) => {
    if (!selectionState.isSelecting) return;

    const element = document.elementFromPoint(e.clientX, e.clientY);
    const blockEl = element?.closest("[data-block-index]") as HTMLElement | null;
    
    if (blockEl) {
      const index = parseInt(blockEl.dataset.blockIndex || "-1", 10);
      if (index >= 0 && index !== selectionState.focusBlockIndex) {
        setSelectionState((prev) => ({ ...prev, focusBlockIndex: index }));
      }
    }
  },
  [selectionState.isSelecting, selectionState.focusBlockIndex]
);

// Handler to end selection
const handleContainerPointerUp = useCallback(() => {
  if (!selectionState.isSelecting || !selectedRange) {
    setSelectionState({
      isSelecting: false,
      anchorBlockIndex: null,
      focusBlockIndex: null,
    });
    return;
  }

  // Get line numbers from blocksRef
  const blocks = blocksRef.current;
  const startBlock = blocks[selectedRange.start];
  const endBlock = blocks[selectedRange.end];

  if (startBlock && endBlock) {
    // Collect content from all blocks in range
    const blockContents: string[] = [];
    for (let i = selectedRange.start; i <= selectedRange.end; i++) {
      const blockEl = containerRef.current?.querySelector(
        `[data-block-index="${i}"]`
      );
      if (blockEl) {
        blockContents.push(blockEl.textContent?.slice(0, 100) || "");
      }
    }

    onLineClick({
      startLine: startBlock.startLine,
      endLine: endBlock.endLine,
      blockContent: blockContents.join("\n").slice(0, 200),
    });
  }

  // Reset selection state
  setSelectionState({
    isSelecting: false,
    anchorBlockIndex: null,
    focusBlockIndex: null,
  });
}, [selectionState.isSelecting, selectedRange, onLineClick]);
```

**Test**: Handlers defined. No visual change yet.

---

### Step 3: Add Escape Key Handler

Cancel selection when Escape is pressed.

**File**: `apps/web/src/components/review/markdown-viewer.tsx`

```typescript
// Add useEffect for Escape key (after the handlers)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && selectionState.isSelecting) {
      setSelectionState({
        isSelecting: false,
        anchorBlockIndex: null,
        focusBlockIndex: null,
      });
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [selectionState.isSelecting]);
```

**Test**: When selecting, press Escape → selection clears.

---

### Step 4: Update Container JSX

Add pointer event handlers and prevent text selection during drag.

**File**: `apps/web/src/components/review/markdown-viewer.tsx`

Replace the return statement:

```tsx
return (
  <div
    ref={containerRef}
    className={cn(
      "markdown-viewer pl-10",
      selectionState.isSelecting && "select-none"
    )}
    onPointerMove={handleContainerPointerMove}
    onPointerUp={handleContainerPointerUp}
  >
    <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-20">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  </div>
);
```

Add import for `cn`:
```typescript
import { cn } from "@/lib/utils";
```

**Test**: Container handles pointer events. Text selection disabled during drag.

---

### Step 5: Update Block Component Factory

Pass block index and selection state to CommentableBlock.

**File**: `apps/web/src/components/review/markdown-viewer.tsx`

Update `createBlockComponent`:

```typescript
// Add block index counter ref (near top of component)
const blockIndexRef = useRef(0);

// Reset counter before each render via useMemo
useMemo(() => {
  blockIndexRef.current = 0;
}, [content]);

const createBlockComponent = useCallback(
  (Tag: BlockTag) => {
    const BlockComponent: React.FC<BlockComponentProps> = ({
      node,
      children,
      ...rest
    }) => {
      const position = node?.position;
      const startLine = position?.start?.line;
      const endLine = position?.end?.line;

      if (!startLine || !endLine) {
        return <Tag {...rest}>{children}</Tag>;
      }

      // Assign block index (increments for each block rendered)
      const blockIndex = blockIndexRef.current++;
      
      // Store in blocksRef for later lookup
      blocksRef.current[blockIndex] = { startLine, endLine };

      const threadIds = getThreadsForRange(startLine, endLine);
      const hasThread = threadIds.length > 0;
      const isActive =
        activeThreadId !== null && threadIds.includes(activeThreadId);
      
      // Check if this block is in the current selection range
      const isInSelectionRange =
        selectedRange !== null &&
        blockIndex >= selectedRange.start &&
        blockIndex <= selectedRange.end;

      const blockContent = getTextContent(children);

      return (
        <CommentableBlock
          blockIndex={blockIndex}
          startLine={startLine}
          endLine={endLine}
          hasThread={hasThread}
          isActive={isActive}
          isInSelectionRange={isInSelectionRange}
          isSelecting={selectionState.isSelecting}
          onPointerDown={(e) => handleBlockPointerDown(blockIndex, e)}
          onAddComment={() =>
            onLineClick({
              startLine,
              endLine,
              blockContent: blockContent.slice(0, 200),
            })
          }
          onClick={() => {
            if (threadIds[0]) {
              onThreadClick(threadIds[0]);
            }
          }}
        >
          <Tag {...rest}>{children}</Tag>
        </CommentableBlock>
      );
    };
    BlockComponent.displayName = `Block${Tag}`;
    return BlockComponent;
  },
  [
    activeThreadId,
    getTextContent,
    getThreadsForRange,
    handleBlockPointerDown,
    onLineClick,
    onThreadClick,
    selectedRange,
    selectionState.isSelecting,
  ]
);
```

**Note**: The block index counter reset approach using `useMemo` ensures indices stay consistent across renders.

**Test**: Blocks get sequential indices. Selection range computed correctly.

---

### Step 6: Update `CommentableBlock` Props and Styling

Add new props for selection state and pointer events.

**File**: `apps/web/src/components/review/commentable-block.tsx`

```tsx
"use client";

import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import React, { useState } from "react";

interface CommentableBlockProps {
  blockIndex: number;
  startLine: number;
  endLine: number;
  hasThread: boolean;
  isActive: boolean;
  isInSelectionRange: boolean;
  isSelecting: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onAddComment: () => void;
  onClick: () => void;
  children: React.ReactNode;
}

export function CommentableBlock({
  blockIndex,
  startLine,
  endLine,
  hasThread,
  isActive,
  isInSelectionRange,
  isSelecting,
  onPointerDown,
  onAddComment,
  onClick,
  children,
}: CommentableBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  const lineLabel =
    startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`;

  return (
    <div
      className={cn(
        "relative rounded-sm transition-colors -mx-2 px-2",
        // Selection range highlight (blue) - takes precedence
        isInSelectionRange && "bg-blue-100 dark:bg-blue-900/30 outline outline-2 outline-blue-300 dark:outline-blue-700",
        // Normal hover (only when not selecting and no thread)
        !isSelecting && !isInSelectionRange && isHovered && !hasThread && "bg-blue-50 dark:bg-blue-900/20",
        // Has thread - yellow highlight
        !isInSelectionRange && hasThread && "bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 -ml-2 pl-2",
        // Active thread - darker yellow
        !isInSelectionRange && isActive && "bg-yellow-100 dark:bg-yellow-900/40",
        hasThread && "cursor-pointer"
      )}
      data-block-index={blockIndex}
      data-start-line={startLine}
      data-end-line={endLine}
      onPointerDown={onPointerDown}
      onMouseEnter={() => !isSelecting && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={hasThread ? onClick : undefined}
    >
      {/* Hover controls - positioned to the left */}
      {isHovered && !isSelecting && (
        <div className="absolute -left-8 top-0 flex items-center gap-1 text-xs text-muted-foreground select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddComment();
            }}
            className="p-0.5 rounded hover:bg-primary/10 text-primary"
            title="Add comment"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground/70">{lineLabel}</span>
        </div>
      )}

      {children}
    </div>
  );
}
```

**Key changes**:
- Added `blockIndex`, `isInSelectionRange`, `isSelecting`, `onPointerDown` props
- Blue highlight for blocks in selection range
- Hide hover controls during selection
- Disable hover effect during selection
- Added `data-block-index` attribute for `elementFromPoint()` lookup

**Test**: 
1. Click block → single block highlights blue
2. Drag to another block → all blocks in range highlight blue
3. Release → modal opens with correct line range

---

### Step 7: Fix Block Index Counter Reset Issue

The block index counter needs to be reset properly when content changes or re-renders.

**File**: `apps/web/src/components/review/markdown-viewer.tsx`

A cleaner approach using render key:

```typescript
// Add renderKey state that changes with content
const [renderKey, setRenderKey] = useState(0);

// Reset blocksRef when content changes
useEffect(() => {
  blocksRef.current = [];
  blockIndexRef.current = 0;
  setRenderKey((k) => k + 1);
}, [content]);

// In components useMemo, depend on renderKey
const components: Components = useMemo(
  () => ({
    // ... same as before
  }),
  [createBlockComponent, renderKey]
);
```

**Alternative simpler approach**: Reset counter at start of components creation:

```typescript
// At start of component body
blockIndexRef.current = 0;
blocksRef.current = [];
```

This ensures indices are consistent for each render pass.

**Test**: Verify indices stay sequential (0, 1, 2...) across re-renders.

---

### Complete Modified Files

#### `markdown-viewer.tsx` (Full Updated Version)

```tsx
"use client";

import { cn } from "@/lib/utils";
import { BlockSelection, ThreadResponse } from "@/types";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { Components, ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CommentableBlock } from "./commentable-block";

interface MarkdownViewerProps {
  content: string;
  threads: ThreadResponse[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onLineClick: (selection: BlockSelection) => void;
}

interface SelectionState {
  isSelecting: boolean;
  anchorBlockIndex: number | null;
  focusBlockIndex: number | null;
}

type BlockTag =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "pre"
  | "table"
  | "ul"
  | "ol"
  | "blockquote"
  | "hr";

interface BlockComponentProps extends ExtraProps {
  children?: React.ReactNode;
}

export function MarkdownViewer({
  content,
  threads,
  activeThreadId,
  onThreadClick,
  onLineClick,
}: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<Array<{ startLine: number; endLine: number }>>([]);
  const blockIndexRef = useRef(0);

  const [selectionState, setSelectionState] = useState<SelectionState>({
    isSelecting: false,
    anchorBlockIndex: null,
    focusBlockIndex: null,
  });

  // Reset block tracking on each render
  blockIndexRef.current = 0;
  blocksRef.current = [];

  // Computed selection range
  const selectedRange = useMemo(() => {
    const { anchorBlockIndex, focusBlockIndex } = selectionState;
    if (anchorBlockIndex === null || focusBlockIndex === null) return null;

    return {
      start: Math.min(anchorBlockIndex, focusBlockIndex),
      end: Math.max(anchorBlockIndex, focusBlockIndex),
    };
  }, [selectionState.anchorBlockIndex, selectionState.focusBlockIndex]);

  // Escape key to cancel selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectionState.isSelecting) {
        setSelectionState({
          isSelecting: false,
          anchorBlockIndex: null,
          focusBlockIndex: null,
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectionState.isSelecting]);

  const handleBlockPointerDown = useCallback(
    (blockIndex: number, e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setSelectionState({
        isSelecting: true,
        anchorBlockIndex: blockIndex,
        focusBlockIndex: blockIndex,
      });
    },
    []
  );

  const handleContainerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!selectionState.isSelecting) return;

      const element = document.elementFromPoint(e.clientX, e.clientY);
      const blockEl = element?.closest("[data-block-index]") as HTMLElement | null;

      if (blockEl) {
        const index = parseInt(blockEl.dataset.blockIndex || "-1", 10);
        if (index >= 0 && index !== selectionState.focusBlockIndex) {
          setSelectionState((prev) => ({ ...prev, focusBlockIndex: index }));
        }
      }
    },
    [selectionState.isSelecting, selectionState.focusBlockIndex]
  );

  const handleContainerPointerUp = useCallback(() => {
    if (!selectionState.isSelecting) return;

    if (selectedRange) {
      const blocks = blocksRef.current;
      const startBlock = blocks[selectedRange.start];
      const endBlock = blocks[selectedRange.end];

      if (startBlock && endBlock) {
        const blockContents: string[] = [];
        for (let i = selectedRange.start; i <= selectedRange.end; i++) {
          const blockEl = containerRef.current?.querySelector(
            `[data-block-index="${i}"]`
          );
          if (blockEl) {
            blockContents.push(blockEl.textContent?.slice(0, 100) || "");
          }
        }

        onLineClick({
          startLine: startBlock.startLine,
          endLine: endBlock.endLine,
          blockContent: blockContents.join("\n").slice(0, 200),
        });
      }
    }

    setSelectionState({
      isSelecting: false,
      anchorBlockIndex: null,
      focusBlockIndex: null,
    });
  }, [selectionState.isSelecting, selectedRange, onLineClick]);

  const threadsByLine = useMemo(() => {
    const map = new Map<number, string[]>();
    threads.forEach((thread) => {
      for (let line = thread.startLine; line <= thread.endLine; line++) {
        const existing = map.get(line) || [];
        existing.push(thread.id);
        map.set(line, existing);
      }
    });
    return map;
  }, [threads]);

  const getThreadsForRange = useCallback(
    (startLine: number, endLine: number): string[] => {
      const threadIds = new Set<string>();
      for (let line = startLine; line <= endLine; line++) {
        const ids = threadsByLine.get(line) || [];
        ids.forEach((id) => threadIds.add(id));
      }
      return Array.from(threadIds);
    },
    [threadsByLine]
  );

  const getTextContent = useCallback((node: unknown): string => {
    if (typeof node === "string") return node;
    if (
      node &&
      typeof node === "object" &&
      "props" in node &&
      node.props &&
      typeof node.props === "object" &&
      "children" in node.props
    ) {
      const children = node.props.children;
      if (typeof children === "string") return children;
      if (Array.isArray(children))
        return children.map(getTextContent).join("");
    }
    if (Array.isArray(node)) return node.map(getTextContent).join("");
    return "";
  }, []);

  const createBlockComponent = useCallback(
    (Tag: BlockTag) => {
      const BlockComponent: React.FC<BlockComponentProps> = ({
        node,
        children,
        ...rest
      }) => {
        const position = node?.position;
        const startLine = position?.start?.line;
        const endLine = position?.end?.line;

        if (!startLine || !endLine) {
          return <Tag {...rest}>{children}</Tag>;
        }

        const blockIndex = blockIndexRef.current++;
        blocksRef.current[blockIndex] = { startLine, endLine };

        const threadIds = getThreadsForRange(startLine, endLine);
        const hasThread = threadIds.length > 0;
        const isActive =
          activeThreadId !== null && threadIds.includes(activeThreadId);

        const isInSelectionRange =
          selectedRange !== null &&
          blockIndex >= selectedRange.start &&
          blockIndex <= selectedRange.end;

        const blockContent = getTextContent(children);

        return (
          <CommentableBlock
            blockIndex={blockIndex}
            startLine={startLine}
            endLine={endLine}
            hasThread={hasThread}
            isActive={isActive}
            isInSelectionRange={isInSelectionRange}
            isSelecting={selectionState.isSelecting}
            onPointerDown={(e) => handleBlockPointerDown(blockIndex, e)}
            onAddComment={() =>
              onLineClick({
                startLine,
                endLine,
                blockContent: blockContent.slice(0, 200),
              })
            }
            onClick={() => {
              if (threadIds[0]) {
                onThreadClick(threadIds[0]);
              }
            }}
          >
            <Tag {...rest}>{children}</Tag>
          </CommentableBlock>
        );
      };
      BlockComponent.displayName = `Block${Tag}`;
      return BlockComponent;
    },
    [
      activeThreadId,
      getTextContent,
      getThreadsForRange,
      handleBlockPointerDown,
      onLineClick,
      onThreadClick,
      selectedRange,
      selectionState.isSelecting,
    ]
  );

  const components: Components = useMemo(
    () => ({
      p: createBlockComponent("p") as Components["p"],
      h1: createBlockComponent("h1") as Components["h1"],
      h2: createBlockComponent("h2") as Components["h2"],
      h3: createBlockComponent("h3") as Components["h3"],
      h4: createBlockComponent("h4") as Components["h4"],
      h5: createBlockComponent("h5") as Components["h5"],
      h6: createBlockComponent("h6") as Components["h6"],
      pre: createBlockComponent("pre") as Components["pre"],
      table: createBlockComponent("table") as Components["table"],
      ul: createBlockComponent("ul") as Components["ul"],
      ol: createBlockComponent("ol") as Components["ol"],
      blockquote: createBlockComponent("blockquote") as Components["blockquote"],
      hr: createBlockComponent("hr") as Components["hr"],
    }),
    [createBlockComponent]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "markdown-viewer pl-10",
        selectionState.isSelecting && "select-none"
      )}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
    >
      <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-20">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

#### `commentable-block.tsx` (Full Updated Version)

```tsx
"use client";

import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import React, { useState } from "react";

interface CommentableBlockProps {
  blockIndex: number;
  startLine: number;
  endLine: number;
  hasThread: boolean;
  isActive: boolean;
  isInSelectionRange: boolean;
  isSelecting: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onAddComment: () => void;
  onClick: () => void;
  children: React.ReactNode;
}

export function CommentableBlock({
  blockIndex,
  startLine,
  endLine,
  hasThread,
  isActive,
  isInSelectionRange,
  isSelecting,
  onPointerDown,
  onAddComment,
  onClick,
  children,
}: CommentableBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  const lineLabel =
    startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`;

  return (
    <div
      className={cn(
        "relative rounded-sm transition-colors -mx-2 px-2",
        // Selection range highlight (blue) - highest priority
        isInSelectionRange &&
          "bg-blue-100 dark:bg-blue-900/30 outline outline-2 outline-blue-300 dark:outline-blue-700",
        // Normal hover (only when not selecting and no selection range and no thread)
        !isSelecting &&
          !isInSelectionRange &&
          isHovered &&
          !hasThread &&
          "bg-blue-50 dark:bg-blue-900/20",
        // Has thread - yellow highlight (when not in selection)
        !isInSelectionRange &&
          hasThread &&
          "bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 -ml-2 pl-2",
        // Active thread - darker yellow (when not in selection)
        !isInSelectionRange && isActive && "bg-yellow-100 dark:bg-yellow-900/40",
        hasThread && "cursor-pointer"
      )}
      data-block-index={blockIndex}
      data-start-line={startLine}
      data-end-line={endLine}
      onPointerDown={onPointerDown}
      onMouseEnter={() => !isSelecting && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={hasThread ? onClick : undefined}
    >
      {/* Hover controls - hidden during selection */}
      {isHovered && !isSelecting && (
        <div className="absolute -left-8 top-0 flex items-center gap-1 text-xs text-muted-foreground select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddComment();
            }}
            className="p-0.5 rounded hover:bg-primary/10 text-primary"
            title="Add comment"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground/70">{lineLabel}</span>
        </div>
      )}

      {children}
    </div>
  );
}
```

---

### Testing Checklist

- [ ] **Single block click**: Click block → highlights blue → release → modal opens for that block
- [ ] **Drag down**: Click block 1, drag to block 5 → blocks 1-5 highlight blue → release → modal shows "Lines X-Y"
- [ ] **Drag up**: Click block 5, drag to block 1 → blocks 1-5 highlight blue (same result)
- [ ] **Escape cancels**: Start selecting, press Escape → selection clears, no modal
- [ ] **Text selection disabled**: During drag, text cannot be selected
- [ ] **Hover disabled during drag**: Hover controls don't appear while dragging
- [ ] **Thread highlight preserved**: Existing threads still show yellow when not selected
- [ ] **Works with scroll**: Drag selection works while scrolling the container
- [ ] **Modal shows correct range**: After multi-block selection, modal displays "Lines X-Y" correctly
- [ ] **Thread created correctly**: Created thread spans correct line range

---

### Edge Cases Handled

1. **Drag up vs down**: `Math.min`/`Math.max` ensures correct range regardless of direction
2. **Single click (no drag)**: Still works - opens modal for single block
3. **Pointer leaves container**: `setPointerCapture()` ensures we still receive events
4. **Escape mid-selection**: Cancels cleanly, no stale state
5. **Click on thread block**: Thread click handler still works (only on release without drag)
