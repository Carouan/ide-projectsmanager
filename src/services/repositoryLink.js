export const REPOSITORY_PROVIDERS = Object.freeze({
  GITHUB: "github",
});

const VALID_REPOSITORY_PROVIDERS = new Set(
  Object.values(REPOSITORY_PROVIDERS)
);
const VALID_REPOSITORY_VISIBILITIES = new Set([
  "public",
  "private",
  "internal",
]);

function normalizeString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeRepositoryLink(repository) {
  if (repository == null) return null;
  if (typeof repository !== "object" || Array.isArray(repository)) return null;

  const provider =
    normalizeString(repository.provider) || REPOSITORY_PROVIDERS.GITHUB;

  if (!VALID_REPOSITORY_PROVIDERS.has(provider)) return null;

  const owner = normalizeString(repository.owner);
  const name = normalizeString(repository.name);
  const fullName =
    normalizeString(repository.fullName) ||
    (owner && name ? `${owner}/${name}` : null);
  const url = normalizeString(repository.url);

  if (!fullName && !url) return null;

  const visibility = normalizeString(repository.visibility);

  return {
    ...repository,
    provider,
    fullName,
    url:
      url ||
      (provider === REPOSITORY_PROVIDERS.GITHUB && fullName
        ? `https://github.com/${fullName}`
        : null),
    defaultBranch: normalizeString(repository.defaultBranch),
    visibility: VALID_REPOSITORY_VISIBILITIES.has(visibility)
      ? visibility
      : null,
    governance: normalizeString(repository.governance),
  };
}
