import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import {
  analyzeMarkdownObjectives,
  createPublicGitHubProjectImportProvider,
  normalizePublicGitHubRepositoryUrl,
} from "../src/services/repositoryImportAnalysis.js";
import {
  createPublicRepositoryImportDraft,
  materializePublicRepositoryProject,
} from "../src/services/publicRepositoryProjectImport.js";

const SUMP_CHECKLIST = `
- [X] 1. Download this script on GitHub.
- [X] 2. Give execution rights.
- [X] 3. Run the script.

1. [ ] Main Script [SUMP.sh]
\t- [x] 1. create log file
\t- [x] 2. Creation of parameter file - settings.txt
\t\t- [x] a. Static IP choice
\t\t- [x] b. Choice raspberry pi name
\t\t- [x] c. Choice SSH port
\t\t- [x] d. Define WIFI networks
\t\t- [x] e. Choice a backup policy
\t\t\t- [x] 1. Choose the frequency of the backup
\t\t\t- [x] 2. Add backup commands to crontab
\t\t\t- [x] 3. Add update commands to crontab
\t\t\t- [x] 4. Add restart commands to crontab
\t\t- [x] f. Proposed installation of DuckDNS
\t\t- [x] g. Proposed installation of Docker
\t\t- [x] h. Proposal to run docker-compose
\t- [x] 3. Launch configuration functions
\t\t- [ ] a. Check every configuration step
\t- [ ] 4. Launch backup functions
\t\t- [ ] a. Check backup configuration
\t- [ ] 5. Launch NO-IP installation
\t- [ ] 6. Launch Docker installation [ ] 7.
\t- [ ] 7. Launch containers [ ] 8.
\t- [x] 8. Finalize and clean up
\t\t- [x] a. Delete uploaded files
\t\t- [x] b. Display the log file
`;

function encodedDocument(path, markdown, repository = "Carouan/example") {
  return {
    path,
    html_url: `https://github.com/${repository}/blob/main/${path}`,
    encoding: "base64",
    content: Buffer.from(markdown, "utf8").toString("base64"),
  };
}

function response(status, value = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return value;
    },
  };
}

test("public repository URLs are canonicalized without accepting another origin or path", () => {
  assert.deepEqual(
    normalizePublicGitHubRepositoryUrl(
      "https://github.com/Carouan/SetUpMyPi---SUMP.git/"
    ),
    {
      owner: "Carouan",
      name: "SetUpMyPi---SUMP",
      fullName: "Carouan/SetUpMyPi---SUMP",
      url: "https://github.com/Carouan/SetUpMyPi---SUMP",
      apiPath: "Carouan/SetUpMyPi---SUMP",
    }
  );

  for (const value of [
    "http://github.com/Carouan/repo",
    "https://www.github.com/Carouan/repo",
    "https://user@github.com/Carouan/repo",
    "https://github.com/Carouan/repo/issues",
    "https://github.com/Carouan/repo?tab=readme",
    "https://gitlab.com/Carouan/repo",
    "https://github.com/Carouan/%2E%2E",
  ]) {
    assert.throws(
      () => normalizePublicGitHubRepositoryUrl(value),
      (error) => error.code === "invalid_repository_url"
    );
  }
});

test("the current SUMP-style checklist distinguishes 28 lines from 22 leaf objectives", () => {
  const analysis = analyzeMarkdownObjectives(SUMP_CHECKLIST, {
    sourcePath: "README.md",
    sourceUrl: "https://github.com/Carouan/SetUpMyPi---SUMP/blob/main/README.md",
  });

  assert.equal(analysis.classification.kind, "indicative_checklist");
  assert.equal(analysis.classification.confidence, "medium");
  assert.deepEqual(analysis.counts, {
    checkboxLines: 28,
    leafObjectives: 22,
    completedLeaves: 17,
    openLeaves: 5,
  });
  assert.equal(analysis.percent, 77);
  assert.equal(
    analysis.objectives.find(({ label }) => label.includes("parameter file")).childIds.length,
    8
  );
  assert.equal(
    analysis.objectives.filter(({ label }) => label === "7.").length,
    0
  );
  assert.ok(analysis.leafObjectives.every(({ provenance }) =>
    provenance.sourcePath === "README.md" &&
    provenance.confidence === "medium" &&
    Number.isInteger(provenance.line)
  ));
});

test("a dedicated roadmap is formal and parent objectives are not double-counted", () => {
  const analysis = analyzeMarkdownObjectives(`# Roadmap

- [ ] Group
  - [x] Delivered leaf
  - [ ] Open leaf
`, { sourcePath: "ROADMAP.md" });

  assert.equal(analysis.classification.kind, "formal_roadmap");
  assert.equal(analysis.counts.checkboxLines, 3);
  assert.equal(analysis.counts.leafObjectives, 2);
  assert.equal(analysis.counts.completedLeaves, 1);
  assert.equal(analysis.percent, 50);
});

