# UI Enhancement Research: GitHub-Style Line-Based Commenting

**Author**: Athena (Scout)
**Date**: 2025-01-06
**Story**: mdreview-initial-build
**Status**: Research Complete

---

## 1. Executive Summary

This research documents the changes needed to transform MDReview's current text-range selection commenting system into a GitHub-style line-based commenting system with a modal comment interface.

**Key Changes Required:**
1. Replace character-offset based selection with line-number based selection
2. Split markdown content into individual line elements with line numbers
3. Add hover interaction for "+" button on line numbers
4. Create GitHub-style comment modal with Write/Preview tabs
5. Update database schema to store line numbers instead of character offsets

---

## 2. Current Implementation Analysis

### 2.1 Component Architecture

```
ReviewClient (review-client.tsx)
├── MarkdownViewer (markdown-viewer.tsx)    ← Main focus for changes
│   └── ReactMarkdown + CSS Highlight API
├── CommentSidebar (comment-sidebar.tsx)     ← Modal replacement
│   └── ThreadCard (thread-card.tsx)
│       └── CommentItem (comment-item.tsx)
└── ReviewActions (review-actions.tsx)
```

### 2.2 Current Data Flow

**Selection → Thread Creation:**
1. User selects text in `MarkdownViewer`
2. `handleMouseUp` captures selection, calculates character offsets
3. `TextSelection` object created: `{ startOffset, endOffset, selectedText, rect }`
4. Floating popup appears with "Add Comment" button
5. Click triggers `onSelectionComplete(selection)`
6. `CommentSidebar` receives `pendingSelection`, shows inline form
7. Thread created via `POST /api/reviews/:id/threads`

**Current TextSelection Interface:**
```typescript
export interface TextSelection {
  startOffset: number;   // Character position in rendered markdown
  endOffset: number;     // Character position in rendered markdown
  selectedText: string;  // The highlighted text
  rect: DOMRect;         // For positioning popup
}
```

### 2.3 Current Highlighting

Uses CSS Custom Highlight API (`::highlight(comment-threads)`):
- Creates DOM `Range` objects from character offsets
- Applies yellow background to highlighted ranges
- Problem: Character offsets can drift if content changes

### 2.4 Database Schema (Current)

```typescript
// threads table
startOffset: integer("start_offset").notNull(),
endOffset: integer("end_offset").notNull(),
selectedText: text("selected_text").notNull(),
```

---

## 3. Proposed Changes

### 3.1 New Line-Based Data Model

**Database Schema Changes:**
```typescript
// threads table - REPLACE offset columns
startLine: integer("start_line").notNull(),
endLine: integer("end_line").notNull(),
// Keep selectedText for display in sidebar
```

**New LineSelection Interface:**
```typescript
export interface LineSelection {
  startLine: number;     // 1-indexed line number
  endLine: number;       // 1-indexed line number (same as start for single line)
  selectedText: string;  // Full text of selected line(s)
}
```

### 3.2 Markdown Viewer Restructure

**Current:** Single `<div>` containing rendered markdown
**Proposed:** Table-like structure with line numbers

```tsx
<div className="markdown-viewer">
  {lines.map((line, index) => (
    <div key={index} className="line-wrapper group" data-line={index + 1}>
      <div className="line-number">
        <button 
          className="add-comment-btn opacity-0 group-hover:opacity-100"
          onClick={() => onLineClick(index + 1)}
        >
          +
        </button>
        <span>{index + 1}</span>
      </div>
      <div className="line-content">
        {renderLineContent(line)}
      </div>
    </div>
  ))}
</div>
```

**Key Challenge:** react-markdown renders to HTML nodes, not line-by-line.

**Solutions:**
1. **Pre-process markdown:** Split raw markdown by `\n`, render each line separately
2. **Post-process HTML:** Parse rendered HTML and wrap each line
3. **Custom renderer:** Use react-markdown's `components` prop to inject line wrappers

**Recommended: Option 1 (Pre-process)**
- Split markdown content by newlines
- Render each line as a separate ReactMarkdown instance
- Handle multi-line elements (code blocks, lists) by detecting and grouping

### 3.3 Line Highlighting

Replace CSS Highlight API with CSS class-based highlighting:

