# Git branch prefix conflict

## Context

While working on `resolved-thread-collapse`, attempted to create a task branch `feat/resolved-thread-collapse/implement-collapse` while the story branch `feat/resolved-thread-collapse` already existed.

## Insight

Git refs are stored as files/directories. You cannot have both:
- `refs/heads/feat/story` (a file)
- `refs/heads/feat/story/task` (requires `feat/story` to be a directory)

Error message:
```
fatal: cannot lock ref 'refs/heads/feat/story/task': 
'refs/heads/feat/story' exists; cannot create 'refs/heads/feat/story/task'
```

## Application

Use a consistent branch naming scheme that avoids conflicts:

```
feat/<story>/main           # story branch (instead of feat/<story>)
feat/<story>/tasks/<task>   # task branches
```

If you already created `feat/<story>`, rename it before creating children:

```bash
git branch -m feat/<story> feat/<story>/main
git push origin :feat/<story>              # delete old remote
git push -u origin feat/<story>/main       # push renamed
```

## Related

- [Git ref documentation](https://git-scm.com/book/en/v2/Git-Internals-Git-References)
