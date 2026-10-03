import { useMemo, useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import { discoverGitHubProjects } from "../../../services/githubProjectDiscovery.js";

function repositoryKey(project) {
  return String(project?.repository?.fullName || "").toLowerCase();
}

export default function GitHubProjectDiscoveryPanel({ projects, onImport }) {
  const { t } = useI18n();
  const [state, setState] = useState({ status: "idle", candidates: [], error: null });

  const owner = useMemo(
    () => projects.map((project) => project?.repository?.owner).find(Boolean) || "Carouan",
    [projects]
  );
  const existing = useMemo(
    () => new Set(projects.map(repositoryKey).filter(Boolean)),
    [projects]
  );
  const candidates = state.candidates.filter(
    (candidate) => !existing.has(String(candidate.repository.fullName).toLowerCase())
  );

  async function runDiscovery() {
    setState({ status: "loading", candidates: [], error: null });
    try {
      const discovered = await discoverGitHubProjects({ owner });
      setState({ status: "success", candidates: discovered, error: null });
    } catch (error) {
      setState({
        status: "error",
        candidates: [],
        error: error?.code || error?.message || "unknown",
      });
    }
  }

  return (
    <section className="panel discovery-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">{t("discovery.eyebrow")}</div>
          <h2>{t("discovery.title")}</h2>
          <p className="muted">{t("discovery.description")}</p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={runDiscovery}
          disabled={state.status === "loading"}
        >
          {state.status === "loading"
            ? t("discovery.actions.scanning")
            : t("discovery.actions.scan")}
        </button>
      </div>

      {state.status === "error" && (
        <div className="repository-notice repository-notice-stale">
          {t("discovery.error", { error: state.error })}
        </div>
      )}

      {state.status === "success" && candidates.length === 0 && (
        <div className="empty-inline">{t("discovery.empty")}</div>
      )}

      {candidates.length > 0 && (
        <div className="discovery-list">
          {candidates.map((candidate) => (
            <article className="discovery-item" key={candidate.repository.fullName}>
              <div>
                <strong>{candidate.title}</strong>
                <div className="muted">{candidate.repository.fullName}</div>
              </div>
              <div className="project-actions">
                {candidate.appUrl && (
                  <a className="repository-link" href={candidate.appUrl} target="_blank" rel="noreferrer">
                    {t("discovery.actions.test")}
                  </a>
                )}
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => onImport(candidate)}
                >
                  {t("discovery.actions.import")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
