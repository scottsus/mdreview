# Comment Sidebar Text Overflow - Research

**Date**: 2025-01-07
**Status**: Research Complete
**Severity**: Medium (UX bug)

## Problem Statement

Comment text in the sidebar is being cut off on the right edge. The comments include:
- AI Agent responses with markdown formatting
- Blockquotes (callouts)
- Inline code blocks
- Numbered lists
- Long text without natural break points

## Root Cause Analysis

After tracing through the CSS hierarchy and researching known issues, **THREE root causes** are contributing to this problem:

### 1. Radix ScrollArea `display: table` Issue

The ScrollArea component from Radix UI uses `display: table` internally on its viewport wrapper, which is documented as a known issue that affects width calculations:

```tsx
// From scroll-area.tsx
<ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
  {children}
</ScrollAreaPrimitive.Viewport>
```

The viewport has a hidden internal wrapper with `display: table` that can cause content to exceed its parent's width constraints. This is a documented issue in:
- https://github.com/radix-ui/primitives/issues/2722
- https://github.com/radix-ui/primitives/issues/2964
- https://github.com/radix-ui/themes/issues/617

**Fix**: Override the viewport's internal div with `!display: block` via CSS, or add explicit `max-width: 100%` to content children.

### 2. Tailwind Typography Prose Plugin - Inline Code Doesn't Wrap