```css
.line-wrapper.has-comment {
  background-color: rgba(250, 204, 21, 0.15);
  border-left: 3px solid #facc15;
}

.line-wrapper.active-comment {
  background-color: rgba(250, 204, 21, 0.3);
}
```

### 3.4 GitHub-Style Comment Modal

**New Component: `CommentModal`**

```tsx
interface CommentModalProps {
  isOpen: boolean;
  lineSelection: LineSelection | null;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
  onStartReview?: () => void;  // For batch review mode (future)
}
```

**Modal Structure:**
```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-lg">
    {/* Header - shows line info */}
    <div className="text-sm text-muted-foreground mb-2">
      Line {lineSelection?.startLine}
      {lineSelection?.endLine !== lineSelection?.startLine && 
        ` - ${lineSelection?.endLine}`}
    </div>
    
    {/* Tabs - Write / Preview */}
    <Tabs defaultValue="write">
      <TabsList>
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <div className="space-y-2">
          {/* Formatting toolbar (stub icons) */}
          <div className="flex gap-1 border-b pb-2">
            <Button variant="ghost" size="icon"><Bold /></Button>
            <Button variant="ghost" size="icon"><Italic /></Button>
            <Button variant="ghost" size="icon"><Code /></Button>
            <Button variant="ghost" size="icon"><Link /></Button>
            <Button variant="ghost" size="icon"><List /></Button>
          </div>
          <Textarea 
            placeholder="Leave a comment..."
            className="min-h-[100px]"
          />
        </div>
      </TabsContent>
      <TabsContent value="preview">
        <div className="prose prose-sm min-h-[100px] p-2 border rounded">
          <ReactMarkdown>{commentBody}</ReactMarkdown>
        </div>
      </TabsContent>
    </Tabs>
    
    {/* Footer buttons */}
    <DialogFooter>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant="outline" onClick={onStartReview}>
        Start a review
      </Button>
      <Button onClick={handleSubmit}>
        Add single comment
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 3.5 Hover Interaction

**Trigger:** Hover over line number area shows "+" button
**Click:** Opens comment modal positioned near the line

```tsx
// In MarkdownViewer
const [hoveredLine, setHoveredLine] = useState<number | null>(null);
const [modalLine, setModalLine] = useState<number | null>(null);

<div 
  className="line-number-gutter"
  onMouseEnter={() => setHoveredLine(lineNumber)}
  onMouseLeave={() => setHoveredLine(null)}
>
  {hoveredLine === lineNumber && (
    <button 
      className="add-comment-trigger"
      onClick={() => setModalLine(lineNumber)}
    >
      <Plus className="h-4 w-4" />
    </button>
  )}
  <span className="line-num">{lineNumber}</span>
</div>
```

---

## 4. Files to Modify

### 4.1 Database & Types

| File | Changes |
|------|---------|
| `apps/web/src/db/schema.ts` | Replace `startOffset`/`endOffset` with `startLine`/`endLine` |
| `apps/web/src/types/index.ts` | Update `createThreadSchema`, `ThreadResponse` |

### 4.2 API Routes

| File | Changes |
|------|---------|
| `apps/web/src/app/api/reviews/[id]/threads/route.ts` | Update to accept line numbers |
| `apps/web/src/app/api/threads/[threadId]/route.ts` | Minor type updates |

### 4.3 Components (Major Changes)

| File | Changes |
|------|---------|
| `apps/web/src/components/review/markdown-viewer.tsx` | **Complete rewrite** - line-based rendering |
| `apps/web/src/components/review/comment-sidebar.tsx` | Remove inline form, connect to modal |
| `apps/web/src/components/review/review-client.tsx` | Add modal state management |

### 4.4 New Components

| File | Purpose |
|------|---------|
| `apps/web/src/components/review/comment-modal.tsx` | GitHub-style comment dialog |
| `apps/web/src/components/ui/tabs.tsx` | Add from shadcn/ui (Write/Preview tabs) |

### 4.5 Existing shadcn/ui Components Available

- `dialog.tsx` - Base for modal
- `button.tsx` - Buttons
- `textarea.tsx` - Comment input
- `scroll-area.tsx` - Scrollable content

### 4.6 Missing shadcn/ui Components Needed

```bash
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add popover  # Optional, for toolbar dropdowns
```

---

## 5. Implementation Considerations

### 5.1 Markdown Line Parsing Challenges

**Problem:** Markdown elements can span multiple lines:
- Code blocks (```)
- Lists with continuation
- Blockquotes
- Tables

