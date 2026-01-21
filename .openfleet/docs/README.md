# Documentation

Permanent documentation for MDReview implementation details.

## Feature Documentation

### [Dark Mode Toggle](./dark-mode-toggle.md)
**Date**: 2026-01-21  
**Commit**: `a2402a1`

Implementation of light/dark mode toggle using next-themes library. Includes theme provider, toggle component, FOUC prevention, and hydration safety patterns.

**Key Files**: theme-provider.tsx, theme-toggle.tsx  
**Dependencies**: next-themes@^0.4.6

---

### [Yellow Highlight Consistency](./yellow-highlight-consistency.md)
**Date**: 2026-01-21  
**Commit**: `abf3138`

Fixed inconsistent highlighting for active comment threads. All block types (headers, paragraphs, lists, code) now show yellow highlighting when their threads are active.

**Key Files**: commentable-block.tsx

---

## How to Use This Directory

- **Feature docs**: Detailed implementation guides for completed features
- **Architecture decisions**: Rationale for major technical choices
- **Integration guides**: How components work together
- **Migration notes**: Breaking changes and upgrade paths (when applicable)

## Related Directories

- `../stories/` - Detailed work logs organized by story
- `../experience/` - Learnings, runbooks, troubleshooting guides
- `../standards/` - Code style, testing, review guidelines
