# IDE Project Manager — Master instructions for Codex

> Single source of truth for the next implementation phase.
> This document supersedes the two earlier notes and merges them into one stricter operating framework.

---

## 0. Project baseline

Codex must assume the repository already provides these core capabilities:

- multi-project management
- versioned stages `v0.0 -> v1.0`
- backlog
- project journal
- decisions block
- decision tree for sorting new ideas
- JSON export
- JSON import
- Markdown export
- installable PWA

Technical baseline:

- React
- Vite
- `vite-plugin-pwa`
- local-first behavior

Non-goal for this phase:

- no backend in production
- no real authentication
- no real-time collaboration
- no heavy architectural rewrite without a staged migration path

---

## 1. Absolute implementation rules

These rules are mandatory.

1. Work only on a dedicated branch.
2. One PR = one objective.
3. Do not mix structural refactor and business feature in the same PR when they can be split.
4. Preserve current behavior unless the PR explicitly documents an intended behavior change.
5. Build must pass before proposing a PR.
6. Lint must pass before proposing a PR, or the PR must explicitly explain why lint is temporarily unavailable.
7. Never break existing JSON import/export.
8. Any data model change requires an explicit migration note.
9. Any risky change requires a rollback note.
10. Prefer atomic commits.
11. Do not introduce heavy dependencies without written justification.
12. Any PR must include:
    - objective
    - files changed
    - risks
    - validation steps
    - rollback steps
13. If a change exceeds the intended PR scope, stop and split it.
14. If a migration is incomplete, do not merge.
15. No direct work on `main`.

---

## 2. Git workflow policy

### Branches

- `main` = stable, releasable
- `feat/...` = feature branch
- `refactor/...` = structural refactor branch when needed
- `docs/...` = documentation-only branch when needed

### Branch naming

Use this format:

- `feat/front-01-app-shell`
- `feat/front-02-settings-slice`
- `feat/front-03-i18n-core`
- `feat/front-04-markdown-preview`
- `feat/front-05-attachments-v1`
- `feat/sync-01-user-profile`
- `feat/sync-02-storage-abstraction`
- `feat/sync-03-indexeddb`
- `feat/sync-04-sync-metadata`
- `feat/sync-05-sync-engine`

### Commit format

Use Conventional Commits.

Examples:

- `feat(front): add app shell layout`
- `refactor(front): move screens into feature folders`
- `feat(settings): add persisted settings slice`
- `feat(i18n): add translation dictionaries`
- `feat(markdown): add right panel preview`
- `feat(attachments): add attachments v1`
- `feat(user): add local user profile`
- `feat(storage): add indexeddb adapter`
- `feat(sync): add project sync metadata`

---

## 3. PR size policy

Target size:

- ideal: 150 to 300 useful lines
- warning threshold: > 500 useful lines
- warning threshold: > 8 to 12 touched files

A PR should be rejected if:

- it mixes architecture + data model + business feature without necessity
- it changes the JSON schema without migration
- it does not explain how to test
- it has no rollback path
- it modifies too many components at once for unclear reasons

---

## 4. Global execution order

Codex must work in this order and not skip ahead.

1. Front architecture foundations
2. Settings foundations
3. i18n foundations and migration
4. Markdown preview panel
5. Attachments v1
6. Local user profile
7. Storage abstraction
8. IndexedDB migration
9. Sync metadata
10. Remote repository abstraction
11. Sync engine skeleton
12. Conflict handling strategy
13. Sync status UI

Do not start sync work before front foundations are stable.

---

## 5. Target architecture

Codex should converge toward this structure gradually, without a dangerous big-bang rewrite.

```text
src/
  app/
    AppShell.jsx
    routes.jsx

  components/
    layout/
      TopBar.jsx
      Sidebar.jsx
      RightPanel.jsx
    ui/
      Button.jsx
      Input.jsx
      Textarea.jsx
      EmptyState.jsx
      Toggle.jsx
      Select.jsx

  features/
    projects/
      components/
      screens/
      hooks/
    stages/
      components/
      hooks/
    backlog/
      components/
    journal/
      components/
    decisions/
      components/
    settings/
      screens/
      components/
    markdown/
      components/
        MarkdownPreview.jsx
    attachments/
      components/

  i18n/
    fr.json
    en.json
    index.js
    useI18n.js

  store/
    index.js
    projectsSlice.js
    uiSlice.js
    settingsSlice.js
    userSlice.js

  services/
    storage/
      localRepository.js
      projectRepository.js
      userRepository.js
    sync/
      localRepository.js
      remoteRepository.js
      syncEngine.js
    markdownExport.js
    jsonImportExport.js

  constants/
    stages.js
    uiDefaults.js
    settingsDefaults.js
    syncDefaults.js

  utils/
    dates.js
    markdown.js
    migrations.js
```