**Solution:** Track block context when splitting:
```typescript
function splitMarkdownToLines(content: string): LineInfo[] {
  const lines = content.split('\n');
  const result: LineInfo[] = [];
  let inCodeBlock = false;
  
  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }
    result.push({
      lineNumber: index + 1,
      content: line,
      isPartOfBlock: inCodeBlock,
      blockType: inCodeBlock ? 'code' : null,
    });
  });
  
  return result;
}
```

### 5.2 Multi-line Selection

**GitHub behavior:** Click-drag from line N to line M highlights range
**Simpler approach for v1:** Single-line comments only, multi-line as future enhancement

### 5.3 Performance

- Current: Single ReactMarkdown render
- Proposed: Multiple small renders (one per line)
- Mitigation: Use `React.memo` on line components, virtualize for very long docs

### 5.4 Database Migration

```sql
-- Migration script
ALTER TABLE threads ADD COLUMN start_line INTEGER;
ALTER TABLE threads ADD COLUMN end_line INTEGER;

-- Migrate existing data (approximate - may need manual review)
UPDATE threads SET 
  start_line = (
    SELECT COUNT(*) + 1 FROM (
      SELECT 1 FROM reviews r 
      WHERE r.id = threads.review_id 
      AND LENGTH(SUBSTRING(r.content, 1, threads.start_offset)) - 
          LENGTH(REPLACE(SUBSTRING(r.content, 1, threads.start_offset), E'\n', ''))
    ) as line_count
  );

-- After migration verified
ALTER TABLE threads DROP COLUMN start_offset;
ALTER TABLE threads DROP COLUMN end_offset;
```

---

## 6. UI Reference: GitHub Comment Modal

**Key GitHub PR comment modal features:**
1. **Header:** Shows file name and line number(s)
2. **Tabs:** "Write" and "Preview" toggle
3. **Toolbar:** Bold, Italic, Quote, Code, Link, List, Task List, Mention, Ref icons
4. **Textarea:** Resizable, markdown-enabled
5. **Footer buttons:**
   - Cancel (text button)
   - "Start a review" (outline button, batches comments)
   - "Add single comment" (primary button, immediate submit)

**Styling cues:**
- Modal width: ~480px
- Rounded corners (0.5rem)
- Light border
- Tab underline indicator
- Toolbar icons are 16x16, subtle gray, hover to darker

---

## 7. Alternative Approaches Considered

### 7.1 Keep Character Offsets + Add Line Display

**Pros:** Minimal schema change
**Cons:** Complex offset-to-line mapping, drift issues persist

### 7.2 Hybrid: Store Both Lines and Offsets

**Pros:** Maximum flexibility
**Cons:** Data duplication, sync issues

### 7.3 Virtual Line Numbers (CSS counter)

**Pros:** No markdown restructure needed
**Cons:** Cannot attach click handlers to specific lines

---

## 8. Recommended Implementation Order

1. **Schema migration** - Add line columns, write migration
2. **Line-based markdown viewer** - Core rendering changes
3. **Comment modal** - New component with tabs
4. **Sidebar updates** - Remove inline form, show line numbers
5. **API updates** - Accept/return line numbers
6. **Line highlighting** - CSS-based highlighting
7. **Hover interaction** - "+" button on line gutter

---

## 9. Potential Challenges

| Challenge | Mitigation |
|-----------|------------|
| Multi-line markdown elements | Track block context, render as single unit |
| Line number stability on edit | Line numbers are source-based, stable |
| Performance with many lines | React.memo, consider virtualization |
| Existing data migration | Compute line numbers from offsets |
| Mobile responsiveness | Hide line numbers on small screens, use tap instead of hover |

---

## 10. Success Criteria

