# Hydration Mismatch in CodeBlockWithLines: Research Report

**Author**: Athena (Scout)
**Date**: 2025-01-07
**Story**: mdreview-initial-build
**Task**: Fix React hydration mismatch for code line block indices

---

## 1. Problem Statement

The application shows a hydration mismatch error:

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.

data-block-index={200}  (client)
data-block-index="12"   (server)
```

The mismatch occurs in `code-block-with-lines.tsx` at line 178:5 in the `CodeLine` component.

---

## 2. Root Cause Analysis

### 2.1 The Counter Pattern

The codebase uses a ref-based counter to assign sequential block indices:

```tsx
// markdown-viewer.tsx
const blockIndexRef = useRef(0);

// Reset on each render (lines 73-74)
blockIndexRef.current = 0;
blocksRef.current = [];

// Increment during render (lines 286, 389, 429)
const blockIndex = blockIndexRef.current++;
```

This counter increments:
1. In `createBlockComponent` - for each block element (p, h1, table, etc.)
2. In `PreComponent` - for pre elements without code
3. In `CodeBlockWithLines` - for **each code line** via `getNextBlockIndex()` prop

### 2.2 Why Server and Client Differ

| Phase | Counter Behavior | Resulting Index |
|-------|------------------|-----------------|
| Server render | Single render → counter goes 0→12 | `data-block-index="12"` |
| Client initial render | Same → 0→12 | Should match |
| Client re-render | Counter resets to 0, increments again | Accumulates to 200+ |

**The critical issue**: The counter resets (`blockIndexRef.current = 0`) at the top of render, which should work... but:

1. The `createBlockComponent` and `PreComponent` callbacks are wrapped in `useCallback` with dependencies on `selectionState`
2. When `selectionState` changes (user interaction), these callbacks recreate
3. React may call render functions multiple times during reconciliation
4. The counter accumulates across these internal renders

### 2.3 Why suppressHydrationWarning Doesn't Work Here

`suppressHydrationWarning` is applied to `CommentableBlock` (line 67), but:

1. It only suppresses warnings for **that element's direct attributes**
2. `CodeLine` in `code-block-with-lines.tsx` is a **different component** - it doesn't have `suppressHydrationWarning`
3. In React 18+, `suppressHydrationWarning` actually **prevents client reconciliation** of mismatched content, not just warning suppression

---

## 3. Recommended Solution: Position-Based IDs

**Replace the incrementing counter with deterministic, position-based identifiers.**

### 3.1 Core Insight

The markdown parser already provides position information (`node.position.start.line`, `node.position.end.line`). This is:
- **Deterministic** - same on server and client
- **Content-derived** - doesn't depend on render order
- **Stable** - won't change between renders

### 3.2 Solution Architecture

```
Instead of:  blockIndex = 0, 1, 2, 3, 4, 5...  (counter)
Use:         blockId = "L1-L1", "L3-L5", "L7-L7"...  (position-based)
```

For selection tracking, we can still use numeric indices, but they should be:
1. Calculated from position, not from an incrementing counter
2. Or use a `Map<string, number>` to map position-IDs to indices

### 3.3 Code Changes Required

#### File 1: `markdown-viewer.tsx`

**Remove**:
```tsx
// Line 63 - Remove blockIndexRef
const blockIndexRef = useRef(0);

// Lines 73-74 - Remove reset
blockIndexRef.current = 0;
blocksRef.current = [];
```

**Add**: A stable ID generation function and position-to-index mapping:

```tsx
// Generate stable block ID from source position
const getBlockId = (startLine: number, endLine: number): string => 
  `L${startLine}-${endLine}`;

// Track blocks by their stable ID
const blocksMapRef = useRef<Map<string, { index: number; startLine: number; endLine: number }>>(new Map());

// In each render, rebuild the map (deterministic order from markdown content)
blocksMapRef.current = new Map();
let blockCounter = 0;

// Helper to register a block and get its index
const registerBlock = (startLine: number, endLine: number): number => {
  const blockId = getBlockId(startLine, endLine);
  if (!blocksMapRef.current.has(blockId)) {
    blocksMapRef.current.set(blockId, { 
      index: blockCounter++, 
      startLine, 
      endLine 
    });
  }
  return blocksMapRef.current.get(blockId)!.index;
};
```

**Change `createBlockComponent`**:
```tsx
const blockIndex = registerBlock(startLine, endLine);  // Instead of blockIndexRef.current++
```

**Change `PreComponent` for code blocks**:
```tsx
// For CodeBlockWithLines, pass position-based registration
<CodeBlockWithLines
  code={codeContent}
  language={language}
  sourceStartLine={sourceStartLine}
  // Each code line gets a unique position: L{line}-L{line}
  getBlockIndex={(lineNumber) => registerBlock(lineNumber, lineNumber)}
  // ... rest of props
