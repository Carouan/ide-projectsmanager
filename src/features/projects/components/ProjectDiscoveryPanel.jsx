import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import { githubProjectDiscoveryProvider } from "../../../services/projectDiscovery.js";

function repositoryKey(projectDoc) {
  return String(projectDoc?.repository?.fullName || "").trim().toLowerCase();
}

function externalProjectKey(projectDoc) {
  return String(projectDoc?.repository?.externalProjectId || "").trim().toLowerCase();
}

export default function ProjectDiscoveryPanel({
  projects = [],
  enabled = true,
  owner,
  onImport,
}) {
  const { t } = useI18n();
  const [state, setState] = useState({
    status: "idle",
    result: null,
    error: null,
  });
  const trackedRepositories = useMemo(
    () => new Set(projects.map(repositoryKey).filter(Boolean)),
    [projects]
  );
  const trackedProjectIds = useMemo(
    () => new Set(projects.map(externalProjectKey).filter(Boolean)),
    [projects]
  );

  const discover = useCallback(async (forceRefresh = false) => {
    if (!enabled || !owner) return;

    setState((current) => ({
      ...current,
      status: "loading",
      error: null,
    }));

    try {
      const result = await githubProjectDiscoveryProvider.discover({
        owner,
        forceRefresh,
      });
      setState({ status: "success", result, error: null });
    } catch (error) {
      setState({
        status: "error",
        result: null,
        error,
      });
    }
  }, [enabled, owner]);

  useEffect(() => {
    discover(false);
  }, [discover]);

  useEffect(() => {
    if (state.status !== "success" || typeof onImport !== "function") return;

    for (const candidate of state.result?.candidates || []) {
      const repositoryKeyValue = String(
        candidate?.repository?.fullName || ""
      ).toLowerCase();
      const projectKeyValue = String(candidate?.projectId || "").toLowerCase();
      const tracked =
        trackedRepositories.has(repositoryKeyValue) ||
        trackedProjectIds.has(projectKeyValue);

      if (candidate.autoImport && !tracked) {
        onImport(candidate);
      }
    }
  }, [
    state.status,
    state.result,
    onImport,
    trackedRepositories,
    trackedProjectIds,
  ]);

  if (!enabled) return null;

  const candidates = state.result?.candidates || [];
  const newCandidates = candidates.filter((candidate) => {
    const repositoryKeyValue = String(
      candidate?.repository?.fullName || ""
    ).toLowerCase();
    const projectKeyValue = String(candidate?.projectId || "").toLowerCase();
    return (
      !trackedRepositories.has(repositoryKeyValue) &&
      !trackedProjectIds.has(projectKeyValue)
    );
  });

  return (
    <section className="panel project-discovery-panel" aria-live="polite">
      <div className="project-discovery-header">
        <div>
          <div className="eyebrow">{t("discovery.eyebrow")}</div>
          <h2>{t("discovery.title")}</h2>
          <p className="muted">
            {t("discovery.description", { owner: owner || "—" })}
          </p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => discover(true)}
          disabled={state.status === "loading" || !owner}
        >
          {state.status === "loading"
            ? t("discovery.actions.refreshing")
            : t("discovery.actions.refresh")}
        </button>
      </div>

      {state.status === "error" ? (
        <p className="repository-notice">
          {t("discovery.error", { code: state.error?.code || "unknown" })}
        </p>
      ) : (
        <p className="muted">
          {state.status === "loading"
            ? t("discovery.loading")
            : t("discovery.summary", {
                count: candidates.length,
                newCount: newCandidates.length,
              })}
        </p>
      )}

      {state.result?.warnings?.length > 0 && (
        <p className="muted">
          {t("discovery.warnings", { count: state.result.warnings.length })}
        </p>
      )}
    </section>
  );
}
