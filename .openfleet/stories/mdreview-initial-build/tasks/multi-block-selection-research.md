# Multi-Block Selection Research

**Author**: Athena (Scout)
**Date**: 2025-01-06
**Story**: mdreview-initial-build
**Task**: Implement click-and-drag multi-block selection for commenting

---

## 1. Problem Statement

Users need to select multiple consecutive blocks (like GitHub's multi-line selection) to leave comments spanning multiple markdown elements. The current implementation only supports single-block commenting.

**Target UX:**
1. Click on a block -> that block highlights blue (selected)
2. Drag to another block -> all blocks from start to end highlight blue
3. Release mouse -> comment modal opens for the entire range (e.g., "Lines 3-15")

---

## 2. Current Implementation Analysis

### Key Files

| File | Role |
|------|------|
| `commentable-block.tsx` | Wraps each markdown block with hover/click handlers |
| `markdown-viewer.tsx` | Renders markdown with position tracking via `node.position` |
| `review-client.tsx` | Manages `pendingLineSelection: BlockSelection \| null` state |

### Current State Structure

```typescript
// types/index.ts
interface BlockSelection {
  startLine: number;
  endLine: number;
  blockContent: string;
}
```

### Current Event Handlers

- `CommentableBlock`: Uses `onMouseEnter`/`onMouseLeave` for hover state only
- Click on "+" button triggers `onAddComment()` -> sets `pendingLineSelection`
- No `onMouseDown`, `onMouseMove`, or `onMouseUp` handlers exist

### Data Attributes Available

Each block has:
- `data-start-line={startLine}`
- `data-end-line={endLine}`

---

## 3. GitHub's Multi-Line Selection Pattern

From GitHub's official changelog (Feb 2020):

> To leave a comment referencing multiple lines, you can either:
> - Click on a line number, hold Shift, click on a second line number and click the "+" button
> - Click and hold to the right of a line number, drag and then release the mouse when you've reached the desired line

### GitHub's Two Interaction Patterns

1. **Shift+Click**: Click first line, Shift+Click second line, click "+"
2. **Click+Drag**: Click and hold, drag to destination, release

Both patterns are valuable. For MDReview, we'll implement the **Click+Drag** pattern as the primary method (more intuitive for most users).

---

## 4. Recommended Implementation Pattern

Based on research from Josh Wootonn's "Drag to Select" article and analysis of similar implementations.

### 4.1 State Structure

```typescript
// In MarkdownViewer or ReviewClient
interface SelectionState {
  isSelecting: boolean;           // Is a drag in progress?
  anchorBlockIndex: number | null; // Index of first clicked block
  focusBlockIndex: number | null;  // Index of current hovered block during drag
}

// Derive selected range from state
const selectedRange = useMemo(() => {
  if (anchorBlockIndex === null || focusBlockIndex === null) return null;
  
  const start = Math.min(anchorBlockIndex, focusBlockIndex);
  const end = Math.max(anchorBlockIndex, focusBlockIndex);
  
  return { start, end };
}, [anchorBlockIndex, focusBlockIndex]);
```

### 4.2 Key Insight: Use Block Indices, Not Line Numbers

Track selection by **block index** (0, 1, 2...) rather than line numbers. This simplifies:
- Finding blocks in between (just iterate indices)
- Handling up vs down selection (just `Math.min`/`Math.max`)
- Visual highlighting (CSS by index)

Line numbers are only computed when opening the modal.

### 4.3 Event Flow

```
User clicks block -> onPointerDown
  - Set isSelecting = true
  - Set anchorBlockIndex = clicked block index
  - Call setPointerCapture() to prevent hover events on other elements

User drags -> onPointerMove (on container)
  - If not isSelecting, return
  - Find block under cursor via document.elementFromPoint()
  - Update focusBlockIndex

User releases -> onPointerUp
  - If isSelecting:
    - Compute final selection (startLine, endLine from block indices)
    - Open comment modal
  - Reset selection state
```

### 4.4 Key Techniques

1. **`setPointerCapture()`**: Prevents hover styles from firing during drag
2. **`document.elementFromPoint()`**: Find which block is under cursor during drag
3. **`data-block-index`**: Add index attribute to each CommentableBlock
4. **Threshold before drag**: Wait for 10px movement before considering it a drag (prevents click from being drag)

---

## 5. State Management Location

**Recommendation: Lift selection state to `MarkdownViewer`**

Reasoning:
- `MarkdownViewer` already has access to all blocks and their positions
- Selection is view-level concern, not app-level
- Keeps `ReviewClient` focused on thread/review state

```typescript
// markdown-viewer.tsx
export function MarkdownViewer({...}) {
  // Selection state
  const [selectionState, setSelectionState] = useState<SelectionState>({
    isSelecting: false,
    anchorBlockIndex: null,
    focusBlockIndex: null,
  });
  
  // Computed selection range
  const selectedRange = useMemo(() => {...}, [selectionState]);
  
  // Handler to start selection
  const handleBlockPointerDown = useCallback((blockIndex: number, e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectionState({
      isSelecting: true,
      anchorBlockIndex: blockIndex,
      focusBlockIndex: blockIndex,
    });
  }, []);
  
  // Container pointer move handler
  const handleContainerPointerMove = useCallback((e: PointerEvent) => {
    if (!selectionState.isSelecting) return;
    
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const blockEl = element?.closest('[data-block-index]');
    if (blockEl) {
      const index = parseInt(blockEl.getAttribute('data-block-index') || '-1');
      if (index >= 0) {
        setSelectionState(prev => ({ ...prev, focusBlockIndex: index }));
      }
    }
  }, [selectionState.isSelecting]);
  
  // Handler to end selection
  const handleContainerPointerUp = useCallback(() => {
    if (selectionState.isSelecting && selectedRange) {
      // Compute line range from selected blocks
      const startLine = blocks[selectedRange.start].startLine;
      const endLine = blocks[selectedRange.end].endLine;
      const blockContent = getContentForRange(selectedRange.start, selectedRange.end);
      
      onLineClick({ startLine, endLine, blockContent });
    }
    
    setSelectionState({
      isSelecting: false,
      anchorBlockIndex: null,
      focusBlockIndex: null,
    });
  }, [selectionState, selectedRange, blocks, onLineClick]);
}
```

---

## 6. Visual Feedback

### 6.1 CSS Classes for Selection States

```css
/* Block in selection range during drag */
.block-selecting {
  background-color: rgb(59 130 246 / 0.1); /* blue-500/10 */
  outline: 2px solid rgb(59 130 246 / 0.3);
}

/* Single block hover (existing) */
.block-hovered {
  background-color: rgb(59 130 246 / 0.05); /* blue-50 */
}
```

### 6.2 Highlight Logic in CommentableBlock

```tsx
function CommentableBlock({
  blockIndex,
  isInSelectionRange,  // NEW: computed from selectedRange
  isSelecting,         // NEW: global selection state
  ...
}) {
  return (
    <div
      className={cn(
        "relative rounded-sm transition-colors -mx-2 px-2",
        // Selection range highlight (takes precedence)
        isInSelectionRange && "bg-blue-100 dark:bg-blue-900/30",
        // Normal hover (only when not selecting)
        !isSelecting && isHovered && !hasThread && "bg-blue-50 dark:bg-blue-900/20",
        // Thread highlight
        hasThread && "bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400",
        isActive && "bg-yellow-100 dark:bg-yellow-900/40",
      )}
      data-block-index={blockIndex}
      data-start-line={startLine}
      data-end-line={endLine}
      onPointerDown={(e) => onPointerDown?.(blockIndex, e)}
      onMouseEnter={() => !isSelecting && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {...}
    </div>
  );
}
```

---

## 7. Edge Cases

### 7.1 Dragging Up vs Down

Handled by using `Math.min`/`Math.max` when computing range:
```typescript
const start = Math.min(anchorBlockIndex, focusBlockIndex);
const end = Math.max(anchorBlockIndex, focusBlockIndex);
```

### 7.2 Single Block Selection (Click Without Drag)

If `anchorBlockIndex === focusBlockIndex` after release, still valid - opens modal for single block.

**Optional Enhancement**: Add drag threshold (10px) to distinguish click from drag:
```typescript
const handlePointerMove = (e) => {
  if (!isSelecting) return;
  
  // Calculate distance from start position
  const distance = Math.sqrt(
    Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2)
  );
  
  // Only update focusBlockIndex if dragged beyond threshold
  if (distance < 10) return;
  
  // ... update focusBlockIndex
};
```

### 7.3 Canceling Selection (Escape Key)

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectionState.isSelecting) {
      setSelectionState({
        isSelecting: false,
        anchorBlockIndex: null,
        focusBlockIndex: null,
      });
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [selectionState.isSelecting]);
```

### 7.4 Selection Across Scrollable Area

If container is scrollable, selection should work during scroll. The `elementFromPoint` approach handles this naturally since it uses viewport coordinates.

### 7.5 Prevent Text Selection During Drag

Add `user-select: none` to container during drag:
```tsx
<div
  className={cn("markdown-viewer", isSelecting && "select-none")}
  style={{ userSelect: isSelecting ? 'none' : 'auto' }}
