# AGENTS.md

## Mission
This repository is a local-first React/Vite/PWA project for structured personal project management.
You must preserve the current MVP behavior while improving the codebase incrementally.

## Absolute rules
1. Never work directly on `main`.
2. One PR = one small, clearly scoped objective.
3. Never mix structural refactor and business feature in the same PR if they can be separated.
4. Never change data structures without an explicit migration strategy.
5. Never break existing JSON import/export.
6. Never break existing PWA behavior.
7. Always keep backward compatibility for existing local project data.
8. Prefer small atomic commits.
9. Do not introduce heavy dependencies without justification.
10. Build must pass before proposing a PR.

## Mandatory order of work
1. UI architecture
2. settings
3. i18n
4. markdown preview
5. attachments
6. local user
7. storage abstraction
8. indexeddb migration
9. sync metadata
10. remote abstraction
11. sync engine
12. conflict handling
13. sync status UI

## Pull request policy
Each PR must include:
- objective
- files changed
- risks
- validation steps
- rollback plan

A PR must be refused if:
- it mixes multiple subprojects
- it changes the JSON model without migration
- it is too large to review safely
- it does not explain how to test

## Scope discipline
When working from an issue:
- implement only that issue
- do not anticipate future issues unless strictly necessary
- if a blocker is found, stop and explain it clearly

## Data safety
Existing user data stored in browser storage must never be silently lost.
Any migration must be explicit, minimal, and reversible when possible.

## Coding guidance
- Prefer clarity over cleverness
- Keep components small and readable
- Isolate business logic from UI when possible
- Avoid unnecessary abstractions
- Preserve current UX unless the issue explicitly changes it

## Current project priorities
This repository is being upgraded in a controlled way.
The immediate priority is not random cleanup.
The immediate priority is to follow the planned roadmap issue by issue.

## If no issue is specified
Do not perform broad refactors.
Instead:
1. inspect the repo
2. identify the smallest safe next step
3. propose it clearly before making large changes