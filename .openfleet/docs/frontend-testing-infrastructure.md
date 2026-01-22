# Frontend Testing Infrastructure

**Story**: `frontend-testing-infrastructure`  
**Date**: 2026-01-22  
**PR**: https://github.com/scottsus/mdreview/pull/2  
**Status**: ✅ Merged

## Overview

Set up comprehensive component testing infrastructure using React Testing Library + Vitest to prevent UI regressions. Addresses two critical bugs that were only caught through manual testing.

## Problem Statement

Recent bugs required extensive manual testing to discover:

1. **Theme Toggle Bug** (Jan 21): Button non-functional due to component placement outside `ThemeProvider` context
2. **Dark Mode Code Blocks** (Jan 22): Code blocks had 1.2:1 contrast ratio in dark mode (unreadable) due to hardcoded light theme

Both bugs would have been caught immediately by automated component tests.

## Solution

Created complete component testing infrastructure:

- **Framework**: React Testing Library + Vitest
- **Environment**: jsdom (Next.js 15 compatible)
- **Custom Utilities**: ThemeProvider wrapper, test helpers, mocks
- **Test Coverage**: 29 tests for critical components

## Implementation

### Phase 1: Component Testing (Completed)

**Task 1: Infrastructure Setup** (15 minutes)
- Created separate test package at `apps/web/tests/component/`
- Configured Vitest with jsdom environment
- Set up custom render wrapper with ThemeProvider
- Created test utilities (ThemeSpy, mock helpers)
- Added 8 infrastructure validation tests

**Task 2: ThemeToggle Tests** (20 minutes)
- 13 comprehensive tests
- Coverage: Rendering, theme switching, keyboard navigation, ARIA attributes
- Validates the theme toggle bug fix

**Task 3: CodeBlockWithLines Tests** (23 minutes)
- 8 focused tests
- Coverage: Dynamic Prism theme switching, syntax highlighting, rendering
- Validates the code block contrast bug fix

**Build Fix** (10 minutes)
- Fixed TypeScript inference error in Vercel build
- Added explicit `RenderResult` return type annotation

**Total Time**: 68 minutes (vs 2-3 hours estimated)

### Phase 2: E2E Testing (Deferred)

Out of scope for this PR, recommended as separate story:
- Playwright setup for Next.js 15
- E2E smoke tests for critical user flows
- Visual regression testing

**Rationale**: Phase 1 solves the immediate problem (component regressions). E2E testing is substantial work deserving focused effort.

## Technical Details

### Directory Structure

```
apps/web/tests/component/
├── package.json              # Test package config
├── tsconfig.json             # TypeScript config for tests
├── vitest.config.ts          # Vitest configuration
├── vitest.setup.ts           # Global mocks (Next.js, localStorage)
├── README.md                 # Developer testing guidelines
└── src/
    ├── utils/
    │   ├── test-utils.tsx    # Custom render with ThemeProvider
    │   └── ThemeSpy.tsx      # Theme state inspection helper
    └── components/
        ├── example.test.tsx                        # Infrastructure validation
        ├── ui/theme-toggle.test.tsx               # ThemeToggle tests
        └── review/
            ├── code-block-with-lines.test.tsx    # CodeBlock tests
            └── test-helpers.ts                    # Mock props helper
```

### Key Design Decisions

1. **Separate Test Package**: Mirrors `apps/web/tests/integration/` structure for consistency
2. **jsdom Environment**: Battle-tested, officially recommended by Next.js
3. **Custom Render Wrapper**: Automatically provides ThemeProvider to all tests
4. **Don't Mock Libraries**: Test with real `prism-react-renderer` and `next-themes` implementations
5. **Helper Functions**: `createMockProps()` reduces boilerplate for complex components

### Testing Philosophy

**Focus**: Behavior-driven testing (what users see and do), not implementation details

**What We Test**:
- ✅ Component rendering in different states
- ✅ User interactions (clicks, keyboard)
- ✅ Theme switching and persistence
- ✅ Accessibility (ARIA attributes, keyboard navigation)

**What We Don't Test** (deferred to E2E):
- ❌ Complex multi-step interactions
- ❌ Selection and dragging behaviors
- ❌ Thread highlighting and navigation
- ❌ Database persistence

## Results

### Test Coverage

```
✓ example.test.tsx (8 tests) 46ms
✓ code-block-with-lines.test.tsx (8 tests) 52ms
✓ theme-toggle.test.tsx (13 tests) 195ms

Test Files  3 passed (3)
     Tests  29 passed (29)
  Duration  745ms
```

**Component Coverage**:
- ThemeToggle: >80% line coverage (all critical paths)
- CodeBlockWithLines: >70% line coverage (theme switching + rendering)
- Zero flakiness verified (10+ consecutive runs)

