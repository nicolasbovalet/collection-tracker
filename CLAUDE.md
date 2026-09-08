# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Workflow

- **Commit continuously.** Don't let work pile up uncommitted across a whole session. Commit each logical change (a feature, a fix, a refactor, a config change) as soon as it's done and verified, rather than leaving everything staged for one giant commit at the end.
- Keep commits scoped to one coherent change each — split unrelated work (e.g. a dependency/config change vs. a page redesign vs. a new feature) into separate commits rather than bundling them.
- Still only commit when it's reasonable to do so (working tree in a good state, tests/build passing for what's being committed) — don't commit broken intermediate states.
