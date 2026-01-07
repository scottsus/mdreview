# Mnemosyne

_The goddess of memory and mother of the Muses._

This is the index of accumulated experience. Consult before tackling unfamiliar problems.

## Recent Activity

_No activity yet._

### Runbooks

_No runbooks yet._

### Troubleshooting Guides

_No guides yet._

### Lessons Learned

_No lessons yet._

### Blunders to Avoid

_No blunders recorded._

---

## File Naming Conventions

### Runbooks

Use lowercase kebab-case: `<task-name>.md`

- `deploy-to-production.md`
- `rotate-api-keys.md`
- `onboard-new-service.md`

### Troubleshooting

Use lowercase with underscore: `<error-type>_<context>.md`

- `build-failure_missing-deps.md`
- `runtime-error_null-pointer.md`
- `test-flake_async-timing.md`

### Lessons

Use lowercase kebab-case with suffix: `<topic>-lesson.md`

- `prefer-composition-over-inheritance-lesson.md`
- `batch-database-queries-lesson.md`
- `early-return-pattern-lesson.md`

### Blunders

Use lowercase kebab-case with suffix: `<descriptive-name>-blunder.md`

- `api-key-exposure-blunder.md`
- `missing-null-check-blunder.md`
- `wrong-environment-deploy-blunder.md`

---

## Templates

### Runbook

```markdown
# <Task name>

## Purpose

<What this runbook accomplishes>

## Prerequisites

- <What's needed before starting>
- <Required access, tools, etc.>

## Steps

1. <First actionable step>
2. Run `scripts/deploy.sh --env staging`
3. <Can reference scripts in the repo>

## Verification

- <How to confirm success>
- <Expected outcomes>
```

### Troubleshooting

```markdown
# <Error type>: <Brief description>

## Symptoms

- <How the problem manifests>
- <Error messages, behaviors observed>

## Root cause

<Why this happens - the underlying reason>

## Solution

1. <Step to fix>
2. <Next step>
3. <Continue as needed>

## Prevention

- <How to avoid this in the future>
- <Configuration, practices to adopt>
```

### Lesson

```markdown
# <Brief title of the lesson>

## Context

<When/where this was learned - the situation that led to this insight>

## Insight

<The key learning - what was discovered>

## Application

- <How to apply this going forward>
- <Specific practices to adopt>

## Related

- <Links to relevant docs, code, or external resources>
```

### Blunder

```markdown
# <Brief title describing the blunder>

## What happened

<Description of the mistake - what was done wrong>

## Impact

<What went wrong as a result - consequences>

## Root cause

<Why it happened - the underlying reason>

## Prevention

<How to avoid this in the future - proactive measures>

## Detection

<How to catch early if it happens again - monitoring/review steps>
```

---

_Updated when new experience is captured._