/>
```

#### File 2: `code-block-with-lines.tsx`

**Change the interface**:
```tsx
interface CodeBlockWithLinesProps {
  // ... existing props
  
  // OLD: getNextBlockIndex: () => number;
  // NEW: Position-based index getter
  getBlockIndex: (sourceLine: number) => number;
  
  // OLD: registerBlock: (index: number, startLine: number, endLine: number) => void;
  // NEW: Not needed - registration happens in getBlockIndex
}
```

**Change the render logic**:
```tsx
tokens.forEach((line, lineIndex) => {
  const sourceLine = sourceStartLine + lineIndex;
  const blockIndex = getBlockIndex(sourceLine);  // Deterministic!
  
  elements.push(
    <CodeLine
      key={`line-${sourceLine}`}  // Also use stable key
      blockIndex={blockIndex}
      sourceLine={sourceLine}
      // ... rest of props
    />
  );
});
```

#### File 3: `commentable-block.tsx`

**Remove** `suppressHydrationWarning` (line 67) - it's a band-aid that won't be needed after the fix.

---

## 4. Alternative Solutions Considered

### 4.1 React's `useId()` Hook

```tsx
const blockId = useId();  // SSR-safe unique ID
```

**Pros**: Built into React, guaranteed SSR-safe
**Cons**: 
- Generates opaque IDs like `:r0:`, not semantic
- Still need to track position mapping separately
- Can't correlate multiple elements that should share an ID

**Verdict**: Good for form inputs, not ideal for position-based tracking.

### 4.2 Moving Reset to useEffect

```tsx
useEffect(() => {
  blockIndexRef.current = 0;
  blocksRef.current = [];
}, [content]);
```

**Pros**: Simple change
**Cons**: 
- Counter still increments during render (React may call render multiple times)
- Doesn't solve the fundamental issue of render-order dependency
- Effect timing issues between server and client

**Verdict**: Band-aid, not a proper fix.

### 4.3 Use `useMemo` for Block Registration

```tsx
const blocks = useMemo(() => {
  // Parse content and pre-compute all block positions
  return computeBlocksFromContent(content);
}, [content]);
```

**Pros**: Completely deterministic, computed once per content change
**Cons**: 
- Would need to parse markdown twice (once for positions, once for rendering)
- More complex implementation

**Verdict**: Over-engineered for this use case.

---

## 5. Implementation Checklist

1. **Update `markdown-viewer.tsx`**:
   - [ ] Replace `blockIndexRef` with `blocksMapRef` (Map-based)
   - [ ] Create `getBlockId()` helper function
   - [ ] Create `registerBlock()` function that uses positions
   - [ ] Update `createBlockComponent` to use `registerBlock()`
   - [ ] Update `PreComponent` to use `registerBlock()` for non-code blocks
   - [ ] Update `CodeBlockWithLines` props to pass `getBlockIndex` instead of `getNextBlockIndex`

2. **Update `code-block-with-lines.tsx`**:
   - [ ] Change prop from `getNextBlockIndex` to `getBlockIndex(sourceLine: number)`
   - [ ] Remove `registerBlock` prop (no longer needed)
   - [ ] Update `tokens.forEach` to use position-based index

3. **Update `commentable-block.tsx`**:
   - [ ] Remove `suppressHydrationWarning` attribute

4. **Testing**:
   - [ ] Verify no hydration warnings in browser console
   - [ ] Test multi-block selection still works
   - [ ] Test code line selection still works
   - [ ] Test thread highlighting on blocks and code lines
   - [ ] Test with various markdown content (tables, nested code blocks, etc.)

---

## 6. Potential Edge Cases

1. **Duplicate line ranges**: If two blocks somehow have identical `startLine-endLine`, they'd get the same ID. Unlikely with markdown but consider adding a counter suffix if detected.

2. **Dynamic content**: If markdown content changes while a selection is active, the selected block indices may become stale. Consider clearing selection on content change.

3. **Code blocks spanning many lines**: A 200-line code block creates 200 separate block registrations. Performance should be fine but monitor if issues arise.

---

## 7. Files to Modify Summary

| File | Changes |
|------|---------|
| `apps/web/src/components/review/markdown-viewer.tsx` | Replace counter with position-based ID system |
| `apps/web/src/components/review/code-block-with-lines.tsx` | Update interface and forEach logic |
| `apps/web/src/components/review/commentable-block.tsx` | Remove suppressHydrationWarning |

---

## 8. References

- [Next.js Discussion #75890](https://github.com/vercel/next.js/discussions/75890) - `suppressHydrationWarning` behavior in React 18+
- [React useId Hook](https://react.dev/reference/react/useId) - SSR-safe ID generation
- Line-highlight-research.md (in this story) - Original architecture decisions

---

**End of Research**
