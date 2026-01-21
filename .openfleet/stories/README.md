# Stories

Work organized by story/epic. Each story follows the git worktree pattern and SPARR framework.

## Active Stories

_None currently active_

## Completed Stories (2026-01-21)

### 1. dark-mode-toggle ✅
**Branch**: `feat/dark-mode-toggle` (merged to main)  
**Commit**: `a2402a1`  
**Date**: 2026-01-21

Implemented light/dark mode toggle using next-themes:
- Theme toggle button in top-right corner
- Animated sun/moon icons
- localStorage persistence + system preference detection
- FOUC prevention and hydration safety

**Files**: +79 lines, 5 files changed  
**Components**: theme-provider.tsx, theme-toggle.tsx

---

### 2. yellow-highlight-consistency ✅
**Branch**: `feat/yellow-highlight-consistency` (merged to main)  
**Commit**: `abf3138`  
**Date**: 2026-01-21

Fixed active thread highlighting inconsistency:
- All blocks now show yellow highlight for active threads
- Previously headers/lists showed purple (incorrect)
- One-line parameter addition

**Files**: +1 line, 1 file changed

---

### 3. resolved-thread-collapse ✅
**Branch**: `feat/resolved-thread-collapse` (merged via PR #1)  
**Commit**: `4d45fe8`  
**Date**: 2026-01-14

Collapsed resolved threads in sidebar:
- Resolved threads collapse to header-only when not selected
- Unresolved threads remain expanded
- Active resolved thread stays expanded
- Smooth collapse/expand animation using Radix Collapsible

**PR**: https://github.com/scottsus/mdreview/pull/1

---

### 4. thread-click-scroll ✅
**Commits**: `500f080`, `4edff05`  
**Date**: 2026-01-13

Improved thread navigation UX:
- Scroll sidebar to active thread automatically
- Scroll to block when clicking thread in sidebar
- Highlight active code lines in yellow

---

### 5. simplify-review-ux ✅
**Commit**: `09c9c3f`  
**Date**: 2026-01-13

Simplified review workflow:
- Removed approval workflow complexity
- Focused on comments-only model
- Cleaner, more intuitive UX

---

## Git Worktree Pattern

```
main/dev
 │
 └──► feat/<story>
       │
       ├──► feat/<story>--<task>
       │     │
       │     └──► feat/<story>--<task>--<branch>
       │           ╰─────● resolved or escalated
       │
       ╰─────● merged to main
```

## SPARR Framework

Every task follows:
1. **Scout** - Research & exploration → `Research.md`
2. **Plan** - High/low level design → `HLD.md`, `LLD.md`
3. **Act** - Implementation → `Implementation.md`
4. **Review** - Code review (when needed)
5. **Reflect** - Learnings → experience/ directory

## Story Structure

```
stories/<story-name>/
├── README.md              # Story overview, goals, tasks
├── tasks/
│   └── MM-DD_<task>/
│       ├── Research.md
│       ├── HLD.md
│       ├── LLD.md
│       ├── Implementation.md
│       └── branches/      # If task had sub-branches
│           └── <name>/
│               ├── Research.md
│               ├── HLD.md
│               ├── LLD.md
│               └── Implementation.md
└── ...
```

## Metrics

**Total Completed**: 5 stories  
**Latest Activity**: 2026-01-21  
**Lines Added**: ~80+ lines across recent stories  
**Zero Breaking Changes**: ✅
