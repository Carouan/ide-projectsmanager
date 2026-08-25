import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildWiki, rewriteWikiLinks, wikiPages } from "../scripts/wiki/build-wiki.mjs";

test("wiki generation exposes curated pages without duplicating source documents", (context) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "ide-projectsmanager-wiki-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const generated = buildWiki({ outputDirectory: directory });
  const home = readFileSync(path.join(directory, "Home.md"), "utf8");
  const guide = readFileSync(path.join(directory, "Guide-utilisateur.md"), "utf8");

  assert.equal(generated.length, wikiPages.length);
  assert.ok(generated.includes("Sauvegardes-et-appareils.md"));
  assert.match(home, /les transports réels et la restauration physique/);
  assert.match(guide, /Source canonique : \[docs\/user-guide\.md\]/);
  assert.match(guide, /\(Sauvegardes-et-appareils\)/);
});

test("wiki links preserve mapped pages, anchors and external destinations", () => {
  const repositoryUrl = "https://github.com/example/repository";
  const markdown = [
    "[backup](portable-backup-user-guide.md#recette)",
    "[decision](decisions/DR-002-local-first-syncthing-backup-architecture.md)",
    "[external](https://github.com/example)",
    "[section](#current)",
  ].join("\n");

  const rewritten = rewriteWikiLinks(markdown, {
    source: "docs/user-guide.md",
    repositoryUrl,
  });

  assert.match(rewritten, /\(Sauvegardes-et-appareils#recette\)/);
  assert.match(
    rewritten,
    /\(https:\/\/github\.com\/example\/repository\/blob\/main\/docs\/decisions\/DR-002-/
  );
  assert.match(rewritten, /\(https:\/\/github\.com\/example\)/);
  assert.match(rewritten, /\(#current\)/);
});