- [ ] Markdown renders with visible line numbers
- [ ] Hover over line shows "+" button  
- [ ] Click "+" opens GitHub-style modal
- [ ] Modal has Write/Preview tabs
- [ ] Modal has formatting toolbar (icons, functionality optional for v1)
- [ ] Comments attach to specific lines
- [ ] Lines with comments are highlighted
- [ ] Clicking thread in sidebar scrolls to line
- [ ] Clicking highlighted line opens thread in sidebar

---

## 11. React Libraries for GitHub-Style Diff Commenting

Based on external research, several libraries exist that implement GitHub-style commenting:

### 11.1 @git-diff-view/react (Recommended for code)

GitHub-style diff viewer with widget support:

```tsx
import { DiffView, DiffModeEnum } from "@git-diff-view/react";
import "@git-diff-view/react/styles/diff-view.css";

<DiffView<string>
  data={{ oldFile, newFile, hunks }}
  diffViewMode={DiffModeEnum.Split}
  diffViewAddWidget={true}
  onAddWidgetClick={({ side, lineNumber }) => {
    openCommentModal({ side, lineNumber });
  }}
  renderWidgetLine={({ onClose, side, lineNumber }) => (
    <CommentThread side={side} lineNumber={lineNumber} onClose={onClose} />
  )}
/>
```

**Use case:** Code file reviews, not markdown content.

### 11.2 @github/markdown-toolbar-element

Official GitHub markdown toolbar component for formatting buttons:

```tsx
import '@github/markdown-toolbar-element';

<markdown-toolbar for="comment-textarea">
  <md-bold>B</md-bold>
  <md-italic>I</md-italic>
  <md-header>H</md-header>
  <md-code>&lt;/&gt;</md-code>
  <md-link>Link</md-link>
</markdown-toolbar>

<textarea id="comment-textarea"></textarea>
```

**Verdict:** Could use for toolbar, but requires Web Components setup. May be overkill for v1.

### 11.3 react-diff-view

Extensible widget architecture for code commenting:

```tsx
import { Diff, Hunk } from 'react-diff-view';

const widgets = {
  [getChangeKey(change1)]: <CommentBox />,
};

<Diff viewType="unified" hunks={hunks} widgets={widgets}>
  {hunks => hunks.map(hunk => <Hunk key={hunk.content} hunk={hunk} />)}
</Diff>
```

### 11.4 Recommendation for MDReview

Since MDReview reviews **markdown content** (not code diffs), external diff libraries are not ideal. The recommended approach is:

1. **Build custom line-based markdown viewer** - Split markdown by lines, render with gutter
2. **Use shadcn/ui for modal** - Dialog + Tabs + Textarea (already available)
3. **Stub toolbar icons** - Use Lucide icons, add functionality later if needed

This keeps dependencies minimal and provides full control over the UX.

---

## 12. GitHub Multi-Line Selection Patterns

GitHub supports two patterns for selecting multiple lines:

### 12.1 Click and Drag

```tsx
const [selection, setSelection] = useState<LineRange | null>(null);

const handleGutterMouseDown = (startLine: number) => {
  setSelection({ startLine, endLine: startLine });
  
  const handleMouseMove = (e: MouseEvent) => {
    const targetLine = getLineFromEvent(e);
    setSelection(prev => prev && { ...prev, endLine: targetLine });
  };
  
  const handleMouseUp = () => {
    openCommentModal(selection);
    cleanup();
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
```

### 12.2 Shift-Click

- Click first line number to select start
- Hold Shift, click end line number
- Shows comment icon for the range

**Recommendation for v1:** Start with single-line comments only. Add multi-line selection in v2.

---

## Appendix: External Resources

- **GitHub markdown-toolbar-element**: https://github.com/github/markdown-toolbar-element
- **Primer MarkdownEditor**: https://primer.style/product/internal-components/markdown-editor
- **react-syntax-highlighter** (for line numbers in code): https://github.com/react-syntax-highlighter/react-syntax-highlighter
- **shadcn/ui Tabs**: https://ui.shadcn.com/docs/components/tabs
- **@git-diff-view/react**: https://www.npmjs.com/package/@git-diff-view/react
- **react-diff-view**: https://www.npmjs.com/package/react-diff-view
- **Eldora UI GitHub Comments**: https://www.eldoraui.site/docs/components/github-inline-comments

---

**End of Research**
