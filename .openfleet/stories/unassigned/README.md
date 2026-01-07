# Unassigned Tasks

Tasks that don't belong to a specific story.

## Structure

```
unassigned/
├── README.md                    # This file
└── MM-DD_<task-name>/
    ├── HLD.md                   # High-level design (optional for small tasks)
    └── LLD.md                   # Low-level design (optional for small tasks)
```

## Usage

Place standalone tasks here that are:

- Quick fixes
- One-off requests
- Not part of a larger initiative

Move to a story directory when they become part of a larger effort.

## When to skip HLD/LLD

For trivial tasks (< 1 hour of work), a single `notes.md` is sufficient:

```markdown
# <Task name>

## What

<Brief description>

## Changes

- <Change 1>
- <Change 2>
```
