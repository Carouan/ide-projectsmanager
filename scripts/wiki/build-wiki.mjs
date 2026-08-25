import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const defaultRepositoryUrl = "https://github.com/Carouan/ide-projectsmanager";

export const wikiPages = Object.freeze([
  { source: "docs/wiki/Home.md", target: "Home.md" },
  { source: "docs/wiki/_Sidebar.md", target: "_Sidebar.md" },
  { source: "docs/user-guide.md", target: "Guide-utilisateur.md" },
  { source: "docs/user-guide.en.md", target: "User-guide.md" },
  {
    source: "docs/portable-backup-user-guide.md",
    target: "Sauvegardes-et-appareils.md",
  },
  { source: "ROADMAP.md", target: "Roadmap.md" },
  { source: "docs/project/c-glossary.md", target: "Glossaire.md" },
  {
    source: "docs/decisions/DR-006-first-release-and-post-release-evolution.md",
    target: "Architecture-et-decisions.md",
  },
  {
    source: "docs/roadmaps/post-v1-evolution-roadmap.md",
    target: "Evolution-apres-v1.md",
  },
]);

const pageTargets = new Map(wikiPages.map((page) => [page.source, page.target]));

export function rewriteWikiLinks(markdown, { source, repositoryUrl }) {
  return markdown.replace(/(!?\[[^\]]*\])\(([^)\s]+)\)/g, (match, label, target) => {
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(target)) {
      return match;
    }

    const [relativePath, fragment = ""] = target.split("#");

    if (!relativePath.includes("/") && !relativePath.endsWith(".md")) {
      return match;
    }

    const resolvedPath = path.posix.normalize(
      path.posix.join(path.posix.dirname(source), relativePath)
    );
    const suffix = fragment ? `#${fragment}` : "";
    const wikiTarget = pageTargets.get(resolvedPath);

    if (wikiTarget) {
      return `${label}(${wikiTarget.replace(/\.md$/, "")}${suffix})`;
    }

    return `${label}(${repositoryUrl}/blob/main/${resolvedPath}${suffix})`;
  });
}

export function buildWiki({ outputDirectory, repositoryUrl = defaultRepositoryUrl }) {
  const destination = outputDirectory ?? path.join(repositoryRoot, ".wiki-build");
  mkdirSync(destination, { recursive: true });

  return wikiPages.map((page) => {
    const markdown = readFileSync(path.join(repositoryRoot, page.source), "utf8");
    const rewritten = rewriteWikiLinks(markdown, {
      source: page.source,
      repositoryUrl,
    });
    const provenance =
      page.target === "_Sidebar.md"
        ? ""
        : `\n\n---\n\nSource canonique : [${page.source}](${repositoryUrl}/blob/main/${page.source}).\n`;

    writeFileSync(path.join(destination, page.target), `${rewritten.trimEnd()}${provenance}`, "utf8");
    return page.target;
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const repository = process.env.GITHUB_REPOSITORY;
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const repositoryUrl = repository ? `${server}/${repository}` : defaultRepositoryUrl;
  const pages = buildWiki({ repositoryUrl });
  process.stdout.write(`Generated ${pages.length} user wiki pages.\n`);
}
