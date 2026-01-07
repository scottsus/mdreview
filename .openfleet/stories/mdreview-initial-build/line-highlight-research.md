# Line Highlighting on Rendered Markdown: Technical Research

**Author**: Athena (Scout)
**Date**: 2025-01-06
**Story**: mdreview-initial-build
**Task**: Implement GitHub-style line commenting on rendered markdown

---

## 1. The Core Problem

The current implementation splits markdown by newlines and renders each line separately:

```tsx
// Current approach in markdown-viewer.tsx
const lines = content.split("\n");
lines.map((line, index) => (
  <LineWrapper key={index}>
    <ReactMarkdown>{line.content}</ReactMarkdown>
  </LineWrapper>
))
```

**Why this breaks markdown:**
- A table with 5 source lines renders as ONE `<table>` element
- A code block with 10 lines renders as ONE `<pre>` element
- Lists, blockquotes, and nested elements span multiple lines
- Rendering line-by-line produces invalid HTML structure

**The user wants:**
1. Fully rendered markdown (tables, code blocks, lists work properly)
2. Line numbers in a gutter (like GitHub PRs or code editors)
3. Full-row highlighting when a comment exists on a line
4. Hover "+" button in gutter to add comments
5. Click highlighted line to view thread in sidebar

---

## 2. Research Findings: How Others Solve This

### 2.1 GitHub's Approach (Actual Implementation)

GitHub does **NOT** show line numbers on rendered markdown. Looking at:
- PR descriptions
- Issue bodies
- README files
- Wiki pages

**GitHub only shows line numbers on:**
- Source code files (treated as plain text with syntax highlighting)
- Diff views (side-by-side or unified diffs)

**Key insight:** GitHub's line commenting works because they treat files as **plain text with syntax highlighting**, not as rendered content. The source lines map 1:1 to visual lines.

For markdown specifically, GitHub:
- Shows rendered output without line numbers
- Uses text selection (not line-based) for comments on rendered markdown
- Only shows line numbers when viewing the **raw source** of a markdown file

### 2.2 Markdown-it Source Map Approach

The `markdown-it-source-map` library adds `data-source-line` attributes to rendered HTML:

```javascript
import markdownIt from 'markdown-it'
import markdownItSourceMap from 'markdown-it-source-map'

const mdi = markdownIt().use(markdownItSourceMap)
mdi.render('# hello world') 
// Output: <h1 data-source-line="1">hello world</h1>
```

**Pros:**
- Preserves source line information on block-level elements
- Works with fully rendered markdown
- Enables scroll sync between source and preview

**Cons:**
- Only marks **block-level** elements, not individual lines
- A table gets ONE `data-source-line` attribute (the start line)
- Internal table rows don't have line tracking
- Would need to switch from react-markdown to markdown-it

### 2.3 Remark/Rehype Position Preservation

The unified/remark ecosystem has position tracking built into the AST:

```javascript
// mdast node has position info
{
  "type": "heading",
  "depth": 1,
  "position": {
    "start": { "line": 1, "column": 1, "offset": 0 },
    "end": { "line": 1, "column": 11, "offset": 10 }
  }
}
```

**Problem:** This position is lost when converting mdast -> hast -> React.

**Solution (from dev.to article):** Custom handlers that preserve position:

```typescript
function gatherPosition(node) {
  return {
    [`data-startline`]: node.position.start.line,
    [`data-endline`]: node.position.end.line,
  };
}

// Custom heading handler
export function heading(state, node) {
  const result = {
    type: 'element',
    tagName: 'h' + node.depth,
    properties: { ...gatherPosition(node) },
    children: state.all(node),
  };
  state.patch(node, result);
  return state.applyData(node, result);
}
```

**How to use with react-markdown:**
- Create custom `remark-rehype` handlers for all element types
- Pass position data through as `data-*` attributes
- Access via custom React components

**Caveat:** Still only works at block-level. Individual lines within a code block or table don't get separate attributes.

### 2.4 CSS Custom Highlight API

The CSS Custom Highlight API allows styling arbitrary text ranges without modifying DOM:

```javascript
// Create ranges for lines with comments
const range = new Range();
range.setStart(textNode, startOffset);
range.setEnd(textNode, endOffset);

// Register highlight
const highlight = new Highlight(range);
CSS.highlights.set('comment-lines', highlight);
```

