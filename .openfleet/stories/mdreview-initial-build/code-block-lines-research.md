# Code Block Line-Level Selection Research

**Author**: Athena (Scout)
**Date**: 2025-01-06
**Story**: mdreview-initial-build
**Task**: Implement line-level selection within fenced code blocks

---

## 1. Problem Statement

Currently, MDReview treats fenced code blocks as a single commentable block. Users need to select **individual lines** within code blocks, similar to GitHub's PR diff view.

**Current behavior:**
```markdown
```javascript
function hello() {
  console.log("hello");  // Can't select just this line
  return true;
}
```
```

The entire code block is wrapped with `CommentableBlock` - clicking anywhere selects the whole block (e.g., "Lines 1-5").

**Desired behavior:**
- Each line within a code block is independently selectable
- Multi-line selection works (drag from line 2 to line 4)
- Seamless integration with existing block-level selection system

---

## 2. Current Implementation Analysis

### Key Files

| File | Role |
|------|------|
| `markdown-viewer.tsx` | Renders markdown via ReactMarkdown, creates block components, manages multi-block selection |
| `commentable-block.tsx` | Wraps each markdown block with hover/click/pointer handlers |
| `types/index.ts` | Defines `BlockSelection { startLine, endLine, blockContent }` |

### How Code Blocks Are Rendered Today

```tsx
// markdown-viewer.tsx line 378
pre: createBlockComponent("pre") as Components["pre"],
```

ReactMarkdown renders fenced code as:
```html
<pre><code class="language-javascript">function hello() { ... }</code></pre>
```

The entire `<pre>` is wrapped with `CommentableBlock`, treating it as a single unit.

### Source Position Data Available

ReactMarkdown provides `node.position` with line numbers:
```typescript
{
  position: {
    start: { line: 10, column: 1 },  // Code block starts at source line 10
    end: { line: 15, column: 4 }     // Code block ends at source line 15
  }
}
```

**Key insight**: The fence markers (`\`\`\`javascript`) occupy source lines, so internal line 1 of the code = source line 11.

---

## 3. Research: Syntax Highlighting Libraries

### 3.1 prism-react-renderer (RECOMMENDED)

**Key feature**: Renders line-by-line with render props pattern.

```tsx
import { Highlight, themes } from "prism-react-renderer";

<Highlight code={code} language="javascript" theme={themes.github}>
  {({ tokens, getLineProps, getTokenProps }) => (
    <pre>
      {tokens.map((line, i) => (
        <div key={i} {...getLineProps({ line })}>
          {/* Each line is a separate div - PERFECT for our needs */}
          {line.map((token, key) => (
            <span key={key} {...getTokenProps({ token })} />
          ))}
        </div>
      ))}
    </pre>
  )}
</Highlight>
```

**Pros:**
- Line-by-line rendering is the default API design
- Each line is already a `<div>` element
- Can wrap each line with our selection logic
- Lightweight (~12KB), includes Prism
- Active maintenance (Formidable Labs)

**Cons:**
- Need to replace ReactMarkdown's default code rendering
- Extra dependency

**Install**: `pnpm add prism-react-renderer`

### 3.2 react-syntax-highlighter

**Key feature**: Supports `wrapLines` and `lineProps` for per-line customization.

```tsx
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

<SyntaxHighlighter
  language="javascript"
  wrapLines={true}
  lineProps={(lineNumber) => ({
    style: { cursor: "pointer" },
    onClick: () => handleLineClick(lineNumber),
  })}
>
  {code}
</SyntaxHighlighter>
```

**Pros:**
- `wrapLines` wraps each line in a `<span>` element
- `lineProps` callback provides per-line customization
- Can add data attributes, event handlers per line
- Also supports line numbers

**Cons:**
- Larger bundle (~200KB with all languages)
- `lineProps` is function-based, may need workarounds for pointer events
- Less control over rendering compared to prism-react-renderer

**Install**: `pnpm add react-syntax-highlighter @types/react-syntax-highlighter`

### 3.3 shiki / rehype-pretty-code

