# Documentation Directory

Design documents and working notes.

## Structure

```
docs/
├── README.md              # This file
├── adr/                   # Architecture decision records
│   └── 001-use-postgres.md
├── guides/                # How-to guides for humans
│   └── local-development.md
└── working/               # Agent scratch space for drafts
    └── <document-name>.md
```

## File naming

Use lowercase kebab-case:

- `openfleet-v2-hld.md`
- `auth-redesign-proposal.md`
- `api-migration-plan.md`

## Usage

The `working/` directory is for temporary documents being drafted by agents.
Once finalized, move docs to appropriate directories under `docs/` or `stories/`.

## Format

Working documents are freeform, but commonly include:

```markdown
# <Document title>

## Overview

<Brief description of what this document covers>

## <Section 1>

<Content>

## <Section 2>

<Content>
```

For design docs specifically (HLD/LLD), see the story task format in `stories/README.md`.
