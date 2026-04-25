---
name: pre-pr-check
description: Run the full pre-PR gauntlet before opening a pull request. Use when the user says "ready to PR", "open a PR", "make a PR", "ship it", or after they've finished implementing a feature and want to merge. Runs typecheck, lint, tests, then invokes the code-reviewer agent for adversarial review. Drafts a PR description but does NOT open the PR.
allowed-tools: Bash, Read, Task
---

# Pre-PR Check

Before any PR opens, walk this checklist. Do not skip steps even if "the change is small" — small changes are where bugs hide because nobody looks hard.

## Steps

### 1. Diff sanity check

```bash
git status
git diff main...HEAD --stat
```

Show the changed files to the user. Confirm the list matches what they think they changed. **Stop if anything looks unintended** — extra files, accidental commits, generated artefacts.

### 2. Typecheck

Detect the project type and run the right command:

- **TypeScript**: `npm run typecheck`, falling back to `npx tsc --noEmit`
- **Python**: `mypy .` if configured, or `pyright`

Fix every error before continuing. If a type error reveals a real bug, fix the bug — don't widen the type.

### 3. Lint

- **TypeScript**: `npm run lint`
- **Python**: `ruff check .`

Fix or explicitly justify every warning. New `eslint-disable` or `# noqa` lines need a one-line comment explaining why.

### 4. Tests

- **TypeScript**: `npm test`
- **Python**: `pytest`

All tests pass. **No new `.skip` or `.todo`** in this branch — if a test is being deferred, the user explicitly approves it first.

### 5. Adversarial review

Invoke the `code-reviewer` subagent. Pass it the branch name and ask it to review against `main`.

Read its output. For every `BLOCKER` or `MAJOR` issue:
- Either fix it, or
- Write a one-line justification for why it's acceptable in this PR (e.g. "tracked in #1234, out of scope here")

`MINOR` and `NIT` items are surfaced to the user but don't block the PR.

### 6. PR description draft

Draft a description with these sections:

- **What changed** — one paragraph, plain English
- **Why** — the problem this solves, not a restatement of the diff
- **How to test** — steps a reviewer can follow
- **What could break** — risks, side effects, things to watch for after merge

Show the draft to the user. **Do not open the PR yourself** — the user opens it. Your job ends at "here's what I would write."

## Gotchas

- If the project has a `Makefile`, `justfile`, `package.json` script, or `pyproject.toml` task called `check` / `ci` / `verify`, **prefer that over individual commands** — it'll match what CI actually runs.
- If tests take more than 60 seconds, run them in a subagent so the output doesn't bloat the main context. You only need pass/fail and the failing test names.
- If `git diff main...HEAD` is empty, the user probably hasn't pushed their branch or is already on main. Ask before assuming.
- Never `git push`. Never `gh pr create`. Never `git commit` unless the user explicitly says so.
- If the user is in a hurry and asks to skip steps, push back once. If they insist, comply but log which steps were skipped in your final summary.
