# User guide

This guide explains how to use IDE-projectsmanager without imposing a method
limited to software projects. The application works locally in the browser and
separates complementary kinds of project information.

## Start a project

1. Create a project and give it a clear title.
2. Summarize the need and the intended outcome in a few sentences.
3. Open **Stages** and begin with `v.0.0`.
4. Use the backlog for future actions, the journal for context, and decisions
   for important choices.
5. Create a JSON backup regularly.

The **New idea** button classifies an idea that appears during a project. It
does not automatically create a separate project and does not replace this
guide.

## Prepare a governed project

**+ New project** remains the immediate path for a purely local idea. Choose
**Governed project** when a project needs an explicit mandate and a canonical
GitHub repository compatible with Project Steward:

1. Enter the project name, objective, context, and intended repository as
   `owner/repository` or its HTTPS GitHub URL.
2. Add at least one deliverable and one measurable success criterion, one per
   line; optionally describe included scope, exclusions, and constraints.
3. Verify declared visibility, which defaults to private, then inspect every
   document under **Files ready for review**.
4. Download individual files or export the versioned JSON package before any
   publication.
5. Select **Create local governed project** to open the project; all five files
   remain available under **Attachments**.

The prepared files are `PROJECT_MANDATE.md`, `PROJECT_CONTEXT.md`,
`PROJECT_STATUS.md`, `.project-steward.yml`, and `README.md`. One stable
identifier connects the local project, manifest, and declared repository.

No repository is created, modified, or published automatically. Visibility is
only declared, and actual repository existence remains unverified. **Cancel**
returns to the dashboard without creating a local project.

## Read a private GitHub repository

A linked public repository never requires a token. For a repository declared
private, open **Settings → Private GitHub access**:

1. Choose **Configure a fine-grained token on GitHub**, explicitly select the
   allowed repositories, and choose a short expiration period.
2. Set `Metadata`, `Contents`, and `Pull requests` to **read-only**; add
   `Commit statuses` as read-only only when detailed checks are needed.
3. Enter the token in the concealed field and choose **Authorize read access
   for this session**.
4. Return to the project or dashboard to view available roadmap objectives,
   pull requests, and validation requests without modifying the repository.
5. Choose **Disconnect and clear private cache** when finished, then delete
   the token on GitHub as well to revoke it permanently.

The token and private snapshots remain only in tab memory. They never appear in
projects, IndexedDB, backups, exports, or application logs. Reloading,
disconnecting, or GitHub expiration clears them. Local-only projects and
public repositories never require authorization. Never share this token in a
conversation or screenshot.

## Organize the dashboard

**Needs your attention** remains a global view of decisions, validations, and
blockers. Each attention card also shows its project's progress, using the same
source and percentage as the detailed project view.

The **Your projects** collection stays separate:

- Choose **Grid** or **List** to fit your screen and project count.
- Search titles, summaries, descriptions, tags, or linked repositories.
- Open **Filters and sorting** to combine status, category/tag, repository
  linkage, and human-attention filters.
- Sort by title, update date, or effective progress in either direction.
- Check the result count and clear filters whenever needed.

The selected view and sorting are remembered locally. Temporary searches and
filters are not saved. Filtering never triggers additional GitHub requests or
hides global attention signals.

## Adjust appearance and accessibility

Open **Settings** and choose **Follow system**, **Dark**, or **Light**. System
mode also follows browser or device appearance changes without reloading. Under
**Accessibility and comfort**, choose:

- normal, large, or extra-large text;
- standard or increased contrast;
- system motion settings or explicitly reduced animations.

These preferences stay local to the current device. Keyboard navigation also
reveals a **Skip to main content** link at the first tab stop, and interactive
elements retain a visible focus outline.

## Understand and adjust project progress

The dashboard and **Project** tab show a percentage together with its source:

1. **Manually declared progress** always takes priority.
2. Otherwise, a **measurable GitHub roadmap** counts completed objectives.
3. Otherwise, the **current stage** provides an estimate: `v.0.2` means 20%,
   `v.0.7` means 70%, and `v.1.0` means 100%.

Enter a value between 0 and 100 in project metadata to override the estimate.
Clear that value to restore automatic selection. Stale roadmap data is clearly
marked and never overwrites the stored project.