```css
::highlight(comment-lines) {
  background-color: rgba(250, 204, 21, 0.2);
}
```

**Pros:**
- Non-destructive (doesn't modify DOM)
- Can highlight arbitrary ranges
- Performance-efficient for many highlights

**Cons:**
- Doesn't help with line numbers or click targets
- Works for highlighting text, not full-row backgrounds
- Still need to map source lines to DOM positions

### 2.5 Diff Viewer Libraries (react-diff-view, @git-diff-view/react)

These libraries implement GitHub-style line commenting but for **source code diffs**:

```tsx
<DiffView
  diffViewAddWidget={true}
  onAddWidgetClick={({ lineNumber }) => openCommentModal(lineNumber)}
  renderWidgetLine={({ lineNumber }) => <CommentThread line={lineNumber} />}
/>
```

**Why they work for code but not rendered markdown:**
- Code is plain text - each source line = one visual line
- No rendering transformation (just syntax highlighting)
- Line numbers are trivial to track

**Key insight:** The "rendered markdown" requirement is fundamentally incompatible with line-based commenting because rendering transforms the structure.

---

## 3. Approach Analysis

### Approach A: Block-Level Commenting (Recommended)

**Strategy:** Comment on rendered **blocks** instead of source **lines**.

**Implementation:**
1. Parse markdown AST with position info using unified/remark
2. Pass position data to rendered elements as `data-*` attributes
3. Show comment button on hover over any block element
4. Store `startLine`/`endLine` (the source lines that produced this block)
5. Highlight entire block when it has comments

**Pros:**
- Fully rendered markdown (tables, code blocks work)
- Natural interaction (comment on paragraphs, headers, etc.)
- Source line mapping is preserved
- Works with existing react-markdown

**Cons:**
- Can't comment on a specific table row or code line
- Different UX from GitHub's line-based approach
- Granularity limited to block elements

**Code outline:**

```tsx
// Custom rehype plugin to add position data
function rehypeAddPosition() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.position) {
        node.properties['data-start-line'] = node.position.start.line;
        node.properties['data-end-line'] = node.position.end.line;
      }
    });
  };
}

// ReactMarkdown with custom components
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeAddPosition]}
  components={{
    p: ({ node, ...props }) => (
      <BlockWrapper 
        startLine={node.properties['data-start-line']}
        endLine={node.properties['data-end-line']}
        {...props}
      />
    ),
    // ... other block elements
  }}
/>
```

### Approach B: Source View with Line Numbers (Alternative)

**Strategy:** Don't render markdown - show raw source with line numbers (like GitHub's code view).

**Implementation:**
1. Display raw markdown as plain text with syntax highlighting
2. Add line numbers in gutter
3. Offer "Preview" tab for rendered view
4. Comments attach to source lines

**Pros:**
- Exact line mapping (source line = visual line)
- GitHub-identical UX for code review
- Simpler implementation

**Cons:**
- Users see raw markdown, not rendered
- Tables, images, formatting not visible in main view
- Defeats purpose of "markdown review" (want to see rendered output)

**Verdict:** Probably not what users want. They want to review the *rendered* document, not the source.

### Approach C: Hybrid Split View

**Strategy:** Side-by-side source (with line numbers) and rendered preview.

**Implementation:**
1. Left pane: Raw markdown with line numbers + comment buttons
2. Right pane: Rendered preview (read-only)
3. Scroll sync between panes
4. Comments attach to source lines but preview highlights corresponding block

**Pros:**
- Best of both worlds
- Exact line commenting on source
- Visual preview for context

**Cons:**
- Takes more screen space
- More complex implementation
- May confuse users (which pane to focus?)

### Approach D: Enhanced Current Implementation

**Strategy:** Keep line-by-line rendering but handle multi-line blocks specially.

**Implementation:**
1. Parse markdown to detect block boundaries
2. For single-line elements: render normally with line number
3. For multi-line blocks (tables, code blocks): render as single unit spanning multiple line slots
4. Show line numbers for all lines, but block elements span rows

**Pros:**
- Preserves line number visibility
- Handles blocks correctly

**Cons:**
- Complex layout (blocks spanning multiple "rows")
- Comments still can't target lines inside blocks
- CSS grid/flexbox complexity

---

## 4. Recommendation

### Primary Recommendation: Approach A (Block-Level Commenting)