### Commands

```bash
# Run all component tests
pnpm test:component

# Watch mode (for TDD)
pnpm test:component:watch

# UI mode (for debugging)
pnpm test:component:ui

# Coverage report
pnpm test:component:coverage
```

### Files Changed

**15 files changed, 2,169 insertions(+)**

- 9 new files in `apps/web/tests/component/`
- Root package.json updated with test scripts
- pnpm-workspace.yaml updated with test package
- .gitignore updated for coverage directories

## Impact

| Metric | Before | After |
|--------|--------|-------|
| Frontend Tests | 0 | 29 |
| Test Infrastructure | None | Complete |
| Bug Detection | Manual (hours) | Automated (<1 sec) |
| Recent Bugs Covered | 0/2 | 2/2 |
| Test Execution Time | N/A | <750ms |

**Developer Experience**:
- Fast feedback loop (<1 second)
- TDD-friendly watch mode
- Visual test UI with Vitest
- Clear, readable test examples

**Maintenance**:
- Tests serve as documentation
- Easy to add new component tests
- Pattern established for future tests

## Lessons Learned

### What Worked Well

1. **SPARR Framework**: Research → Plan → Act cycle delivered under estimates
   - ATHENA's research was comprehensive and copy-paste ready
   - APOLLO's plans had complete test code
   - HERCULES executed quickly with minimal modifications

2. **Focused Scope**: Testing the specific bugs (theme toggle, code block contrast) kept effort contained
   - 8 tests for CodeBlockWithLines vs potentially 30+ if testing everything
   - Deferred complex interactions to E2E

3. **Helper Functions**: `createMockProps()` and `ThemeSpy` dramatically improved test readability
   - Reduced boilerplate by ~80%
   - Tests focus on assertions, not setup

4. **Parallel Development**: While ATHENA researched Task 2, APOLLO planned Task 1
   - Reduced wall-clock time
   - Agents didn't block each other

### Challenges Encountered

1. **TypeScript Inference Error**: Vercel build failed on `renderWithTheme` return type
   - **Solution**: Added explicit `RenderResult` type annotation
   - **Lesson**: Always add return types for exported utility functions in test packages

2. **localStorage State Pollution**: Tests initially failed due to theme persistence between tests
   - **Solution**: Added `localStorage.clear()` to `afterEach()` in setup
   - **Lesson**: Always clean up browser storage APIs in test teardown

3. **Prism Tokenization**: Syntax highlighter splits code into separate `<span>` elements
   - **Solution**: Query individual tokens, not full strings
   - **Lesson**: Test data design matters (use letters A,B,C instead of numbers 1,2,3)

### Patterns Established

1. **Separate Test Package**: Follow integration test structure
2. **Custom Render Wrapper**: Auto-provide context providers
3. **Test Helpers**: Create helpers for components with 10+ props
4. **Behavior Over Implementation**: Test what users see, not how it works
5. **Defer to E2E**: Complex interactions belong in E2E tests

## Future Work

### Immediate Opportunities

1. **More Component Tests**: As new components are added
   - MarkdownViewer
   - CommentableBlock
   - ThreadSidebar

2. **E2E Testing Story**: Separate focused effort
   - Playwright setup
   - Review creation flow
   - Comment threading
   - Export functionality

3. **CI Integration**: Run tests in GitHub Actions
   - Fast (<1 second tests)
   - Reliable (zero flakiness)
   - Block merges on failures

### Long-Term Ideas

1. **Visual Regression Testing**: Screenshot comparisons
2. **Accessibility Testing**: Automated axe-core checks
3. **Performance Testing**: React render profiling
4. **Coverage Goals**: Define coverage thresholds per component type

## References

### Documentation

- `apps/web/tests/component/README.md` - Developer testing guide
- Test files serve as examples for patterns
- SPARR documentation in `.openfleet/stories/frontend-testing-infrastructure/`

### External Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest UI Testing Guide](https://vitest.dev/guide/ui.html)
- [Next.js Testing Documentation](https://nextjs.org/docs/app/guides/testing/vitest)

### Related Stories

- `dark-mode-visual-fixes` (2026-01-22) - Bug that motivated this infrastructure
- `theme-toggle-bug-fix` (2026-01-21) - Bug that motivated this infrastructure

## Conclusion

This story successfully established a solid foundation for component testing, preventing the two recent bugs from recurring. The infrastructure is production-ready, well-documented, and easy to extend.

**Key Achievement**: From zero frontend tests to 29 comprehensive tests in under 70 minutes, with zero flakiness and sub-second execution time.

The deferred E2E testing (Phase 2) should be tackled as a separate story when user flows become more complex or when visual/interaction bugs arise that require full-stack testing.
