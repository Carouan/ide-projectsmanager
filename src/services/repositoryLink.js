export const REPOSITORY_PROVIDERS = {
  GITHUB: "github",
};

function normalizeRequiredString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeRepositoryLink(repository) {
  if (repository == null) return null;
  if (typeof repository !== "object" || Array.isArray(repository)) return null;

  const provider = normalizeRequiredString(repository.provider);
  const owner = normalizeRequiredString(repository.owner);
  const name = normalizeRequiredString(repository.name);

  if (!provider || !owner || !name) return null;

  return {
    provider,
    owner,
    name,
    defaultBranch: normalizeOptionalString(repository.defaultBranch),
  };
}
