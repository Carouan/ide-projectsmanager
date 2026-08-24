# User guide

This guide explains how to use IDE-projectsmanager without imposing a method
limited to software projects. The application works locally in the browser and
separates complementary kinds of project information.

## Start a project

1. Create a project and give it a clear title.
2. Summarize the need and the intended outcome in a few sentences.
3. Open **Stages** and begin with `v0.0`.
4. Use the backlog for future actions, the journal for context, and decisions
   for important choices.
5. Create a JSON backup regularly.

The **New idea** button classifies an idea that appears during a project. It
does not automatically create a separate project and does not replace this
guide.

## Declare project progress

In the **Project** tab, **Declared progress** is an optional estimate between
0 and 100%. An empty value remains **Not declared**. It is never calculated
from stages, tasks, or GitHub activity.

If an older journal contains the exact line `Progression déclarée : N %`, a
preview offers to recover that value. Nothing is applied without confirmation,
and an existing declared value is never replaced.

## Understand stages

A stage represents the project's **overall maturity**, not its progress
percentage. A future stage can be opened when it becomes useful; the journey is
not a rigid gate system.

| Stage | Main intent | Possible exit evidence |
|---|---|---|
| `v0.0` | Clarify the real need | Problem, people concerned, and intended outcome |
| `v0.1` | Explore context and options | Sources, findings, and assumptions to test |
| `v0.2` | Define a useful scope | Minimum outcome, priorities, and exclusions |
| `v0.3` | Prepare the approach | Plan, resources, dependencies, and risks |
| `v0.4` | Assemble the parts | First coherent and testable whole |
| `v0.5` | Test a first version | Observations from controlled use |
| `v0.6` | Correct blocking defects | Priority problems corrected and retested |
| `v0.7` | Test in more realistic conditions | Feedback from a limited beta |
| `v0.8` | Stabilize after feedback | Defects addressed and documentation updated |
| `v0.9` | Complete final validation | Acceptance, approval, and rollout plan |
| `v1.0` | Deliver and organize continuity | Available result, follow-up, and maintenance |

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
storage remains local to the browser until an optional backup mechanism is
configured.
