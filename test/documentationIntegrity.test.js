import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const docsDirectory = new URL("../docs/", import.meta.url);

function listMarkdownFiles(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      return listMarkdownFiles(new URL(`${entry.name}/`, directory), relativePath);
    }

    return entry.name.endsWith(".md") ? [relativePath] : [];
  });
}

test("the documentation index identifies every current Markdown document", () => {
  const index = readFileSync(new URL("README.md", docsDirectory), "utf8");
  const references = new Set(
    [...index.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)].map(([, target]) =>
      path.posix.normalize(target)
    )
  );

  for (const document of listMarkdownFiles(docsDirectory)) {
    if (document !== "README.md") {
      assert.ok(references.has(document), `Unindexed documentation: ${document}`);
    }
  }
});

test("hardware validation reports observed devices without inventing transport", () => {
  const guide = readFileSync(
    new URL("portable-backup-user-guide.md", docsDirectory),
    "utf8"
  );

  assert.match(guide, /Chrome \/ PWA sous Windows[^\n]+Réussite confirmée/);
  assert.match(guide, /Chrome sous Android[^\n]+Réussite confirmée/);
  assert.match(guide, /les deux dossiers locaux ne se partagent pas d'eux-mêmes/);
  assert.doesNotMatch(guide, /Échec observé le 25 août 2026/);
});

test("historical planning documents do not claim current roadmap authority", () => {
  const masterPlan = readFileSync(
    new URL("codex-master-plan.md", docsDirectory),
    "utf8"
  );
  const orderedIssues = readFileSync(
    new URL("ordered-issues-workflow.md", docsDirectory),
    "utf8"
  );

  assert.match(masterPlan, /Historical implementation plan/);
  assert.match(orderedIssues, /Archive historique des premières issues/);
});