**Rationale:**
1. **It's what users actually need** - When reviewing rendered markdown, you comment on paragraphs, headers, lists, not specific source lines
2. **Preserves markdown rendering** - Tables, code blocks, formatting all work correctly
3. **Feasible with current stack** - Works with react-markdown + custom rehype plugin
4. **Matches the mental model** - "Comment on this section" vs "Comment on line 47"

**Key changes:**
1. Add rehype plugin to pass position data through
2. Wrap block elements with hover interaction component
3. Store `startLine`/`endLine` per thread (already in schema!)
4. Highlight entire block elements, not text ranges

### Alternative Consideration: Approach C (Hybrid Split View)

If users strongly prefer line-based commenting, the split view approach preserves that capability while still showing rendered output. Consider this for v2 if block-level commenting doesn't satisfy users.

---

## 5. Implementation Guide for Block-Level Approach

### 5.1 Create rehype-position-attributes plugin

```typescript
// lib/rehype-position-attributes.ts
import { visit } from 'unist-util-visit';
import type { Element } from 'hast';

export function rehypePositionAttributes() {
  return (tree: any) => {
    visit(tree, 'element', (node: Element) => {
      if (node.position) {
        node.properties = node.properties || {};
        node.properties['data-start-line'] = node.position.start.line;
        node.properties['data-end-line'] = node.position.end.line;
      }
    });
  };
}
```

### 5.2 Create CommentableBlock wrapper

```tsx
// components/review/commentable-block.tsx
interface CommentableBlockProps {
  startLine: number;
  endLine: number;
  hasThread: boolean;
  isActive: boolean;
  onAddComment: () => void;
  onClick: () => void;
  children: React.ReactNode;
}

function CommentableBlock({ 
  startLine, 
  endLine, 
  hasThread, 
  isActive,
  onAddComment,
  onClick,
  children 
}: CommentableBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className={cn(
        "relative group",
        hasThread && "bg-yellow-50 border-l-2 border-yellow-400",
        isActive && "bg-yellow-100"
      )}
      data-start-line={startLine}
      data-end-line={endLine}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={hasThread ? onClick : undefined}
    >
      {/* Line number gutter */}
      <div className="absolute left-0 top-0 w-10 text-xs text-muted-foreground">
        {isHovered && (
          <button onClick={onAddComment} className="...">
            <Plus className="h-3 w-3" />
          </button>
        )}
        <span>{startLine}</span>
        {endLine !== startLine && <span>-{endLine}</span>}
      </div>
      
      {/* Content */}
      <div className="pl-12">
        {children}
      </div>
    </div>
  );
}
```

### 5.3 Update MarkdownViewer

```tsx
// components/review/markdown-viewer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { rehypePositionAttributes } from '@/lib/rehype-position-attributes';

function MarkdownViewer({ content, threads, onLineClick, onThreadClick }) {
  const threadsByRange = useMemo(() => {
    // Build map of line ranges to thread IDs
    const map = new Map();
    threads.forEach(t => {
      for (let line = t.startLine; line <= t.endLine; line++) {
        const existing = map.get(line) || [];
        existing.push(t.id);
        map.set(line, existing);
      }
    });
    return map;
  }, [threads]);
  
  const createComponent = (Tag: string) => {
    return ({ node, ...props }: any) => {
      const startLine = node?.properties?.['data-start-line'];
      const endLine = node?.properties?.['data-end-line'];
      
      if (!startLine) {
        return <Tag {...props} />;
      }
      
      const threadIds = threadsByRange.get(startLine) || [];
      const hasThread = threadIds.length > 0;
      
      return (
        <CommentableBlock
          startLine={startLine}
          endLine={endLine}
          hasThread={hasThread}
          isActive={threadIds.includes(activeThreadId)}
          onAddComment={() => onLineClick({ startLine, endLine })}
          onClick={() => onThreadClick(threadIds[0])}
        >
          <Tag {...props} />
        </CommentableBlock>
      );
    };
  };
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypePositionAttributes]}
      components={{
        p: createComponent('p'),
        h1: createComponent('h1'),
        h2: createComponent('h2'),
        h3: createComponent('h3'),
        pre: createComponent('pre'),
        table: createComponent('table'),
        ul: createComponent('ul'),
        ol: createComponent('ol'),
        blockquote: createComponent('blockquote'),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### 5.4 Dependencies needed

```bash
pnpm add unist-util-visit
# Types already included with react-markdown
```

---

## 6. Key Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/lib/rehype-position-attributes.ts` | **New** - rehype plugin |
| `apps/web/src/components/review/commentable-block.tsx` | **New** - block wrapper component |
| `apps/web/src/components/review/markdown-viewer.tsx` | Replace line-by-line with block-based rendering |
| `apps/web/src/types/index.ts` | Update `LineSelection` → `BlockSelection` (optional) |

