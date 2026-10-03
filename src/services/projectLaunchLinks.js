import { buildDevCmdIssueUrl } from "./devCmd.js";

function normalizedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function githubRepositoryUrl(repository = {}) {
  const explicit = normalizedString(repository.url);
  if (explicit) return explicit;

  const fullName = normalizedString(repository.fullName);
  return fullName ? `https://github.com/${fullName}` : null;
}

export function getProjectLaunchLinks(projectDoc, options = {}) {
  const repository = projectDoc?.repository || {};
  const repositoryUrl = githubRepositoryUrl(repository);

  if (!repositoryUrl) {
    return {
      repository: null,
      app: null,
      issues: null,
      pullRequests: null,
      feedback: null,
    };
  }

  const root = repositoryUrl.replace(/\/$/u, "");
  const projectId =
    normalizedString(repository.externalProjectId) ||
    normalizedString(projectDoc?.project?.id) ||
    "project";
  const feedbackEnabled =
    repository.feedbackProtocol === "dev-cmd-v1" &&
    (repository.feedbackTransport || "github-issues") === "github-issues";
  const requestIdFactory =
    options.requestIdFactory ||
    (() => globalThis.crypto?.randomUUID?.() || `dashboard-${Date.now()}`);

  return {
    repository: root,
    app: normalizedString(repository.appUrl),
    issues: `${root}/issues`,
    pullRequests: `${root}/pulls`,
    feedback: feedbackEnabled
      ? buildDevCmdIssueUrl(root, {
          projectId,
          repositoryFullName: normalizedString(repository.fullName),
          action: "ISSUE",
          requestId: requestIdFactory(),
          description: "",
        })
      : null,
  };
}