The `prose` class from `@tailwindcss/typography` applies styles to inline `<code>` elements that **do not include word wrapping**. From the [source code](https://github.com/tailwindlabs/tailwindcss-typography/blob/3963dfede4845f46451db1863fd5321f4cdea03b/src/styles.js#L1542-L1550):

```javascript
code: {
  color: 'var(--tw-prose-code)',
  fontWeight: '600',
  // NO overflow-wrap or word-break properties!
},
'code::before': { content: '"`"' },
'code::after': { content: '"`"' }
```

Long inline code like `someVeryLongFunctionNameThatDoesntWrap()` will overflow because it inherits wrapping from the parent, which doesn't have explicit word-break.

**Fix**: Add `[&_code]:break-all` or use `overflow-wrap: anywhere` on the prose container.

**Note**: `<pre>` blocks (code blocks) DO have overflow handling with `overflowX: 'auto'` ([source](https://github.com/tailwindlabs/tailwindcss-typography/blob/3963dfede4845f46451db1863fd5321f4cdea03b/src/styles.js#L1574-L1577)).

### 3. Blockquote Margins/Padding in Narrow Containers

The prose plugin adds left padding/margins to blockquotes. From the [source code](https://github.com/tailwindlabs/tailwindcss-typography/blob/3963dfede4845f46451db1863fd5321f4cdea03b/src/styles.js#L45-L49):

```javascript
blockquote: {
  marginTop: em(24, 18),
  marginBottom: em(24, 18),
  paddingInlineStart: em(20, 18),  // ~1.11rem left padding
  borderInlineStartWidth: '0.25rem',  // Plus 4px border
}
```

In a narrow container (280-400px), this `~1.11rem + 0.25rem` horizontal offset consumes ~20px, causing text within blockquotes to overflow.

**Fix**: Override blockquote styles: `[&_blockquote]:pl-3 [&_blockquote]:pr-0`

### 4. Prose + Flexbox Container Known Issue

When prose content is inside a flex container, `<pre>` elements with `overflow-x: auto` can cause the flex container to size to the `scrollWidth` of the pre element. From [GitHub issue #96](https://github.com/tailwindlabs/tailwindcss-typography/issues/96):

> "The issue occurs when user attempts to center prose content by wrapping it inside a grid or flex container."

**Fix**: Add `w-full` to flex children, or use `max-w-full` on prose content

## CSS Hierarchy Analysis

The layout chain from sidebar to comment text:

```
CommentSidebar (width: 280-600px, inline style)
  └── ScrollArea (flex-1, overflow-hidden)
        └── ScrollAreaPrimitive.Viewport (w-full h-full)
              └── div.p-4.pr-5.overflow-hidden
                    └── ThreadCard (border rounded-lg overflow-hidden)
                          └── CommentItem
                                └── div.flex.items-start.gap-2
                                      └── div.flex-1.min-w-0  ✅ GOOD
                                            └── div.prose.max-w-none.break-words
                                                  └── ReactMarkdown
```

**Good news**: The `flex-1 min-w-0` is already present on the content container (line 55 of comment-item.tsx).

**Issue**: Despite `min-w-0`, the `display: table` from ScrollArea and missing prose overrides cause overflow.

## Specific Fix Implementation

### Option A: Global CSS Override (Recommended)

Add to `globals.css`:

```css
/* Fix ScrollArea viewport width constraint */
[data-radix-scroll-area-viewport] > div {
  display: block !important;
  max-width: 100%;
}

/* Prose overrides for narrow containers */
.prose-narrow code {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.prose-narrow blockquote {
  padding-left: 0.75rem;
  margin-left: 0;
  margin-right: 0;
}

.prose-narrow pre {
  margin-left: 0;
  margin-right: 0;
}
```

### Option B: Tailwind Class-Based Fix

Update `comment-item.tsx` prose container:

```tsx
// Current
className="prose prose-sm prose-zinc dark:prose-invert max-w-none mt-1 break-words overflow-hidden [&>*]:max-w-full [&_pre]:overflow-x-auto [&_blockquote]:max-w-full"

// Fixed
className={cn(
  "prose prose-sm prose-zinc dark:prose-invert max-w-none mt-1",
  "break-words overflow-hidden",
  // Width constraints
  "[&>*]:max-w-full",
  // Inline code wrapping
  "[&_code]:break-all [&_code]:overflow-wrap-anywhere",
  // Pre/code blocks
  "[&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:m-0",
  // Blockquotes
  "[&_blockquote]:pl-3 [&_blockquote]:m-0 [&_blockquote]:max-w-full",
  // Nested children
  "[&_*]:max-w-full"
)}
```

### Option C: Fix ScrollArea Viewport (Alternative)

Create a custom ScrollArea that removes the table display:

```tsx
// In scroll-area.tsx, add to Viewport:
<ScrollAreaPrimitive.Viewport 
  className="h-full w-full rounded-[inherit] [&>div]:!block [&>div]:!max-w-full"
>
```

## Recommended Approach

Implement **both**:

1. **Option A** (globals.css) - Fixes the structural ScrollArea issue
2. **Option B** (comment-item.tsx) - Prose-specific overflow handling

This provides defense-in-depth and handles all markdown element types.

## Test Cases

After implementing the fix, verify with these markdown patterns:

```markdown
## Test 1: Inline Code Overflow
Check `someVeryLongFunctionNameWithoutAnyBreakPointsThatWillOverflow()` wraps.

## Test 2: Blockquote
> This is a blockquote that should not overflow the sidebar container even when it contains a lot of text.

## Test 3: Nested Elements
> **Note**: Here's some code `longInlineCode()` in a blockquote.

## Test 4: Numbered List
1. First item with `inlineCode` that is very long
2. Second item with a [link](https://example.com)

## Test 5: Code Block
```python
def this_is_a_very_long_function_name_that_should_have_horizontal_scroll():
    pass
```
```

## Files to Modify

1. `/apps/web/src/app/globals.css` - Add ScrollArea viewport fix
2. `/apps/web/src/components/review/comment-item.tsx` - Update prose classes
3. `/apps/web/src/components/ui/scroll-area.tsx` - Optional: Add viewport override

## References

- [Flexbox min-w-0 pattern](https://css-tricks.com/flexbox-truncated-text/)
- [Radix ScrollArea display: table issue](https://github.com/radix-ui/primitives/issues/2722)
- [Tailwind Typography prose modifiers](https://tailwindcss.com/docs/typography-plugin#element-modifiers)
- [Prose code block overflow fix](https://fuzzylimes.net/blog/2023/tailwind-code-block-overflow/)
