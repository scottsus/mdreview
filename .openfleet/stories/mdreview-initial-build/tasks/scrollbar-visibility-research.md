# Research: Make ScrollArea Scrollbar Visible on Left Side

## Problem Summary

The scrollbar in the `ScrollArea` component is invisible when positioned on the left side. The scrollbar should be always visible (not auto-hiding) and positioned on the left.

## Root Cause

**The Radix UI ScrollArea component uses `type="hover"` by default**, which auto-hides the scrollbar when not hovering. This is why the scrollbar appears invisible.

### Official Documentation Confirmation

From the [Radix UI ScrollArea API Reference](https://www.radix-ui.com/primitives/docs/components/scroll-area):

| Prop | Type | Default |
|------|------|---------|
| `type` | `enum` | `"hover"` |

The `type` prop controls scrollbar visibility behavior:
- `"hover"` (default): Scrollbar visible only on hover
- `"always"`: Scrollbar always visible
- `"scroll"`: Scrollbar visible while scrolling
- `"auto"`: Scrollbar visible when content overflows

### GitHub Discussion Solution

From [radix-ui/primitives#3028](https://github.com/radix-ui/primitives/discussions/3028):

> **Solution**: include `type="always"` on scroll area:
> ```tsx
> <ScrollArea type="always" className="...">
> ```
> The Scrollbar are now visible even if you are not hovering the scroll area.

## Current Implementation Analysis

### Files Affected

1. **`/apps/web/src/components/ui/scroll-area.tsx`** - ScrollArea component definition
2. **`/apps/web/src/components/review/review-client.tsx`** - Uses ScrollArea (line 101)
3. **`/apps/web/src/components/review/comment-sidebar.tsx`** - Uses ScrollArea (line 83)

### Current Code

```tsx
// scroll-area.tsx - The Root doesn't forward the `type` prop
const ScrollArea = React.forwardRef<...>(
  ({ className, children, scrollbarPosition = "right", ...props }, ref) => (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}  // type prop would be passed here via spread
    >
      ...
    </ScrollAreaPrimitive.Root>
  )
)
```

The current implementation uses `...props` spread, which means `type` could already be passed through. However, the component interface doesn't explicitly expose this prop.

### Usage Sites

```tsx
// review-client.tsx line 101
<ScrollArea className="flex-1 min-w-0" scrollbarPosition="left">

// comment-sidebar.tsx line 83  
<ScrollArea className="flex-1" scrollbarPosition="left">
```

## Solution

### Option 1: Pass `type="always"` at usage sites (Quick Fix)

The `...props` spread already forwards unknown props to `ScrollAreaPrimitive.Root`, so this should work immediately:

```tsx
// review-client.tsx
<ScrollArea className="flex-1 min-w-0" scrollbarPosition="left" type="always">

// comment-sidebar.tsx
<ScrollArea className="flex-1" scrollbarPosition="left" type="always">
```

### Option 2: Explicitly add `type` to component interface (Better DX)

Update `scroll-area.tsx` to explicitly expose the `type` prop:

```tsx
interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  scrollbarPosition?: "left" | "right";
  // type is already part of ScrollAreaPrimitive.Root props via extends
}
```

Since `ScrollAreaProps` extends `ScrollAreaPrimitive.Root`, the `type` prop should already be typed correctly via the spread.

### Scrollbar Color

The scrollbar thumb uses `bg-border` class:
```tsx
<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
```

The `--border` CSS variable is defined in `globals.css`:
- Light mode: `240 5.9% 90%` (light gray)
- Dark mode: `240 3.7% 15.9%` (dark gray)

This should be visible, but if contrast is an issue, consider using a more visible color like `bg-muted-foreground/50`.

## Recommended Implementation

1. **Simplest fix**: Just add `type="always"` to the usage sites:
   - `review-client.tsx` line 101
   - `comment-sidebar.tsx` line 83

2. **No changes needed to scroll-area.tsx** - The props are already forwarded correctly.

3. **Optional enhancement**: If scrollbar visibility is still poor, update the thumb color:
   ```tsx
   // In scroll-area.tsx
   <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-muted-foreground/50" />
   ```

## Testing Checklist

- [ ] Scrollbar visible without hovering
- [ ] Scrollbar positioned on left side
- [ ] Scrollbar thumb has visible contrast
- [ ] Scrolling still works correctly
- [ ] No horizontal scrollbar appears unexpectedly

## Related Files

| File | Purpose |
|------|---------|
| `apps/web/src/components/ui/scroll-area.tsx` | Component definition |
| `apps/web/src/components/review/review-client.tsx` | Main content area |
| `apps/web/src/components/review/comment-sidebar.tsx` | Comments panel |
| `apps/web/src/app/globals.css` | CSS variables including `--border` |