This is a target structure, not permission for one massive refactor PR.

---

## 6. Roadmap A — Front Foundations

### Definition of done for Roadmap A

Roadmap A is complete only when all of the following are true:

- front architecture is modularized enough to support future growth
- persistent settings exist
- i18n works in at least French and English
- Markdown preview works from a right-side panel
- attachments v1 exists and persists in JSON
- build succeeds
- PWA behavior is not broken
- JSON import/export is not broken
- no major regression in current MVP features

---

### Epic F0 — Governance docs

#### PR F0.1 — Add governance docs

**Goal**
Add project governance docs so Codex has written constraints inside the repository.

**Files to create**

- `docs/roadmap-front-foundations.md`
- `docs/pr-checklist.md`
- `docs/rollback-policy.md`

**Validation**

- docs exist
- docs are readable
- no runtime change

**Rollback**

- delete the docs

---

### Epic F1 — Front architecture

#### PR F1.1 — Introduce `AppShell`

**Goal**
Create an application shell without changing business behavior.

**Tasks**

- create `src/app/AppShell.jsx`
- create `components/layout/`
- move layout orchestration into the shell
- keep visible behavior nearly identical

**Do not**

- do not move all features at once
- do not introduce i18n here
- do not change project data structures here

**Validation**

- `npm run build`
- existing navigation still works
- visual rendering is the same or extremely close

**Rollback**

- revert the PR cleanly

#### PR F1.2 — Restructure screens into feature folders

**Goal**
Move screens into a modular structure.

**Tasks**

- create `features/projects/screens`
- move `ProjectListScreen`
- move `ProjectScreen`
- fix imports only as needed

**Do not**

- do not change business logic
- do not change the stored JSON schema

**Validation**

- build passes
- list/project navigation passes
- no visible regression

**Rollback**

- revert the file moves

#### PR F1.3 — Introduce right panel layout slot

**Goal**
Prepare a clean right-side slot for Markdown preview.

**Tasks**

- add `rightPanel` slot to layout
- add responsive CSS
- keep panel disabled or empty by default

**Validation**

- UI remains stable on desktop and narrow layouts
- no regression in existing editor flow

**Rollback**

- revert the layout slot

---

### Epic F2 — Settings foundations

#### PR F2.1 — Add settings defaults and slice

**Goal**
Create the real `settings` foundation.

**Minimum settings**

```json
{
  "theme": "dark",
  "language": "fr",
  "markdownPreviewEnabled": true,
  "markdownPreviewDock": "right",
  "uiDensity": "comfortable",
  "autosave": true,
  "exportFormat": "markdown"
}
```

**Tasks**

- create `store/settingsSlice.js`
- create `constants/settingsDefaults.js`
- hydrate missing values for existing documents

**Validation**

- legacy projects still load
- missing values are injected safely
- build passes

**Rollback**

- revert settings slice and restore previous behavior

#### PR F2.2 — Persist settings cleanly

**Goal**
Guarantee settings persistence across reloads.

**Tasks**

- centralize persistence logic
- avoid ad-hoc persistence from random components
- document manual validation

**Validation**

- language persists after refresh
- theme persists after refresh
- no project loss

**Rollback**

- revert persistence wiring

#### PR F2.3 — Add `SettingsScreen`

**Goal**
Expose settings in a dedicated UI.

**Tasks**

- create `features/settings/screens/SettingsScreen.jsx`
- add controls for language, theme, markdown preview, UI density, default export format

**Validation**

- screen is reachable
- changes are editable
- persistence works

**Rollback**

- remove screen while keeping state intact if needed

---

### Epic F3 — i18n

#### PR F3.1 — Add i18n core

**Goal**
Introduce a lightweight local i18n layer.

**Files**

- `src/i18n/fr.json`
- `src/i18n/en.json`
- `src/i18n/index.js`
- `src/i18n/useI18n.js`

**Constraints**

- no heavy i18n framework unless strongly justified
- stable keys
- safe fallback behavior

**Suggested core API**

```js
export const dictionaries = { fr, en };

export function t(lang, key, params = {}) {
  // simple key resolution with fallback
}
```