test("the public provider performs GET-only reads and preserves source provenance", async () => {
  const calls = [];
  const readme = `# Existing project

An existing public project to adapt.

- [x] First result
- [ ] Next result
`;
  const provider = createPublicGitHubProjectImportProvider({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/repos/Carouan/example")) {
        return response(200, {
          full_name: "Carouan/example",
          name: "example",
          owner: { login: "Carouan" },
          html_url: "https://github.com/Carouan/example",
          visibility: "public",
          private: false,
          default_branch: "main",
          description: "Repository description",
        });
      }
      if (url.endsWith("/readme")) {
        return response(200, encodedDocument("README.md", readme));
      }
      return response(404);
    },
  });
  const result = await provider.inspect("https://github.com/Carouan/example");

  assert.ok(calls.every(({ options }) =>
    options.method === "GET" && options.credentials === "omit"
  ));
  assert.equal(result.readOnly, true);
  assert.equal(result.repository.fullName, "Carouan/example");
  assert.equal(result.suggested.title, "Existing project");
  assert.equal(result.suggested.summary, "Repository description");
  assert.equal(result.primaryObjectives.objectiveAnalysis.counts.leafObjectives, 2);
  assert.equal(
    result.primaryObjectives.objectiveAnalysis.leafObjectives[0].provenance.sourceUrl,
    "https://github.com/Carouan/example/blob/main/README.md"
  );
});

test("a formal roadmap takes precedence while private repositories stop before content reads", async () => {
  const formalProvider = createPublicGitHubProjectImportProvider({
    fetchImpl: async (url) => {
      if (url.endsWith("/repos/Carouan/example")) {
        return response(200, {
          full_name: "Carouan/example",
          name: "example",
          owner: { login: "Carouan" },
          html_url: "https://github.com/Carouan/example",
          visibility: "public",
          private: false,
          default_branch: "main",
        });
      }
      if (url.endsWith("/readme")) {
        return response(200, encodedDocument("README.md", "# Example\n\n- [ ] Hint"));
      }
      if (url.endsWith("/contents/ROADMAP.md")) {
        return response(200, encodedDocument("ROADMAP.md", "# Roadmap\n\n- [ ] Formal"));
      }
      return response(404);
    },
  });
  const formal = await formalProvider.inspect("https://github.com/Carouan/example");
  assert.equal(formal.primaryObjectives.sourcePath, "ROADMAP.md");
  assert.equal(formal.confidence.objectives, "high");

  let privateCalls = 0;
  const privateProvider = createPublicGitHubProjectImportProvider({
    fetchImpl: async () => {
      privateCalls += 1;
      return response(200, {
        full_name: "Carouan/private",
        private: true,
        visibility: "private",
      });
    },
  });
  await assert.rejects(
    privateProvider.inspect("https://github.com/Carouan/private"),
    (error) => error.code === "public_repository_required"
  );
  assert.equal(privateCalls, 1);
});

test("an analyzed repository remains a draft until explicitly materialized", () => {
  const analysis = {
    repository: {
      provider: "github",
      fullName: "Carouan/example",
      owner: "Carouan",
      name: "example",
      url: "https://github.com/Carouan/example",
      visibility: "public",
      defaultBranch: "main",
      archived: false,
    },
    suggested: { title: "Example", summary: "Summary", description: "Description" },
    primaryObjectives: {
      sourcePath: "ROADMAP.md",
      objectiveAnalysis: analyzeMarkdownObjectives(`# Roadmap

- [ ] Product
  - [x] Shipped capability
  - [ ] Next capability
`, {
        sourcePath: "ROADMAP.md",
        sourceUrl: "https://github.com/Carouan/example/blob/main/ROADMAP.md",
      }),
    },
  };

  const draft = createPublicRepositoryImportDraft(analysis);
  assert.equal(draft.currentStage, "v0_2");
  assert.equal(draft.workstreams.length, 1);
  assert.equal(draft.tasks.length, 2);
  assert.equal(draft.tasks[0].provenance.line, 4);

  draft.title = "Corrected title";
  draft.workstreams[0].title = "Corrected workstream";
  const project = materializePublicRepositoryProject(draft);

  assert.equal(project.project.title, "Corrected title");
  assert.equal(project.repository.url, "https://github.com/Carouan/example");
  assert.equal(project.workstreams[0].title, "Corrected workstream");
  assert.equal(project.backlog.length, 2);
  assert.deepEqual(
    project.backlog.map(({ status }) => status),
    ["done", "open"]
  );
  assert.deepEqual(project.backlog[0].source, {
    kind: "github_markdown_objective",
    sourcePath: "ROADMAP.md",
    sourceUrl: "https://github.com/Carouan/example/blob/main/ROADMAP.md",
    line: 4,
    confidence: "high",
  });
});

test("the SUMP preview proposes one root workstream and 22 traceable leaf tasks", () => {
  const objectiveAnalysis = analyzeMarkdownObjectives(SUMP_CHECKLIST, {
    sourcePath: "README.md",
    sourceUrl: "https://github.com/Carouan/SetUpMyPi---SUMP/blob/main/README.md",
  });
  const draft = createPublicRepositoryImportDraft({
    repository: {
      provider: "github",
      fullName: "Carouan/SetUpMyPi---SUMP",
      owner: "Carouan",
      name: "SetUpMyPi---SUMP",
      url: "https://github.com/Carouan/SetUpMyPi---SUMP",
      visibility: "public",
      archived: false,
    },
    suggested: { title: "SUMP", summary: "Set up a Raspberry Pi", description: "" },
    primaryObjectives: { sourcePath: "README.md", objectiveAnalysis },
  });

  assert.equal(draft.currentStage, "v0_1");
  assert.equal(draft.workstreams.length, 1);
  assert.equal(draft.workstreams[0].title, "Main Script [SUMP.sh]");
  assert.equal(draft.tasks.length, 22);
  assert.equal(draft.tasks.filter(({ status }) => status === "done").length, 17);
  assert.ok(draft.tasks.every(({ provenance }) => provenance.sourcePath === "README.md"));
});
