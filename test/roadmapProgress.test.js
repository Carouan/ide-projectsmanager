import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseRoadmapProgress } from "../src/services/roadmapProgress.js";

test("roadmap progress counts completed and open explicit objectives", () => {
  const progress = parseRoadmapProgress(
    "# Roadmap\n- [x] First delivered feature\n- [ ] Second planned feature"
  );

  assert.equal(progress.percent, 50);
  assert.equal(progress.completed, 1);
  assert.equal(progress.total, 2);
  assert.equal(progress.sourcePath, "ROADMAP.md");
  assert.equal(progress.nextObjectives[0].label, "Second planned feature");
});

test("nested feature groups are not double-counted", () => {
  const progress = parseRoadmapProgress([
    "- [ ] Portfolio cockpit",
    "  - [x] Read existing projects",
    "  - [ ] Filter projects",
    "    - [x] Filter by title",
    "    - [ ] Filter by repository",
  ].join("\n"));

  assert.equal(progress.completed, 2);
  assert.equal(progress.total, 3);
  assert.equal(progress.percent, 67);
  assert.deepEqual(
    progress.objectives.map((objective) => objective.label),
    ["Read existing projects", "Filter by title", "Filter by repository"]
  );
});

test("explicit objective weights produce an explainable weighted percentage", () => {
  const progress = parseRoadmapProgress([
    "- [x] Small completed task <!-- weight:1 -->",
    "- [ ] Major remaining capability <!-- weight:3 -->",
  ].join("\n"));

  assert.equal(progress.completed, 1);
  assert.equal(progress.total, 2);
  assert.equal(progress.completedWeight, 1);
  assert.equal(progress.totalWeight, 4);
  assert.equal(progress.percent, 25);
  assert.equal(progress.objectives[1].label, "Major remaining capability");
});

test("invalid or zero weights degrade safely to one", () => {
  const progress = parseRoadmapProgress([
    "- [x] Completed <!-- weight:0 -->",
    "- [ ] Planned",
  ].join("\n"));

  assert.equal(progress.totalWeight, 2);
  assert.equal(progress.percent, 50);
});

test("checkbox examples inside fenced code blocks are ignored", () => {
  const progress = parseRoadmapProgress([
    "```markdown",
    "- [x] Documentation example, not a delivered feature",
    "```",
    "~~~",
    "- [x] Another documentation example",
    "~~~",
    "- [ ] Actual remaining objective",
  ].join("\n"));

  assert.equal(progress.total, 1);
  assert.equal(progress.completed, 0);
  assert.equal(progress.percent, 0);
});

test("explicit roadmap scope excludes surrounding checkboxes", () => {
  const progress = parseRoadmapProgress([
    "- [x] Decorative README summary",
    "<!-- roadmap-progress:start -->",
    "- [ ] Actual scoped objective",
    "<!-- roadmap-progress:end -->",
    "- [x] Excluded example",
  ].join("\n"));

  assert.equal(progress.total, 1);
  assert.equal(progress.objectives[0].label, "Actual scoped objective");
});

test("README fallback uses only a clearly identified roadmap section", () => {
  const progress = parseRoadmapProgress(
    [
      "# Project",
      "- [x] Installation instruction, not a roadmap goal",
      "## Roadmap",
      "- [x] Delivered objective",
      "- [ ] Planned objective",
      "## Contributing",
      "- [x] Contributor checklist, excluded",
    ].join("\n"),
    { sourcePath: "README.md" }
  );

  assert.equal(progress.total, 2);
  assert.equal(progress.completed, 1);
  assert.equal(progress.percent, 50);
});

test("French roadmap headings are accepted in README files", () => {
  const progress = parseRoadmapProgress(
    "## Feuille de route\n- [x] Première fonctionnalité",
    { sourcePath: "docs/README.md" }
  );

  assert.equal(progress.percent, 100);
});

test("README checkboxes without an explicit roadmap heading are never guessed", () => {
  assert.equal(
    parseRoadmapProgress("# Setup\n- [x] Install Node", {
      sourcePath: "README.md",
    }),
    null
  );
});

test("empty documents and narrative-only roadmaps remain unmeasurable", () => {
  for (const value of [null, undefined, "", "# Roadmap\nWork in progress"]) {
    assert.equal(parseRoadmapProgress(value), null);
  }
});

test("completed and unstarted roadmaps preserve exact percentage boundaries", () => {
  assert.equal(parseRoadmapProgress("- [ ] Initial task").percent, 0);
  assert.equal(parseRoadmapProgress("- [x] Delivered task").percent, 100);
});

test("canonical IDE roadmap reflects delivered, planned and excluded scope", () => {
  const roadmap = readFileSync(new URL("../ROADMAP.md", import.meta.url), "utf8");
  const progress = parseRoadmapProgress(roadmap);

  assert.ok(progress.total >= 70);
  assert.ok(progress.completed >= 35);
  assert.ok(progress.percent > 0 && progress.percent < 100);
  assert.ok(
    progress.objectives.some((objective) =>
      objective.label.includes("valeur manuelle")
    )
  );
  assert.ok(
    progress.objectives.some((objective) =>
      objective.label.includes("grille ou en liste")
    )
  );
  assert.equal(
    progress.objectives.some((objective) =>
      objective.label.includes("Objectif terminé")
    ),
    false
  );
  assert.equal(
    progress.objectives.some((objective) => objective.label.includes("UFI")),
    false
  );
});
