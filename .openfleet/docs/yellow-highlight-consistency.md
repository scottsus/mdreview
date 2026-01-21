# Yellow Highlight Consistency Fix

**Date**: 2026-01-21  
**Story**: `yellow-highlight-consistency`  
**Commit**: `a2f425c`

## Problem

Active (selected) comment threads were showing inconsistent highlighting colors:
- **Code blocks**: Yellow highlight ✅ (correct)
- **Headers, paragraphs, lists, etc.**: Purple highlight ❌ (incorrect)

This created visual confusion for users when selecting threads.

## Root Cause

The `getHighlightClasses()` function in `highlight-styles.ts` accepts an optional `activeThreadHighlightVariant` parameter:
- When set to `"yellow"` → renders yellow background
- When unset → defaults to `"violet"` → renders purple background

**Code blocks** (`code-block-with-lines.tsx`) explicitly passed `activeThreadHighlightVariant: "yellow"`, but **other blocks** (`commentable-block.tsx`) did not pass this parameter.

## Solution

Added a single parameter to the `getHighlightClasses()` call in `CommentableBlock`:

```tsx
const highlightClasses = getHighlightClasses({
  showBlueHighlight,
  isSelecting,
  isHovered,
  hasThread,
  isActive,
  activeThreadHighlightVariant: "yellow", // ← Added this line
});
```

## Impact

- ✅ All block types now show consistent yellow highlighting for active threads
- ✅ Zero breaking changes
- ✅ No type modifications needed
- ✅ Single-line change

## Files Changed

- `apps/web/src/components/review/commentable-block.tsx` (+1 line)

## Git Tree

```
main
 │
 └──► feat/yellow-highlight-consistency
       │
       └──► feat/yellow-highlight-consistency--uniform-yellow-highlight
             └── a2f425c fix: use yellow highlight for active threads in all blocks
             ╰─────● merged to main
```

## Lessons Learned

1. **Visual consistency is critical** - Small UI inconsistencies can create confusion
2. **Look for patterns** - When one component does something right, apply it everywhere
3. **Simple fixes are still important** - A one-line change can significantly improve UX
4. **Document thoroughly** - Even trivial fixes benefit from proper SPARR documentation