---

## 7. Trade-offs Summary

| Aspect | Current (Line-by-line) | Proposed (Block-level) |
|--------|------------------------|------------------------|
| Markdown rendering | Broken | Works correctly |
| Comment granularity | Line | Block (paragraph, header, table, etc.) |
| Line numbers | Visible on every line | Visible on block start |
| Hover interaction | Per line | Per block |
| Code block internal lines | Each line separate | Whole block as unit |
| Table row comments | Possible (broken tables) | Whole table only |
| Implementation complexity | Medium | Medium |

---

## 8. Future Enhancements

If block-level commenting proves too coarse:

1. **Code block line comments** - Detect code blocks specifically and render with per-line interaction (like syntax highlighters)
2. **Table row comments** - Parse tables separately and allow row-level commenting
3. **Hybrid approach** - Use block-level for prose, line-level for code/tables

---

## 9. References

- **markdown-it-source-map**: https://github.com/tylingsoft/markdown-it-source-map
- **Remark position retention (dev.to)**: https://dev.to/wangpin34/how-to-retain-position-of-markdown-element-in-remarkjs-k8m
- **react-markdown issue #919**: Feature request for source map support (not implemented)
- **CSS Custom Highlight API**: https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API
- **unist-util-visit**: https://github.com/syntax-tree/unist-util-visit

---

## 10. Additional Techniques from Research

### 10.1 react-markdown Source Position Props

React-markdown has built-in props for source position tracking:

```tsx
<ReactMarkdown
  sourcePos={true}       // Adds data-sourcepos="3:1-3:13" to elements
  rawSourcePos={true}    // Passes sourcePosition prop to components
  components={{
    p: ({ children, sourcePosition }) => {
      console.log('Paragraph at line:', sourcePosition?.start.line);
      return <p data-line={sourcePosition?.start.line}>{children}</p>;
    }
  }}
>
  {markdownContent}
</ReactMarkdown>
```

**This is the simplest approach** - no custom plugins needed! The `rawSourcePos` prop passes position info directly to custom components.

### 10.2 CSS Counters for Line Numbers

Pure CSS solution for line numbering (no JS required):

```css
.code-block {
  counter-reset: line-counter;
}

.code-block .line::before {
  counter-increment: line-counter;
  content: counter(line-counter);
  margin-right: 10px;
  color: #888;
}
```

### 10.3 Table-Based Gutter Pattern (from react-diff-viewer)

The most reliable pattern for clickable line gutters:

```tsx
<tr>
  <td className="gutter" onClick={() => handleLineClick(lineNumber)}>
    <pre className="line-number">{lineNumber}</pre>
  </td>
  <td className={cn("content", { "highlighted": hasComment })}>
    <pre>{content}</pre>
  </td>
</tr>
```

### 10.4 Data Attribute Pattern

Modern approach used by Shiki/rehype-pretty-code:

```tsx
// Apply attributes in transformer
element.properties['data-line-number'] = lineCounter;
element.properties['data-highlighted-line'] = hasComment ? '' : undefined;
```

```css
/* Style via attribute selectors */
[data-highlighted-line] {
  background-color: rgba(250, 204, 21, 0.2);
  border-left: 3px solid #facc15;
}
```

---

## 11. Final Recommendation Summary

**For MDReview specifically:**

1. **Use `rawSourcePos={true}` in ReactMarkdown** - This is the built-in solution for getting source positions

2. **Wrap block elements with CommentableBlock** - Custom components that receive `sourcePosition` prop

3. **Store startLine/endLine per thread** - Already in the schema!

4. **Use data attributes for highlighting** - `[data-has-comment]` CSS selectors

5. **Consider hybrid approach later** - If users need line-level commenting for code blocks, add special handling for `<pre>` elements using react-syntax-highlighter with `showLineNumbers`

**Key insight:** Don't fight the rendering. Rendered markdown naturally produces block elements, so block-level commenting is the right mental model. Source line numbers are preserved for reference and linking, but interaction happens at the block level.

---

**End of Research**