>
```

---

## 8. Implementation Order

1. **Add `blockIndex` tracking** to MarkdownViewer
2. **Add selection state** (`isSelecting`, `anchorBlockIndex`, `focusBlockIndex`)
3. **Add `onPointerDown` handler** to CommentableBlock
4. **Add `onPointerMove`/`onPointerUp` handlers** to MarkdownViewer container
5. **Update CommentableBlock styling** to show selection range highlight
6. **Add Escape key handler** to cancel selection
7. **Compute line range** on selection complete -> call `onLineClick`
8. **Add drag threshold** (optional polish)

---

## 9. Files to Modify

| File | Changes |
|------|---------|
| `markdown-viewer.tsx` | Add selection state, pointer event handlers, compute block indices |
| `commentable-block.tsx` | Add `blockIndex` prop, `onPointerDown` handler, selection highlight styles |
| `types/index.ts` | No changes needed - `BlockSelection` already supports ranges |
| `review-client.tsx` | No changes needed - `pendingLineSelection` already handles ranges |

---

## 10. Alternative: Shift+Click Pattern

If click+drag proves problematic, implement Shift+Click as fallback:

```typescript
const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

const handleBlockClick = (blockIndex: number, e: MouseEvent) => {
  if (e.shiftKey && lastClickedIndex !== null) {
    // Shift+Click: select range from lastClickedIndex to blockIndex
    const start = Math.min(lastClickedIndex, blockIndex);
    const end = Math.max(lastClickedIndex, blockIndex);
    openModalForRange(start, end);
    setLastClickedIndex(null);
  } else {
    // Normal click: set anchor point
    setLastClickedIndex(blockIndex);
  }
};
```

---

## 11. Library Alternatives Considered

If a custom implementation proves too complex, these libraries could be used:

| Library | Suitability | Notes |
|---------|-------------|-------|
| **react-selectable-fast** | Excellent | Bounding box collision, touch support, scroll-aware |
| **react-drag-to-select** | Excellent | Modern hooks API, RAF-throttled updates |
| react-selection-highlighter | Limited | Text ranges only, not DOM elements |
| AG Grid / TanStack Table | Not suitable | Grid/table specific |

**Recommendation**: Implement custom solution first (simpler for our linear block model). Fall back to `react-selectable-fast` if complex edge cases arise.

---

## 12. References

- GitHub multi-line comments: https://github.blog/changelog/2020-02-21-a-new-interaction-for-multi-line-pull-request-comments/
- Josh Wootonn "Drag to Select": https://www.joshuawootonn.com/react-drag-to-select
- `setPointerCapture` MDN: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
- `elementFromPoint` MDN: https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint
- react-selectable-fast: https://github.com/valerybugakov/react-selectable-fast
- react-drag-to-select: https://github.com/AirLabsTeam/react-drag-to-select
- react-diff-view: https://github.com/otakustay/react-diff-view

---

## 13. Summary for Engineer

**Core approach**: Track selection by block index, not line numbers. Use pointer events with `setPointerCapture()` to handle drag. Use `elementFromPoint()` to find hovered block during drag. Compute line numbers only when opening modal.

**Key state**:
```typescript
{
  isSelecting: boolean,
  anchorBlockIndex: number | null,  // First clicked block
  focusBlockIndex: number | null,   // Current block under cursor
}
```

**Key handlers**:
- `onPointerDown` on CommentableBlock -> start selection, call `setPointerCapture()`
- `onPointerMove` on container -> update selection range  
- `onPointerUp` on container -> finalize and open modal, call `releasePointerCapture()`

**Visual feedback**: Blue highlight on all blocks in range during drag.

**Edge cases**: Up/down drag (Math.min/max), single block click, Escape to cancel, prevent text selection.

**Critical techniques**:
1. `setPointerCapture()` - prevents hover events on other elements during drag
2. `user-select: none` - prevents text selection during drag
3. Drag threshold (10px) - distinguishes click from drag
4. `Math.min/max` normalization - handles up vs down drag direction