**Key feature**: Build-time highlighting with line metadata.

```tsx
import { createHighlighter } from "shiki";

const highlighter = await createHighlighter({ themes: ["github-dark"] });
const html = highlighter.codeToHtml(code, { 
  lang: "javascript",
  theme: "github-dark"
});
// Returns: <pre><code><span class="line">...</span>...</code></pre>
```

**Pros:**
- VSCode-grade highlighting accuracy
- Beautiful themes
- Each line gets a `.line` class by default

**Cons:**
- Async initialization required
- Better suited for build-time (MDX processing) than runtime
- Heavier setup for client-side use
- Would require significant refactoring of ReactMarkdown flow

**Verdict**: Best for static sites, overkill for our runtime needs.

### 3.4 Recommendation

**Use `prism-react-renderer`** because:
1. Render props pattern gives full control over each line's rendering
2. Can easily wrap each line with our `CodeLine` component
3. Lightweight and well-maintained
4. Already provides line-by-line DOM structure we need

---

## 4. How GitHub Does It

GitHub's PR diff view structure:

```html
<table class="diff-table">
  <tr class="js-file-line" data-line-number="1">
    <td class="blob-num js-line-number" data-line-number="1">1</td>
    <td class="blob-code">function hello() {</td>
  </tr>
  <tr class="js-file-line" data-line-number="2">
    <td class="blob-num js-line-number" data-line-number="2">2</td>
    <td class="blob-code">  console.log("hello");</td>
  </tr>
</table>
```

**Key patterns:**
- Each line is a table row (`<tr>`)
- Line numbers in separate column
- `data-line-number` attributes for targeting
- Click on line number or gutter area to select
- Shift+click or click+drag for multi-line selection

**Interaction:**
1. Click line number → single line selected
2. Shift+click another line → range selected
3. Click+drag from line number area → range selected
4. "+" button appears on selected range

---

## 5. Implementation Approaches

### Approach A: Custom `code` Component with prism-react-renderer

**How it works:**
1. Create custom ReactMarkdown `code` component
2. Detect fenced code blocks (has `language-*` class)
3. Use prism-react-renderer to render line-by-line
4. Wrap each line with a `CodeLine` component
5. Integrate with existing selection system

```tsx
// Custom code component for ReactMarkdown
const code: Components["code"] = ({ node, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  
  if (!match) {
    // Inline code - render normally
    return <code className={className} {...props}>{children}</code>;
  }
  
  const language = match[1];
  const codeString = String(children).replace(/\n$/, "");
  
  return (
    <CodeBlock 
      code={codeString} 
      language={language}
      startSourceLine={node?.position?.start?.line ?? 1}
    />
  );
};
```

**Pros:**
- Clean separation of concerns
- Full control over line rendering
- Integrates with existing selection system
- Can add line numbers easily

**Cons:**
- Need to handle the `pre` wrapper separately
- Must compute source line offset

### Approach B: Split Code Content Post-Render

**How it works:**
1. Keep ReactMarkdown rendering code blocks as `<pre><code>...</code></pre>`
2. After render, split the text content by newlines
3. Create line elements dynamically

**Pros:**
- Minimal changes to ReactMarkdown setup
- Works with any highlighting

**Cons:**
- Loses syntax highlighting tokens structure
- More complex DOM manipulation
- Potential hydration issues in SSR

### Approach C: Replace `pre` Component with Line-Aware Renderer

**How it works:**
1. Create custom `pre` component that extracts code content
2. Parse child `<code>` element for language and content
3. Re-render using prism-react-renderer with line wrappers

```tsx
const pre: Components["pre"] = ({ node, children, ...props }) => {
  // Extract code element from children
  const codeElement = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === "code"
  );
  
  if (!React.isValidElement(codeElement)) {
    return <pre {...props}>{children}</pre>;
  }
  
  const className = codeElement.props.className || "";
  const language = /language-(\w+)/.exec(className)?.[1] || "text";
  const code = String(codeElement.props.children).replace(/\n$/, "");
  
  return (
    <CodeBlockWithLines
      code={code}
      language={language}
      sourceStartLine={node?.position?.start?.line ?? 1}
    />
  );
};
```

