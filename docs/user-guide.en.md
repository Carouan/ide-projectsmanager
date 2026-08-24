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
documentation at the same time. The underlying model already preserves
existing projects and exports; its dedicated management screen will arrive in
a separate increment.

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

The [personal-backup guide and validation matrix](portable-backup-user-guide.md)
documents standalone use, folder permissions, conflict handling, optional
external transport, and hardware validation that still requires real devices.