If an older journal contains a known line such as
`Progression déclarée : 20 %.` or
`Progression déclarée dans Sites : 20 %.`, a preview offers to recover that
value. Nothing is applied without confirmation, and an existing declared value
is never replaced.

## Understand stages

A stage primarily represents the project's **overall maturity**. Its position
is used only as a fallback estimate when neither a manual value nor a measurable
roadmap exists. A future stage can be opened when it becomes useful; the journey
is not a rigid gate system.

**Workstreams** are a separate dimension: they describe parallel fronts that
can advance during the same stage. For example, a research project at `v.0.2`
can prepare its methodology, review regulatory requirements, and organize its
documentation at the same time.

## Organize parallel workstreams

The **Workstreams** tab is optional: simple projects need no additional fronts.
For a richer project:

1. Create a workstream with a name and, optionally, a description, category,
   color, icon, or status.
2. Optionally apply software, research, nonprofit, or personal templates;
   only missing workstreams are added.
3. Open **Backlog** and optionally associate actions with a workstream, a
   stage, or both.
4. Filter the backlog by workstream or show unassigned actions.
5. Return to **Workstreams** to inspect the next useful action, blocked fronts,
   and the stages-by-workstreams matrix.

Reordering does not change existing actions. Archiving hides a front while
preserving its history; archived fronts can later be restored. On a phone, the
matrix becomes a compact set of occupied cells. Empty cells do not represent
missing work, and workstreams never manufacture an artificial progress value.

| Stage | Main intent | Possible exit evidence |
|---|---|---|
| `v.0.0` | Clarify the real need | Problem, people concerned, and intended outcome |
| `v.0.1` | Explore context and options | Sources, findings, and assumptions to test |
| `v.0.2` | Define a useful scope | Minimum outcome, priorities, and exclusions |
| `v.0.3` | Prepare the approach | Plan, resources, dependencies, and risks |
| `v.0.4` | Assemble the parts | First coherent and testable whole |
| `v.0.5` | Test a first version | Observations from controlled use |
| `v.0.6` | Correct blocking defects | Priority problems corrected and retested |
| `v.0.7` | Test in more realistic conditions | Feedback from a limited beta |
| `v.0.8` | Stabilize after feedback | Defects addressed and documentation updated |
| `v.0.9` | Complete final validation | Acceptance, approval, and rollout plan |
| `v.1.0` | Deliver and organize continuity | Available result, follow-up, and maintenance |

## Fill in a stage

- **Goal**: the precise outcome sought during this stage.
- **Notes**: useful facts, constraints, ideas, and reasoning.
- **Expected deliverable**: observable evidence such as a document, decision,
  prototype, result, or completed action.
- **Definition of Done**: verifiable criteria that make it possible to decide
  that the stage can be left.

Not every field must be completed immediately. A short, honest answer is more
useful than artificially complete text.

## Choose the right space

- **Project**: identity, need, and overall description.
- **Stages**: maturity and successive deliverables.
- **Workstreams**: parallel fronts, next actions, and the planning matrix.
- **Backlog**: actions, ideas, and questions for later.
- **Journal**: dated notes, context, and work history.
- **Decisions**: choices that must remain understandable.
- **Attachments**: documents associated with the project.
- **Repository and validations**: GitHub status for repository-backed projects.

## Backup and sharing

The **JSON** export is the machine-readable backup format to preserve. The
**Markdown** export is a readable view for consultation or sharing. Active
storage always remains local to the browser.

In **Settings**, downloading a global backup and restoring it on another device
requires no additional software. Where the browser supports it, an optional
selected folder can also hold a separate snapshot for each device. External
snapshots can be inspected, imported as copies, or restored only after explicit
confirmation.

For every external snapshot, **Inspect project-by-project differences** shows
the common ancestor when it can be verified, followed by identical, added,
deleted, modified, conflicting, or uncertain projects. Expanding a project
shows every affected field, its local and external values, and its provenance.
You can then select a compatible decision for each project and review the
expected portfolio result. The complete plan is written only after explicit
confirmation; cancelling it or closing the view changes no local data.

The [personal-backup guide and validation matrix](portable-backup-user-guide.md)
documents standalone use, folder permissions, conflict handling, optional
external transport, and folder selection already confirmed on real Windows and
Android devices. Another browser, physical cross-device restoration, and an
actual shared transport remain separate deferred checks.