**Validation**

- engine works before full migration
- fallback works

**Rollback**

- revert i18n core only

#### PR F3.2 — Migrate global app strings

**Goal**
Translate global shell-level UI first.

**Files likely affected**

- `App.jsx`
- top bar
- tabs
- global buttons
- generic messages

**Validation**

- visible language switching works
- no major hardcoded global strings remain

**Rollback**

- revert migration

#### PR F3.3 — Migrate project and stage strings

**Goal**
Translate project and stage editors.

**Files likely affected**

- `ProjectScreen`
- `StageEditor`

**Validation**

- labels are correct in `fr` and `en`
- editing behavior unchanged

**Rollback**

- revert migration

#### PR F3.4 — Migrate backlog, journal, decisions, decision tree, PWA prompt

**Goal**
Finish the main UI translation layer.

**Validation**

- core paths are translatable end-to-end
- no major hardcoded strings remain in those modules

**Rollback**

- revert migration

---

### Epic F4 — Markdown preview

#### PR F4.1 — Add Markdown rendering utility

**Goal**
Create a lightweight Markdown preview component.

**Tasks**

- add a Markdown renderer dependency only if justified and lightweight
- create `features/markdown/components/MarkdownPreview.jsx`

**Constraints**

- this is preview only
- do not turn the editor into WYSIWYG

**Validation**

- base rendering works
- no editor regression

**Rollback**

- remove dependency and component

#### PR F4.2 — Add preview toggle from settings

**Goal**
Control the preview panel through settings.

**Tasks**

- read `markdownPreviewEnabled`
- show or hide right panel accordingly

**Validation**

- toggle works
- state persists after reload

**Rollback**

- revert panel toggle wiring

#### PR F4.3 — Render active stage content in preview

**Goal**
Render the active stage content.

**Minimum fields to render**

- objective
- notes
- deliverable
- definitionOfDone

**Validation**

- preview follows active stage
- no obvious lag
- editor remains stable

**Rollback**

- revert content binding

---

### Epic F5 — Attachments v1

#### PR F5.1 — Add attachment model

**Goal**
Create a minimal structured attachments model.

**Suggested shape**

```json
{
  "id": "att_xxx",
  "type": "url",
  "title": "Readable label",
  "description": "Context",
  "url": "",
  "fileName": "",
  "content": "",
  "createdAt": ""
}
```

Supported initial types:

- `url`
- `note`
- `snippet`
- `file_ref`

**Tasks**

- add model helpers
- add create/update/delete helpers
- preserve JSON compatibility

**Validation**

- attachments persist
- import/export still works

**Rollback**

- revert model changes

#### PR F5.2 — Add attachments panel UI

**Goal**
Create minimal CRUD UI for attachments.

**Tasks**

- list attachments
- add attachment
- edit attachment
- delete attachment

**Validation**

- CRUD works
- persistence works

**Rollback**

- revert UI

#### PR F5.3 — Link attachments into project screen

**Goal**
Make attachments usable from the main project workflow.

**Validation**

- entry point is visible and coherent
- no regression in other tabs

**Rollback**

- revert project integration

---

## 7. Roadmap B — User + Sync Foundations

### Definition of done for Roadmap B

Roadmap B is complete only when all of the following are true:

- a local user profile exists
- each project has `ownerId`
- storage is abstracted cleanly
- IndexedDB is used or ready as the serious local persistence layer
- project sync metadata exists
- a remote repository abstraction exists
- a sync engine skeleton exists
- simple conflict detection exists
- sync status is visible in UI
- backend/provider remains swappable

---

### Epic U0 — Sync architecture docs

#### PR U0.1 — Add sync architecture docs

**Goal**
Write the sync strategy before implementation.

**Files**

- `docs/sync-architecture.md`
- `docs/conflict-policy.md`
- `docs/user-model.md`

**Validation**

- docs are present and coherent

**Rollback**

- delete docs

---

### Epic U1 — User foundations

#### PR U1.1 — Add local user profile model

**Goal**
Create a local `UserProfile`.

**Suggested shape**

```json
{
  "id": "user_local_xxx",
  "displayName": "User",
  "language": "fr",
  "theme": "dark",
  "createdAt": "",
  "updatedAt": ""
}
```

**Tasks**

- create `models/user.defaults.js`
- create `store/userSlice.js`
- generate local user on first launch

**Validation**

- user is created automatically
- user persists

**Rollback**

