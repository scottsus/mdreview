# Dark Mode Toggle Implementation

**Date**: 2026-01-21  
**Story**: `dark-mode-toggle`  
**Commit**: `a2402a1`

## Problem

The app had dark mode styles throughout (via Tailwind `dark:` variants) but no way for users to toggle between light and dark themes. Users were stuck with their system preference with no manual control.

## Solution

Implemented a theme toggle using the `next-themes` library (industry standard for Next.js + App Router apps).

### Components Created

1. **`theme-provider.tsx`** (11 lines)
   - Thin wrapper around next-themes provider
   - Handles theme state management
   - Integrates with Next.js App Router

2. **`theme-toggle.tsx`** (40 lines)
   - Toggle button with animated sun/moon icons
   - Mounted state guard to prevent hydration mismatches
   - Smooth CSS animations (300ms rotation/scale)
   - Accessibility features (aria-label, sr-only text)

### Layout Modifications

Modified `layout.tsx` to:
- Wrap app with `ThemeProvider`
- Add `suppressHydrationWarning` to `<html>` tag (prevents FOUC)
- Place toggle button in fixed top-right corner

## Features

✅ **Automatic localStorage persistence** - Theme preference saved across sessions  
✅ **System preference detection** - Respects OS dark/light mode on first visit  
✅ **Hydration mismatch prevention** - Mounted state guard prevents SSR issues  
✅ **FOUC prevention** - suppressHydrationWarning + next-themes magic  
✅ **Smooth animations** - Icon transitions with CSS transforms  
✅ **Accessibility** - Proper ARIA labels and screen reader text  
✅ **Zero breaking changes** - No modifications to existing components  

## Technical Details

### Theme Management Flow

```
User clicks toggle
  ↓
next-themes updates localStorage
  ↓
next-themes sets class="dark" on <html>
  ↓
Tailwind dark: variants apply
  ↓
UI updates instantly
```

### FOUC Prevention

1. `suppressHydrationWarning` on `<html>` tag allows class mismatch
2. next-themes injects blocking script in `<head>` to set theme before paint
3. Mounted state guard prevents toggle from rendering until client-side

### Hydration Safety

The toggle component uses a mounted state pattern:
```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return <Button disabled><span /></Button>
```

This ensures server HTML matches client HTML on first render, preventing React hydration errors.

## Files Changed

- `apps/web/src/components/theme-provider.tsx` (created, +11 lines)
- `apps/web/src/components/ui/theme-toggle.tsx` (created, +40 lines)
- `apps/web/src/app/layout.tsx` (modified, +14 lines)
- `apps/web/package.json` (modified, +1 dependency)
- `pnpm-lock.yaml` (modified)

**Total**: 5 files, +79 lines

## Dependencies Added

- `next-themes@^0.4.6` (~16KB minified)

## Testing Checklist

- [ ] Visual: Toggle button appears in top-right corner
- [ ] Visual: Sun icon shows in light mode, moon in dark mode
- [ ] Functional: Clicking toggle switches theme instantly
- [ ] Functional: Theme persists after page reload
- [ ] Functional: Theme persists across navigation
- [ ] Cross-page: Works on landing page
- [ ] Cross-page: Works on review viewer page
- [ ] FOUC: No flash of wrong theme on page load
- [ ] System: Respects OS preference on first visit
- [ ] Hydration: No React hydration errors in console
- [ ] Dark mode: All components render correctly in dark theme

## Git Tree

```
main
 │
 └──► feat/dark-mode-toggle
       │
       └──► feat/dark-mode-toggle--implementation
             └── a2402a1 feat: add light/dark mode toggle
             ╰─────● merged to main
```

## Lessons Learned

1. **Use established libraries** - `next-themes` handles all edge cases (FOUC, hydration, SSR) that would be painful to implement manually
2. **Mounted state pattern is critical** - Prevents hydration mismatches in client-only features
3. **suppressHydrationWarning is safe here** - When used specifically for theme management, it's the recommended approach
4. **CSS transitions > JS animations** - Smoother, more performant, easier to maintain
5. **Fixed positioning for global controls** - Top-right corner is conventional and non-disruptive

## Future Enhancements

Potential improvements (not needed now):
- Add "system" option to toggle through light/dark/system modes
- Add keyboard shortcut (e.g., Cmd+Shift+L)
- Add transition animation to theme switch (fade/slide)
- Custom theme colors beyond light/dark
