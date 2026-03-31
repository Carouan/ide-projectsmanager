# Review findings backlog

> Consolidated notes extracted from merged pull requests and adjacent review observations.
> Purpose: preserve useful findings without polluting the main roadmap with premature issues.
>
> Source PRs reviewed for this document:
> - PR #27
> - PR #28
> - PR #29
> - PR #30
> - PR #31
> - PR #32
> - PR #33

---

## How to use this document

Each finding is classified as one of:

- **addressed**: already resolved by a merged PR
- **monitor**: not urgent, but worth keeping visible
- **candidate-issue**: may justify a future dedicated issue/PR
- **do-not-act-now**: valid observation, but outside the current phase

This file is **not** the roadmap source of truth.
The roadmap remains:
- `AGENTS.md`
- `docs/codex-master-plan.md`
- GitHub Issues

---

## A. Findings already addressed by merged PRs

### A1. Backlog status vocabulary was inconsistent
**Source**: PR #27 and earlier review observations.

**Problem observed**
- backlog items used mixed status values such as `open`, `todo`, `planned`, `done`, `dropped`
- this created inconsistent UI and data semantics

**Addressed by**
- introducing `BACKLOG_STATUS`
- adding `normalizeBacklogStatus`
- normalizing existing backlog data on load and update paths

**Status**
- **addressed**

---

### A2. Journal stage selector was hardcoded and incomplete
**Source**: PR #27 and earlier review observations.

**Problem observed**
- `JournalPanel` stage options were hardcoded
- some stage definitions were missing from the selector

**Addressed by**
- rendering stage options from `STAGE_DEFINITIONS`

**Status**
- **addressed**

---

### A3. Project screens were not yet organized in the target feature structure
**Source**: PR #28.

**Problem observed**
- `ProjectListScreen` and `ProjectScreen` still lived in the older flat screen structure

**Addressed by**
- moving screens into `src/features/projects/screens`
- updating imports cleanly

**Status**
- **addressed**

---

### A4. App shell / right panel layout foundation was missing
**Source**: PR #29.

**Problem observed**
- no stable layout slot for the future Markdown preview or right-side contextual panel

**Addressed by**
- adding `src/app/AppShell.jsx`
- reserving a `rightPanel` slot
- adding responsive CSS behavior

**Status**
- **addressed**

---

### A5. Settings defaults were implicit and not centralized
**Source**: PR #30.

**Problem observed**
- settings keys were not managed from a single defaults source
- missing settings could lead to inconsistent behavior across existing vs new projects

**Addressed by**
- introducing `DEFAULT_SETTINGS`
- backfilling missing settings during normalization
- adding an update path in the store

**Status**
- **addressed**

---

### A6. UI settings did not survive refreshes reliably
**Source**: PR #31.

**Problem observed**
- settings persistence was not managed as a dedicated global concern

**Addressed by**
- adding `loadSettings()` / `saveSettings()`
- introducing rehydration of global settings state

**Status**
- **addressed**

---

### A7. No dedicated settings screen existed
**Source**: PR #32.

**Problem observed**
- language/theme/markdown preview controls had no app-level screen

**Addressed by**
- adding `SettingsScreen`
- wiring navigation from list/project views

**Status**
- **addressed**

---

### A8. No minimal i18n core existed
**Source**: PR #33.

**Problem observed**
- the repository had no translation provider, dictionaries, or fallback mechanism

**Addressed by**
- adding dictionaries
- adding provider + `useI18n`
- wiring settings language into app root

**Status**
- **addressed**

---

## B. Follow-up findings worth monitoring

### B1. Global vs per-project settings may diverge
**Source**: PR #31 risk note.

**Observation**
- the current implementation preserves backward compatibility by combining global persisted settings with project settings
- this may create ambiguity if multiple projects intentionally hold different settings values

**Why it matters**
- later features (i18n, markdown preview, sync) need a clear answer to: are settings global, per-project, or hybrid?

**Recommended handling**
- keep under review during the next settings/i18n steps
- do not open a new issue immediately unless a real bug appears

**Status**
- **monitor**

---

### B2. Backlog status values are normalized, but unknown statuses are still permissive
**Source**: review observation after PR #27.

**Observation**
- `normalizeBacklogStatus()` maps known legacy values but may still pass through unknown unexpected values instead of coercing to a canonical fallback

**Why it matters**
- malformed imports or later edits could leave technically valid but semantically unknown statuses in data

**Recommended handling**
- treat as a future hardening task if invalid status data appears in practice

**Status**
- **monitor**

---

### B3. Backlog badge currently displays raw technical status
**Source**: review observation after PR #27.

**Observation**
- UI can still show raw values such as `open`, `planned`, `done`, `dropped`
- this is fine for now, but later UX polish may want translated human-readable labels

**Why it matters**
- once i18n progresses, raw internal values may feel inconsistent in the interface

**Recommended handling**
- defer until the i18n / UX pass reaches backlog UI

**Status**
- **do-not-act-now**

---

## C. Candidate issues that may deserve future dedicated PRs

### C1. Clarify settings ownership model
**Potential future issue title**
`Clarify whether settings are global-only, per-project, or hybrid`

**Reason**
- the current compatibility layer is sensible, but the target architecture should explicitly define the model before deeper sync/user work

**When to create**
- only if the ambiguity starts causing real implementation friction in later phases

**Status**
- **candidate-issue**

---

### C2. Add stricter validation for imported or persisted backlog statuses
**Potential future issue title**
`Harden backlog status normalization against unknown values`

**Reason**
- useful defensive hardening, but not roadmap-critical right now

**When to create**
- only if bad imported data or unexpected statuses are observed

**Status**
- **candidate-issue**

---

### C3. Add translated display labels for backlog statuses
**Potential future issue title**
`Add UI labels and i18n mapping for backlog statuses`

**Reason**
- would improve user-facing consistency once the i18n migration reaches backlog modules

**When to create**
- later, during or after issue(s) related to backlog/journal/decisions string migration

**Status**
- **candidate-issue**

---

## D. Findings intentionally not promoted to issues now

### D1. Minor structural polish after screen move
Examples:
- optional index/barrel files
- further layout component decomposition
- cosmetic folder cleanup

**Reason not promoted now**
- these do not block the current roadmap and risk creating cleanup noise

**Status**
- **do-not-act-now**

---

### D2. Broader refactor of store architecture
**Observation**
- `useAppStore` remains a central concentration point

**Reason not promoted now**
- this is known, but the roadmap intentionally prefers incremental extraction instead of a large early rewrite

**Status**
- **do-not-act-now**

---

## E. Immediate guidance for future triage

Before creating a new issue from any review comment, ask:

1. Does it break the current phase?
2. Does it cause data loss, regression, or merge friction now?
3. Is it already covered implicitly by an existing roadmap issue?
4. Can it wait until the current roadmap phase is complete?

If the answer to 1 or 2 is **yes**, it may justify a new issue.
Otherwise, keep it here until it becomes clearly actionable.

---

## F. Current conclusion

At this stage, the best strategy is:

- continue the ordered roadmap
- avoid opening cleanup issues too early
- preserve this document as the backlog of review-derived observations
- promote items from this file into real GitHub issues only when they become materially useful
