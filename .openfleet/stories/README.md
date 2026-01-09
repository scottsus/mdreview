# Stories Directory

Working tree for active stories. **This directory is gitignored.**

## Structure

```
stories/
├── README.md                      # This file
└── <story-name>/
    ├── README.md                  # Story overview, goals
    ├── Research.md                # Scout's findings
    ├── HLD.md                     # High-level design
    ├── LLD.md                     # Low-level design
    ├── Implementation.md          # Actor's report
    └── tasks/
        └── <MM-DD_task-name>/
            ├── README.md          # Task overview
            ├── Research.md
            ├── HLD.md
            ├── LLD.md
            ├── Implementation.md
            └── branches/          # For discovered issues
                └── <branch-name>/
                    ├── README.md
                    ├── Research.md
                    ├── HLD.md
                    ├── LLD.md
                    ├── Implementation.md
                    └── branches/  # Recursive (unlimited depth)
```

## Naming Conventions

- **Story directories**: lowercase kebab-case (`auth-redesign`, `openfleet-v2`)
- **Task directories**: `MM-DD_<task-name>` (month-day, e.g. `01-05_jwt-validation` for Jan 5)
- **Branch directories**: lowercase kebab-case (`fix-expiry`, `add-caching`)

## Git Alignment

File system paths map to git branches:

| Path                                                        | Git Branch                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| `stories/agent-harness-hardening/`                          | `feat/agent-harness-hardening`                                 |
| `stories/agent-harness-hardening/tasks/01-05_plugin-hooks/` | `feat/agent-harness-hardening/plugin-hooks`                    |
| `stories/.../branches/fix-opencode-hooks/`                  | `feat/agent-harness-hardening/plugin-hooks/fix-opencode-hooks` |

## Branch Complexity Tiers

When Zeus discovers an issue mid-task:

| Tier    | Criteria              | Action                         |
| ------- | --------------------- | ------------------------------ |
| Trivial | <10 lines, obvious    | Actor fixes inline             |
| Medium  | Needs investigation   | Create `branches/`, mini-SPARR |
| Hard    | Cross-cutting concern | Escalate to sibling story      |

## Story Lifecycle

1. Zeus creates story directory + git branch
2. SPARR cycle: Scout → Planner → Actor → Reviewer → Reflector
3. If issue discovered: assess tier, branch if needed
4. On completion: Zeus compresses to `docs/<story>.md`
5. Working files can be deleted (gitignored anyway)

## Story README Format

```markdown
# <Story Name>

**Created**: YYYY-MM-DD
**Status**: planning | in_progress | completed
**Branch**: feat/<story-name>

## Goal

<What this story aims to accomplish>

## Tasks

- [ ] <Task 1>
- [x] <Task 2> ← completed

## Git Tree

<Current branch topology - maintained by Zeus>
```

## Example: Complete Story with Branches

This example demonstrates a real story with nested branches, escalation, and resolution.

### File System Structure

```
stories/
└── agent-harness-hardening/
    ├── README.md
    ├── Research.md
    ├── HLD.md
    ├── LLD.md
    └── tasks/
        ├── 01-05_plugin-hooks/
        │   ├── README.md
        │   ├── Research.md
        │   ├── HLD.md
        │   ├── LLD.md
        │   └── branches/
        │       └── fix-opencode-hooks/
        │           ├── README.md
        │           ├── Research.md      ← mini-SPARR
        │           ├── HLD.md
        │           ├── LLD.md
        │           └── branches/
        │               └── add-hook-regression-tests/    ← nested branch (2 levels deep)
        │                   ├── README.md
        │                   ├── Research.md
        │                   └── LLD.md
        │
        ├── 01-07_transcript-pipeline/
        │   ├── README.md
        │   ├── Research.md
        │   ├── HLD.md
        │   ├── LLD.md
        │   └── branches/
        │       └── add-browser-mcp/     ← escalated to sibling story
        │           ├── README.md
        │           └── Research.md      ← Scout found it's too big
        │
        └── 01-09_tool-registry/
            ├── README.md
            ├── Research.md
            ├── HLD.md
            └── LLD.md                   ← simple task, no branches needed
```

### Corresponding Git Tree

```
main
 │
 ├──► feat/agent-harness-hardening                              a1b2c3d start agent harness hardening
 │     │
 │     ├──► feat/agent-harness-hardening/plugin-hooks           b2c3d4e harden opencode plugin hooks
 │     │     │
 │     │     ├──► feat/agent-harness-hardening/plugin-hooks/fix-opencode-hooks
 │     │     │     │                                            c3d4e5f fix hook edge case
 │     │     │     │
 │     │     │     ├──► feat/agent-harness-hardening/plugin-hooks/fix-opencode-hooks/add-hook-regression-tests
 │     │     │     │     │                                      d4e5f6g add regression test coverage
 │     │     │     │     │
 │     │     │     ╰─────●                                      ← resolved (merged to fix-opencode-hooks)
 │     │     │     │
 │     │     │     └── e5f6g7h tests passing
 │     │     │
 │     │     ╰─────●                                            ← resolved (merged to plugin-hooks)
 │     │     │
 │     │     └── f6g7h8i hook hardening complete
 │     │
 │     ╰─────●                                                  ← resolved (merged to agent-harness-hardening)
 │     │
 │     ├──► feat/agent-harness-hardening/transcript-pipeline    g7h8i9j implement transcript pipeline
 │     │     │
 │     │     ├──► feat/agent-harness-hardening/transcript-pipeline/add-browser-mcp
 │     │     │     │                                            h8i9j0k scout browser mcp integration
 │     │     │     │
 │     │     ╰─────✕                                            ← escalated to feat/browser-mcp-integration
 │     │     │
 │     │     └── i9j0k1l transcript pipeline (sans browser mcp)
 │     │
 │     ╰─────●                                                  ← resolved (merged to agent-harness-hardening)
 │     │
 │     ├──► feat/agent-harness-hardening/tool-registry          j0k1l2m implement tool registry
 │     │     │
 │     │     └── k1l2m3n tool registry complete
 │     │
 │     ╰─────●                                                  ← resolved (merged to agent-harness-hardening)
 │     │
 │     └── l2m3n4o agent harness hardening complete
 │
 ╰─────● PR #47 merged to main


stories/browser-mcp-integration/                               ← sibling story (escalated from transcript-pipeline)
└──► feat/browser-mcp-integration                              m3n4o5p start browser mcp integration
      │
      └── (in progress...)
```

### Legend

| Symbol    | Meaning                          |
| --------- | -------------------------------- |
| `├──►`    | Branch created                   |
| `╰─────●` | Resolved (merged back to parent) |
| `╰─────✕` | Escalated (became sibling story) |
