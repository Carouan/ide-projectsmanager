# AGENTS.md

## Mission
This repository is a local-first React/Vite/PWA project for structured personal project management.
You must preserve the current MVP behavior while improving the codebase incrementally.

## Core operating principle
This repository is developed issue by issue.
The agent must behave like a disciplined implementation agent, not like a broad exploratory reviewer.

## Absolute rules
1. Never work directly on `main`.
2. One run = one GitHub issue.
3. One branch = one GitHub issue.
4. One PR = one GitHub issue.
5. Never mix structural refactor and business feature in the same PR if they can be separated.
6. Never change data structures without an explicit migration strategy.
7. Never break existing JSON import/export.
8. Never break existing PWA behavior.
9. Always keep backward compatibility for existing local project data.
10. Prefer small atomic commits.
11. Do not introduce heavy dependencies without justification.
12. Build must pass before proposing a PR.
13. Preserve current UX unless the issue explicitly requires change.

## Mandatory order of work

The original front, storage and sync-foundation sequence is complete. The current
implementation order is:

1. global project-bundle restore (`R1.7`)
2. portable backup-provider abstraction (`S1.1`)
3. user-selected folder adapter as progressive enhancement (`S1.2`)
4. per-device portable snapshots (`S1.3`)
5. restore and divergence detection UI (`S1.4`)
6. Windows/Android guide and validation matrix (`S1.5`)
7. versioned `.ipm` package with binary attachments, later (`S2.1`)

Follow `docs/roadmaps/local-first-syncthing-roadmap.md`. Do not revive the old
generic remote-backend sequence as the current product roadmap.

## Product scope boundaries

- IndexedDB remains the authoritative working storage on each device.
- A selected filesystem folder is an optional portable backup mirror.
- Syncthing is an external folder synchronizer, not the application database.
- Manual global JSON export/import remains the universal fallback.
- Multi-user accounts, invitations, roles, phase permissions and real-time
  collaboration are out of foreseeable scope.
- Never silently overwrite local data during restore or synchronization.
- GitHub repository monitoring and Project Steward integration are independent
  from personal portfolio synchronization.

## Issue execution rules
When an issue is explicitly requested:

- implement exactly that issue and nothing else
- do not anticipate future issues unless strictly necessary to unblock the current issue
- do not batch multiple issues in one run
- if multiple issues are requested together, refuse batching and execute only one issue
- if the issue is ambiguous, choose the narrowest safe interpretation
- if blocked, stop and explain the blocker clearly

## Execution mode requirements
This repository is intended for implementation runs, not read-only QA runs.

When an issue is explicitly requested, the agent must:
- work in an edit-capable mode
- make the requested code changes
- run the relevant validation steps
- commit the changes
- push the branch
- open a pull request

If the current session is read-only or cannot create files, commits, branches, pushes, or pull requests:
- stop immediately
- report clearly that the environment is not write-enabled
- do not replace implementation with a QA-only answer
- ask for a write-enabled implementation run on the same issue

## Branch policy
- always create one branch per issue
- branch naming format: `feature/issue-<number>-<short-description>`
- never reuse a branch from another issue
- never open a PR from `main`

## Pull request policy
Each PR must include:
- objective
- changes made
- impacted files
- risks
- validation steps
- rollback plan

A PR must be refused if:
- it mixes multiple issues
- it mixes multiple subprojects without necessity
- it changes the JSON model without migration
- it is too large to review safely
- it does not explain how to test

## Pull request requirements
After implementing an issue:

- push the branch to the repository
- create a pull request automatically
- include a clear and concise title
- include a structured description:
  - objective
  - changes made
  - impacted files
  - risks
  - validation steps
  - rollback plan
- ensure the PR is small and reviewable
- include `Closes #<issue-number>` in the PR body if the PR fully resolves the issue
- if the PR only partially resolves the issue, include `Partially addresses #<issue-number>` instead
- do not open a PR if validation fails
- if validation fails, report the failure clearly and stop

## Commit policy
- prefer small atomic commits
- commit message format should be explicit and scoped
- recommended examples:
  - `refactor(front): move project screens into feature folders`
  - `feat(layout): add AppShell with right panel slot`
  - `feat(settings): add settings slice and defaults`

## Validation policy
Before opening a PR, run only the validations relevant to the issue.

Minimum expected validation:
- build passes
- changed imports or file moves are verified
- no obvious regression introduced in the touched area

When relevant, include:
- `npm run build`
- targeted grep / path checks after file moves
- targeted tests if they exist

Do not claim validation that was not actually run.

## Data safety
Existing user data stored in browser storage must never be silently lost.
Any migration must be explicit, minimal, and reversible when possible.

If a data model change is necessary:
- add normalization or migration logic
- preserve backward compatibility
- explain the migration in the PR

## Coding guidance
- prefer clarity over cleverness
- keep components small and readable
- isolate business logic from UI when possible
- avoid unnecessary abstractions
- use shared constants instead of repeating string literals
- prefer deterministic behavior over implicit magic
- keep refactors minimal and local to the requested issue

## Current project priorities
This repository is being upgraded in a controlled way.
The immediate priority is not random cleanup.
The global bundle restore is implemented by issue `#81` / `R1.7`. Once that PR
is merged, the immediate priority is `S1.1` (`#82`), followed by the remaining
`S1` roadmap documented in `docs/roadmaps/local-first-syncthing-roadmap.md` and
accepted in
`docs/decisions/DR-002-local-first-syncthing-backup-architecture.md`.

## If no issue is specified
Do not perform broad refactors.
Instead:
1. inspect the repo
2. identify the smallest safe next step
3. propose it clearly before making large changes

## If the requested issue is already implemented
If the requested issue appears already implemented:
- verify it against the codebase
- do not re-implement it blindly
- report that it appears complete
- identify the next missing issue only if explicitly asked

## Definition of done for a run
A run is complete only if:
- exactly one issue was implemented
- relevant validation was run successfully
- changes were committed
- branch was pushed
- a PR was opened
- the PR body is structured correctly
- the PR closes the issue when appropriate