- revert user model

#### PR U1.2 — Attach `ownerId` to projects

**Goal**
Associate every project with an owner.

**Tasks**

- migrate legacy projects
- enforce `ownerId`

**Validation**

- no orphan projects remain
- legacy data still loads

**Rollback**

- revert migration cleanly

---

### Epic U2 — Storage abstraction

#### PR U2.1 — Introduce storage repository interfaces

**Goal**
Stop direct storage access from UI and random modules.

**Files**

- `services/storage/localRepository.js`
- `services/storage/projectRepository.js`
- `services/storage/userRepository.js`

**Validation**

- no direct `localStorage` calls remain in components
- build passes

**Rollback**

- revert repository layer

#### PR U2.2 — Implement IndexedDB project storage

**Goal**
Move project persistence toward IndexedDB.

**Tasks**

- add IndexedDB adapter
- migrate legacy project data
- keep JSON import/export as safety net

**Validation**

- existing projects are recovered
- create/edit/delete still works
- reload works

**Rollback**

- temporarily route back to previous adapter if needed

#### PR U2.3 — Migrate settings and user storage consistently

**Goal**
Make storage behavior consistent across project, settings, and user data.

**Validation**

- user and settings persist
- no silent data loss

**Rollback**

- revert storage migration

---

### Epic U3 — Sync metadata

#### PR U3.1 — Add sync metadata to `ProjectDocument`

**Goal**
Introduce explicit sync metadata.

**Suggested shape**

```json
{
  "sync": {
    "localVersion": 5,
    "remoteVersion": 3,
    "lastSyncedAt": "",
    "dirty": true
  }
}
```

**Fields to add**

- `ownerId`
- `localVersion`
- `remoteVersion`
- `lastSyncedAt`
- `dirty`
- `deletedAt` optional
- `deviceId` optional later

**Validation**

- migration is soft
- import/export still works

**Rollback**

- revert sync metadata addition

#### PR U3.2 — Update write paths to maintain sync metadata

**Goal**
Mark local writes correctly.

**Rules**

- any meaningful project write increments `localVersion`
- any meaningful unsynced change sets `dirty = true`

**Validation**

- dirty flag behaves predictably
- local version increments consistently

**Rollback**

- revert write path modifications

---

### Epic U4 — Remote abstraction

#### PR U4.1 — Add remote repository interface

**Goal**
Abstract the future remote provider.

**Suggested API**

```js
export const RemoteProjectRepository = {
  listProjects,
  fetchProject,
  pushProject,
  deleteProject,
};
```

**Validation**

- no provider lock-in
- signatures are stable

**Rollback**

- revert interface layer

#### PR U4.2 — Add mock remote provider

**Goal**
Test sync flows without a real backend.

**Validation**

- manual sync tests are possible
- nothing depends on a production backend

**Rollback**

- revert mock provider

---

### Epic U5 — Sync engine

#### PR U5.1 — Add sync engine skeleton

**Goal**
Create a minimal sync engine.

**Functions to expose**

- `pushProject`
- `pullProject`
- `syncProject`
- `computeConflict`

**Validation**

- skeleton is testable
- disabled sync has no negative runtime impact

**Rollback**

- revert sync engine skeleton

#### PR U5.2 — Implement simple conflict strategy

**Goal**
Introduce a minimal but explicit conflict policy.

**Policy**

- controlled last-write-wins
- if local is dirty and remote changed since last sync, mark conflict
- do not overwrite silently
- full field-level merge is out of scope

**Validation**

- conflicts are detectable
- no silent overwrite

**Rollback**

- revert conflict strategy

#### PR U5.3 — Add sync status UI

**Goal**
Expose sync status per project.

**Statuses**

- `local-only`
- `dirty`
- `synced`
- `conflict`
- `error`

**Validation**

- status is visible and coherent

**Rollback**

- revert sync status UI

---

### Epic U6 — Sync settings and profile UI

#### PR U6.1 — Add sync preferences to settings

**Minimum settings**

```json
{
  "syncEnabled": false,
  "syncProvider": "none",
  "syncOnStartup": true,
  "syncOnManualSave": true,
  "conflictPolicy": "ask"
}
```

**Validation**

- settings persist

**Rollback**

- revert sync preferences

#### PR U6.2 — Add profile and sync panel

**Goal**
Expose user and sync controls in UI.

**Validation**

- profile block visible
- sync settings editable
- still no backend dependency required

**Rollback**

