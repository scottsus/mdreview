# ⛴️ Openfleet

Long-term project management with built in self-healing capabilities
managed by agent fleet.

This directory is meant to be managed by Openfleet agents, and is typically
not for humans, though it would be difficult to mess this up unintentionally.

## For Agents 🤖

Understand `## Structure`, then see `./status/current.md`, and other necessary
files before starting your current task.

## Structure

```
.openfleet/
├── README.md
├── status/
│   ├── current.md         # Anchor point - agent reads this first
│   └── README.md
├── sessions/              # Agent transcripts / journals
│   └── README.md
├── stories/               # Work organized by story/epic
│   ├── README.md
│   └── unassigned/
│       └── README.md
├── docs/
│   ├── README.md
│   └── working/           # Agent scratch space
│       └── README.md
├── experience/            # Self-healing long term memory
│   ├── README.md
│   ├── Mnemosyne.md
│   ├── runbooks/          # Used for recurring tasks, like Claude Agent Skills
│   ├── troubleshooting/   # Used for common errors
│   ├── lessons/           # Used for learning from past mistakes
│   └── blunders/          # Used for learning from stupid mistakes
├── standards/
│   ├── README.md
│   ├── code-style.md
│   ├── architecture.md
│   ├── testing.md
│   └── review-checklist.md
└── reviews/               # Human review artifacts
    └── README.md
```

## Flexibility

This template is a _general_ guide for project management. Feel free to customize
as you wish.
