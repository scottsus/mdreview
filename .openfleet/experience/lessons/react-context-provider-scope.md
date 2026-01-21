# Lesson: React Context Provider Scope

**Date**: 2026-01-21
**Story**: `theme-toggle-bug-fix`
**Severity**: Medium (Feature completely broken)

## Problem

Implemented a theme toggle feature that appeared to work visually (button rendered, icons displayed) but was completely non-functional. Users couldn't switch between light and dark mode.

## Root Cause

The `ThemeToggle` component was placed **outside** the `ThemeProvider` component in the React tree:

```tsx
// ❌ WRONG - Component outside provider
<ThemeProvider {...props}>
  {children}
</ThemeProvider>
<ThemeToggle />  // useTheme() has no context here
```

When a component using a context hook (like `useTheme()`) is rendered outside its provider, the hook returns default/no-op values instead of throwing an error. This makes the bug subtle and hard to detect.

## Why It Happened

**Common Misconception**: Fixed-position elements (with `position: fixed` in CSS) need to be at the top level of the DOM tree.

**Reality**: CSS positioning is independent of React component tree structure. Fixed-position elements can and should be nested within providers if they need context.

## Solution

Move the component inside the provider scope:

```tsx
// ✅ CORRECT - Component inside provider
<ThemeProvider {...props}>
  {children}
  <ThemeToggle />  // useTheme() has access to context
</ThemeProvider>
```

## Detection

This bug was subtle because:
1. No console errors or warnings
2. Component rendered correctly
3. Button was clickable
4. Only the actual theme-switching functionality was broken

**Red flags to watch for:**
- Context hook returns unexpected default values
- State changes don't trigger updates
- localStorage doesn't get updated
- DOM classes don't change on interaction

## Prevention

### 1. **Provider Scope Rule**
Any component using a context hook MUST be a descendant of that context's provider in the React tree.

### 2. **Testing Checklist**
When implementing context-based features:
- ✅ Visual rendering
- ✅ Interactive functionality (clicks, state changes)
- ✅ Side effects (localStorage, API calls)
- ✅ DOM changes (classes, attributes)
- ✅ Browser console for warnings/errors

### 3. **Code Review**
When reviewing PR with new providers:
- Check that all consumers are inside the provider scope
- Verify in `layout.tsx` or root component
- Don't assume fixed-position = must be outside

## Applicable To

- All React context providers (Theme, Auth, Redux, etc.)
- Next.js App Router layouts
- Any library using React Context API (`useContext`, custom hooks)

## Examples

**Other contexts that need proper scoping:**
- Authentication: `<AuthProvider>` wrapping components using `useAuth()`
- i18n: `<I18nProvider>` wrapping components using `useTranslation()`
- Redux: `<Provider store={store}>` wrapping components using `useSelector()`
- Custom contexts: Any component using `useContext(MyContext)`

## Related

- React Context API documentation
- next-themes library documentation
- Story: `theme-toggle-bug-fix`