**Pros:**
- Single point of customization
- Clean extraction of code properties
- Position data available from node

**Cons:**
- Slightly more complex child parsing

### Recommendation: Approach C (Replace `pre` Component)

This approach:
- Keeps the ReactMarkdown flow intact
- Provides position data from the AST node
- Clean separation: `pre` → extracts props → `CodeBlockWithLines` → renders

---

## 6. Integration with Existing Selection System

### Current Block Selection Model

```typescript
// In markdown-viewer.tsx
interface SelectionState {
  isSelecting: boolean;
  anchorBlockIndex: number | null;
  focusBlockIndex: number | null;
  finalSelection: { ... } | null;
}

// Each block has a unique blockIndex
blocksRef.current[blockIndex] = { startLine, endLine };
```

### Options for Code Lines

#### Option 1: Code Lines as Sub-Indices (e.g., `3.1`, `3.2`, `3.3`)

- Block 3 is a code block with lines 3.0, 3.1, 3.2...
- Selection can be `3.1` to `3.5`
- **Complexity**: Requires fractional indexing

#### Option 2: Flatten All Lines (Recommended)

- Code block at line 10-15 → registers as blocks 10, 11, 12, 13, 14, 15
- Each code line is a "block" in the selection system
- Works seamlessly with existing multi-block selection

```typescript
// Current: code block registers once
blocksRef.current[blockIndex] = { startLine: 10, endLine: 15 };

// New: each code line registers separately
// When rendering code block at source lines 10-15:
codeLines.forEach((line, i) => {
  const lineBlockIndex = blockIndexRef.current++;
  blocksRef.current[lineBlockIndex] = { 
    startLine: 10 + i + 1,  // +1 for fence marker
    endLine: 10 + i + 1 
  };
});
```

**Pros:**
- Uses existing selection infrastructure
- Multi-line selection "just works" (drag from block 11 to block 14)
- No changes to selection state structure