- revert profile/sync panel

---

## 8. PR checklist template

Every PR must contain this checklist.

```md
## Objective
- What this PR changes

## Scope
- Why this PR is intentionally limited

## Files changed
- List of key files/directories touched

## Risks
- Known regressions or migration risk

## Validation
- [ ] npm run build
- [ ] lint passes, or reason documented
- [ ] existing project list works
- [ ] existing project editor works
- [ ] JSON export works
- [ ] JSON import works
- [ ] PWA flow not obviously broken
- [ ] manual test steps documented

## Data migration
- [ ] no schema change
or
- [ ] schema change documented
- [ ] migration included
- [ ] legacy data manually verified

## Rollback
- How to revert safely in one short paragraph
```

---

## 9. Merge policy

1. Never merge a PR that spans multiple sub-projects of the roadmap.
2. Never merge a data model change without migration notes.
3. Merge in this order:
   - architecture
   - settings
   - i18n
   - markdown preview
   - attachments
   - user
   - storage abstraction
   - IndexedDB
   - sync metadata
   - remote abstraction
   - sync engine
   - conflict handling
   - sync status UI
4. If uncertain, split the PR.
5. Prefer many small clean merges over one difficult merge.

---

## 10. Master prompt for Codex

Use this prompt as the starting instruction block.

```text
You are continuing implementation on an existing React/Vite/PWA application.

Project baseline:
- multi-project management
- versioned stages
- backlog
- journal
- decisions block
- decision tree
- JSON export/import
- Markdown export
- installable PWA

Your mission is to execute the implementation in strict stages, with small safe PRs.

Absolute rules:
- one branch per PR
- one PR = one objective
- do not mix structural refactor and business feature when separable
- preserve existing behavior unless the PR explicitly documents a behavior change
- build must pass before proposing a PR
- lint must pass before proposing a PR, or explain why not
- never break JSON import/export
- any schema change requires migration notes
- any risky change requires rollback notes
- prefer atomic commits
- do not work directly on main

Execution order:
1. front architecture foundations
2. settings foundations
3. i18n foundations and migration
4. markdown preview panel
5. attachments v1
6. local user profile
7. storage abstraction
8. IndexedDB migration
9. sync metadata
10. remote repository abstraction
11. sync engine skeleton
12. conflict handling strategy
13. sync status UI

PR constraints:
- ideal PR size: 150-300 useful lines
- suspicious if >500 useful lines
- suspicious if >8-12 files modified
- reject a PR if it mixes architecture + data + feature unnecessarily
- reject a PR if it changes schema without migration
- reject a PR if it does not explain how to test

Every PR must include:
- objective
- files changed
- risks
- validation
- rollback

Target architecture is modular and should gradually converge toward:
- src/app
- src/components/layout
- src/components/ui
- src/features/projects
- src/features/stages
- src/features/backlog
- src/features/journal
- src/features/decisions
- src/features/settings
- src/features/markdown
- src/features/attachments
- src/i18n
- src/store
- src/services/storage
- src/services/sync
- src/constants
- src/utils

Roadmap A definition of done:
- modular front architecture
- persistent settings
- i18n fr/en
- right panel markdown preview
- attachments v1
- build OK
- PWA not broken
- JSON import/export not broken

Roadmap B definition of done:
- local user profile exists
- each project has ownerId
- storage abstraction exists
- IndexedDB is implemented or cleanly prepared
- sync metadata exists
- remote abstraction exists
- sync engine skeleton exists
- conflict detection exists
- sync status UI exists
- backend/provider remains swappable

Work incrementally.
If a task is too large, split it before coding.
Do not perform a big-bang rewrite.
```

---

## 11. First PRs to execute now

If Codex needs the immediate next sequence, use exactly this order:

1. `F0.1` Add governance docs
2. `F1.1` Introduce `AppShell`
3. `F1.2` Restructure screens into feature folders
4. `F1.3` Introduce right panel layout slot
5. `F2.1` Add settings defaults and slice
6. `F2.2` Persist settings cleanly
7. `F2.3` Add `SettingsScreen`
8. `F3.1` Add i18n core
9. `F3.2` Migrate global app strings
10. `F3.3` Migrate project and stage strings

No sync work before these are stable.

---

## 12. Final instruction to Codex

When in doubt:

- reduce scope
- avoid implicit schema changes
- preserve portability
- preserve local-first behavior
- prefer explicit migration over hidden mutation
- prefer reversible change over clever change

