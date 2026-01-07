# Stories Directory

Work organized by story (epic-level grouping).

## Structure

```
stories/
├── README.md                           # This file
├── YYYY-WXX/                           # Week-based organization
│   └── <story-name>/
│       ├── README.md                   # Story overview
│       └── tasks/
│           └── MM-DD_<task-name>/
│               ├── Research.md         # Scout the topic
│               ├── HLD.md              # High-level design
│               └── LLD.md              # Low-level design
└── unassigned/                         # Tasks without a story
```

## Naming conventions

- **Week directories**: `YYYY-WXX` (e.g., `2026-W01`)
- **Story directories**: lowercase kebab-case (e.g., `auth-redesign`, `openfleet-v2`)
- **Task directories**: `MM-DD_<task-name>` (e.g., `01-03_implement-save-conversation`)

## Usage

Stories group related tasks under a common theme or epic.
Use week-based directories to organize by time period.

## Story README format

```markdown
# <Story name>

## Goal

<What this story aims to accomplish>

## Tasks

- [ ] <Task 1>
- [ ] <Task 2>

## Status

<Current status: planning | in-progress | completed>
```

## Task HLD format

```markdown
# <Task name> - High Level Design

## Problem

<What problem does this solve>

## Solution

<High-level approach>

## Scope

- <What's included>
- <What's excluded>
```

## Task LLD format

```markdown
# <Task name> - Low Level Design

## Implementation

<Detailed technical approach>

## Files to modify

- `path/to/file.ts`: <changes>

## Testing

<How to verify the implementation>
```