**Cons:**
- Block indices become less intuitive (paragraph isn't always +1)
- Need to pass selection state to code block component

#### Option 3: Separate Selection System for Code

- Code blocks have their own internal selection
- Doesn't participate in regular block selection
- **Complexity**: Two selection systems to maintain

### Recommendation: Option 2 (Flatten All Lines)

This reuses the proven multi-block selection system. The only complexity is ensuring each code line registers with the block index counter.

---

## 7. Source Line Mapping

### The Offset Problem

```markdown
Line 8:  Some paragraph
Line 9:  ```javascript    ← fence marker (not content)
Line 10: function hello() {    ← code line 1 = source line 10
Line 11:   console.log("hello"); ← code line 2 = source line 11
Line 12: }    ← code line 3 = source line 12
Line 13: ```    ← closing fence (not content)
Line 14: Another paragraph
```

**Position from AST:**
```typescript
node.position = {
  start: { line: 9 },   // Points to opening fence
  end: { line: 13 }     // Points to closing fence
}
```

**Mapping:**
- Code content line 0 → source line 10 (= start.line + 1)
- Code content line N → source line (10 + N)

```typescript
const sourceStartLine = (node?.position?.start?.line ?? 0) + 1;

// For each code line at index i:
const sourceLine = sourceStartLine + i;
```

---

## 8. Proposed Component Structure

### 8.1 CodeBlockWithLines Component

```tsx
// components/review/code-block-with-lines.tsx
interface CodeBlockWithLinesProps {
  code: string;
  language: string;
  sourceStartLine: number;  // First code line = sourceStartLine
  
  // From parent (selection system)
  getBlockIndex: () => number;          // Gets next available block index
  registerBlock: (index: number, startLine: number, endLine: number) => void;
  
  // Selection state
  selectedRange: { start: number; end: number } | null;
  isSelecting: boolean;
  finalSelection: {...} | null;
  
  // Callbacks
  onPointerDown: (blockIndex: number, e: React.PointerEvent) => void;
  onAddComment: (blockIndex: number, startLine: number, endLine: number) => void;
  
  // Thread info
  getThreadsForLine: (line: number) => string[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
}

export function CodeBlockWithLines({
  code,
  language,
  sourceStartLine,
  getBlockIndex,
  registerBlock,
  selectedRange,
  isSelecting,
  onPointerDown,
  ...props
}: CodeBlockWithLinesProps) {
  const lines = code.split("\n");
  
  return (
    <Highlight code={code} language={language} theme={themes.github}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="relative overflow-x-auto">
          {tokens.map((line, i) => {
            const blockIndex = getBlockIndex();
            const sourceLine = sourceStartLine + i;
            
            // Register this line as a block
            registerBlock(blockIndex, sourceLine, sourceLine);
            
            const isInRange = selectedRange && 
              blockIndex >= selectedRange.start && 
              blockIndex <= selectedRange.end;
            
            return (
              <CodeLine
                key={i}
                blockIndex={blockIndex}
                sourceLine={sourceLine}
                isInRange={isInRange}
                isSelecting={isSelecting}
                onPointerDown={onPointerDown}
                {...props}
              >
                <span className="line-number">{i + 1}</span>
                <span className="line-content">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </CodeLine>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}
```

### 8.2 CodeLine Component

```tsx
// components/review/code-line.tsx
interface CodeLineProps {
  blockIndex: number;
  sourceLine: number;
  isInRange: boolean;
  isSelecting: boolean;
  hasThread: boolean;
  isActive: boolean;
  isInFinalSelection: boolean;
  onPointerDown: (blockIndex: number, e: React.PointerEvent) => void;
  onAddComment: () => void;
  onThreadClick: () => void;
  children: React.ReactNode;
}

export function CodeLine({
  blockIndex,
  sourceLine,
  isInRange,
  isSelecting,
  hasThread,
  isActive,
  isInFinalSelection,
  onPointerDown,
  children,
}: CodeLineProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className={cn(
        "flex relative",
        // Selection highlight
        (isInRange || isInFinalSelection) && "bg-blue-100 dark:bg-blue-900/40",
        // Hover
        !isSelecting && isHovered && !hasThread && "bg-blue-50/50",
        // Thread highlight
        hasThread && "bg-yellow-50 dark:bg-yellow-900/20",
        isActive && "bg-yellow-100 dark:bg-yellow-900/40",
      )}
      data-block-index={blockIndex}
      data-source-line={sourceLine}
      onPointerDown={(e) => onPointerDown(blockIndex, e)}
      onMouseEnter={() => !isSelecting && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Hover button - optional, could be in gutter */}
      {isHovered && !isSelecting && (
        <button className="absolute -left-6 ..." onClick={onAddComment}>
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

---

## 9. Changes Required

### Files to Modify

| File | Changes |
|------|---------|
| `markdown-viewer.tsx` | Add custom `pre` component that delegates to `CodeBlockWithLines`, pass selection state down |
| `commentable-block.tsx` | No changes needed - code lines use same props interface |
| `package.json` | Add `prism-react-renderer` dependency |

### New Files to Create

| File | Purpose |
|------|---------|
| `code-block-with-lines.tsx` | Renders code block with prism-react-renderer, line-by-line |
| `code-line.tsx` | Individual code line component (similar to `CommentableBlock`) |

---

## 10. Edge Cases

### 10.1 Empty Lines in Code

Empty lines still need to be selectable:
```javascript
function hello() {
                    // ← Empty line, should still be selectable
  console.log("hi");
}
```

**Solution**: Always render a line element even for empty content.

### 10.2 Very Long Lines

Lines that overflow horizontally:
```javascript
const data = { very: "long", object: "that", overflows: "horizontally", ... };
```

**Solution**: Use `overflow-x: auto` on the `<pre>`, line selection still works.

### 10.3 Code Block with No Language

```
```
some text without language
```
```

**Solution**: Fall back to `language="text"` or plain rendering.

### 10.4 Mixed Selection (Code + Regular Block)

User drags from a code line (block 12) to a paragraph after the code block (block 20).

**Solution**: This works naturally since all are block indices. The selection spans code lines 12-15 and regular blocks 16-20.

### 10.5 Inline Code (Not Fenced)

`const x = 1` should NOT get line selection - it's inline.

**Solution**: Only apply line rendering to fenced code blocks (detected by `language-*` class).

---

## 11. Visual Design

### Line Numbers

```
┌────────────────────────────────────────────┐
│  1 │ function hello() {                    │
│  2 │   console.log("hello");               │  ← yellow highlight (has thread)
│  3 │   return true;                        │
│  4 │ }                                     │
└────────────────────────────────────────────┘
```

**Line number styling:**
- Muted color, right-aligned
- Separate column (table or flexbox)
- Not selectable (user-select: none)
- Click on line number → select that line

### Gutter Area

The "+" button appears to the left of line numbers on hover (like regular blocks):

```
     [+]  1 │ function hello() {
           2 │   console.log("hello");
           3 │   return true;
           4 │ }
```

---

## 12. Implementation Order

1. **Add dependency**: `pnpm add prism-react-renderer`

2. **Create CodeLine component**: Similar to CommentableBlock but for code lines

3. **Create CodeBlockWithLines component**: 
   - Uses prism-react-renderer
   - Renders each line with CodeLine
   - Registers each line as a block

4. **Modify markdown-viewer.tsx**:
   - Add custom `pre` component
   - Extract code/language from children
   - Pass selection state to CodeBlockWithLines

5. **Test basic rendering**: Syntax highlighting works, lines display

6. **Test selection**: Single line click, multi-line drag

7. **Test thread highlights**: Threads on code lines show yellow

8. **Test mixed selection**: Drag from code line to regular paragraph

---

## 13. Estimated Effort

| Task | Time |
|------|------|
| Add prism-react-renderer, create CodeLine | 1-2 hours |
| Create CodeBlockWithLines with selection integration | 2-3 hours |
| Modify markdown-viewer for custom pre | 1-2 hours |
| Testing and edge cases | 1-2 hours |
| **Total** | **5-9 hours** |

---

## 14. Summary for Engineer

### Core Approach

Replace the default `<pre>` rendering with a custom component that:
1. Extracts code content and language from ReactMarkdown's output
2. Uses `prism-react-renderer` to render each line as a separate `<div>`
3. Wraps each line with selection handlers (same as `CommentableBlock`)
4. Registers each line with the block index system

### Key Points

1. **Library**: Use `prism-react-renderer` - it naturally renders line-by-line
2. **Selection**: Each code line becomes a "block" in the existing selection system
3. **Source mapping**: Code line 0 = `node.position.start.line + 1` (skip fence marker)
4. **Styling**: Reuse `CommentableBlock` patterns (blue selection, yellow threads)
5. **Edge cases**: Handle empty lines, long lines, no-language blocks

### Critical Insight

The existing multi-block selection system (`blockIndex`, `selectedRange`, etc.) works perfectly for code lines - we just need each code line to register as its own block. This means the entire selection logic remains unchanged.

### Files to Change

- **Modify**: `markdown-viewer.tsx` - add custom `pre` component
- **Create**: `code-block-with-lines.tsx` - prism-react-renderer wrapper
- **Create**: `code-line.tsx` - individual line with selection (optional, could inline)
- **Add**: `prism-react-renderer` package

---

## 15. References

- prism-react-renderer: https://github.com/FormidableLabs/prism-react-renderer
- react-syntax-highlighter wrapLines: https://github.com/react-syntax-highlighter/react-syntax-highlighter
- GitHub multi-line selection: https://github.blog/changelog/2020-02-21-a-new-interaction-for-multi-line-pull-request-comments/
- rehype-pretty-code line highlighting: https://rehype-pretty.pages.dev/
- Existing multi-block selection research: `tasks/multi-block-selection-research.md`

---

**Research completed**: 2025-01-06
**Researcher**: Athena (Scout)
