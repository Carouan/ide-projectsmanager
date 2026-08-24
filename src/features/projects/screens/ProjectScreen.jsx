import { useMemo, useRef, useState } from "react";
import StageEditor from "../../../components/StageEditor";
import BacklogPanel from "../../../components/BacklogPanel";
import JournalPanel from "../../../components/JournalPanel";
import DecisionsPanel from "../../../components/DecisionsPanel";
import AttachmentsPanel from "../../../components/AttachmentsPanel";
import DecisionTreeModal from "../../../components/DecisionTreeModal";
import SyncStatusBadge from "../components/SyncStatusBadge";
import RepositoryPanel from "../components/RepositoryPanel";
import { ProjectStartGuide } from "../components/ProjectGuidance";
import { formatStageLabel, getStageDefinition } from "../../../constants/stages";
import { useI18n } from "../../../i18n/useI18n";
import { formatDateTime } from "../../../services/dateTimePresentation";
import {
  normalizeProjectProgress,
  previewKnownProjectProgressMigration,
} from "../../../services/projectProgress";
import {
  getNextStageDefinition,
  getVisibleStageDefinitions,
} from "../services/stageVisibility";

export default function ProjectScreen({
  projectDoc,
  onBack,
  onOpenSettings,
  onUpdateProjectMeta,
  onSetCurrentStage,
  onUpdateStageField,
  onAddBacklogItem,
  onUpdateBacklogItemStatus,
  onAddJournalEntry,
  onHandleDecisionTreeDestination,
  onUpdateDecisionStatus,
  onAddAttachment,
  onUpdateAttachment,
  onRemoveAttachment,
  onExportJson,
  onImportJson,
  onExportMarkdown,
  showFullStageJourney = false,
  onToggleStageJourney,
}) {
  const [tab, setTab] = useState("project");
  const [isDecisionTreeOpen, setIsDecisionTreeOpen] = useState(false);
  const fileInputRef = useRef(null);
  const { t, locale } = useI18n();

  const { project, stages, backlog, journal, decisions, attachments } =
    projectDoc || {};
  const currentStageKey = project?.currentStage || "v0_0";
  const currentStage = stages?.[currentStageKey];
  const currentStageDefinition = getStageDefinition(currentStageKey);
  const visibleStageDefinitions = getVisibleStageDefinitions(
    projectDoc,
    showFullStageJourney
  );
  const nextStageDefinition = getNextStageDefinition(currentStageKey);
  const knownProgressMigration =
    previewKnownProjectProgressMigration(projectDoc);

  const linkedBacklogItems = useMemo(() => {
    const ids = currentStage?.linkedBacklogIds || [];
    return (backlog || []).filter((item) => ids.includes(item.id));
  }, [backlog, currentStage]);

  const linkedJournalEntries = useMemo(() => {
    const ids = currentStage?.linkedJournalIds || [];
    return (journal || []).filter((entry) => ids.includes(entry.id));
  }, [journal, currentStage]);

  if (!projectDoc) {
    return (
      <div className="page-shell">
        <div className="page-container">
          <button className="btn btn-secondary" onClick={onBack}>
            {t("project.actions.back")}
          </button>
          <div className="empty-state">
            <h2>{t("project.empty.title")}</h2>
            <p>{t("project.empty.description")}</p>
          </div>
        </div>
      </div>
    );
  }

  async function handleImportChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await onImportJson(file);
    } catch (error) {
      alert(error.message);
    } finally {
      event.target.value = "";
    }
  }

  function handleDecisionSubmit(payload) {
    onHandleDecisionTreeDestination(project.id, {
      ...payload,
      sourceStageKey: currentStageKey,
    });

    if (payload.destinationKey === "backlog") {
      setTab("backlog");
    } else if (
      payload.destinationKey === "archi" ||
      payload.destinationKey === "reframe"
    ) {
      setTab("decisions");
    } else if (payload.destinationKey === "technote") {
      setTab("journal");
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="topbar">
          <div className="project-actions">
            <button className="btn btn-secondary" onClick={onBack}>
              {t("project.actions.back")}
            </button>
            <button className="btn btn-secondary" onClick={onOpenSettings}>
              {t("project.actions.settings")}
            </button>
          </div>

          <div className="topbar-meta">
            <span className="badge">
              {formatStageLabel(currentStageKey)}
            </span>
            <SyncStatusBadge projectDoc={projectDoc} />
            <span className="muted">
              {t("project.meta.lastUpdated", {
                timestamp:
                  formatDateTime(project.updatedAt, locale) ||
                  t("global.meta.unknownDate"),
              })}
            </span>
          </div>
        </div>

        <section className="hero hero-project">
          <div>
            <div className="eyebrow">{t("project.eyebrow")}</div>
            <h1>{project.title}</h1>
            <p className="hero-text">{project.summary}</p>
          </div>

          <div className="project-actions">
            <button
              className="btn btn-primary"
              onClick={() => setIsDecisionTreeOpen(true)}
            >
              {t("project.actions.newIdea")}
            </button>

            <button className="btn btn-secondary" onClick={onExportJson}>
              {t("project.actions.exportJson")}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              {t("project.actions.importJson")}
            </button>

            <button className="btn btn-secondary" onClick={onExportMarkdown}>
              {t("project.actions.exportMarkdown")}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={handleImportChange}
            />
          </div>
        </section>

        <div className="tabs">
          <button
            className={`tab ${tab === "project" ? "tab-active" : ""}`}
            onClick={() => setTab("project")}
          >
            {t("project.tabs.project")}
          </button>
          <button
            className={`tab ${tab === "stage" ? "tab-active" : ""}`}
            onClick={() => setTab("stage")}
          >
            {t("project.tabs.stages")}
          </button>
          <button
            className={`tab ${tab === "backlog" ? "tab-active" : ""}`}
            onClick={() => setTab("backlog")}
          >
            {t("project.tabs.backlog")}
          </button>
          <button
            className={`tab ${tab === "journal" ? "tab-active" : ""}`}
            onClick={() => setTab("journal")}
          >
            {t("project.tabs.journal")}
          </button>
          <button
            className={`tab ${tab === "decisions" ? "tab-active" : ""}`}
            onClick={() => setTab("decisions")}
          >
            {t("project.tabs.decisions")}
          </button>
          <button
            className={`tab ${tab === "attachments" ? "tab-active" : ""}`}
            onClick={() => setTab("attachments")}
          >
            {t("project.tabs.attachments")}
          </button>
          <button
            className={`tab ${tab === "repository" ? "tab-active" : ""}`}
            onClick={() => setTab("repository")}
          >
            {t("project.tabs.repository")}
          </button>
        </div>

        {tab === "project" && (
          <section className="panel">
            <h2>{t("project.meta.sectionTitle")}</h2>

            <ProjectStartGuide />

            <div className="form-grid">
              <label className="field">
                <span>{t("project.meta.title")}</span>
                <input
                  value={project.title}
                  onChange={(e) =>
                    onUpdateProjectMeta(project.id, { title: e.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>{t("project.progress.label")}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  inputMode="numeric"
                  value={normalizeProjectProgress(project.progressPercent) ?? ""}
                  placeholder={t("project.progress.undeclared")}
                  aria-describedby="project-progress-help"
                  onChange={(event) =>
                    onUpdateProjectMeta(project.id, {
                      progressPercent: normalizeProjectProgress(
                        event.target.value
                      ),
                    })
                  }
                />
                <small className="muted" id="project-progress-help">
                  {t("project.progress.help")}
                </small>
              </label>

              {knownProgressMigration && (
                <div className="field field-full project-progress-recovery">
                  <strong>{t("project.progress.migration.singleTitle")}</strong>
                  <p className="muted">
                    {t("project.progress.migration.singleDescription", {
                      value: knownProgressMigration.progressPercent,
                    })}
                  </p>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() =>
                      onUpdateProjectMeta(project.id, {
                        progressPercent: knownProgressMigration.progressPercent,
                      })
                    }
                  >
                    {t("project.progress.migration.applyOne", {
                      value: knownProgressMigration.progressPercent,
                    })}
                  </button>
                </div>
              )}

              <label className="field field-full">
                <span>{t("project.meta.summary")}</span>
                <textarea
                  rows={4}
                  value={project.summary}
                  onChange={(e) =>
                    onUpdateProjectMeta(project.id, { summary: e.target.value })
                  }
                />
              </label>

              <label className="field field-full">
                <span>{t("project.meta.description")}</span>
                <textarea
                  rows={6}
                  value={project.description}
                  onChange={(e) =>
                    onUpdateProjectMeta(project.id, {
                      description: e.target.value,
                    })
                  }
                />
              </label>
            </div>
          </section>
        )}

        {tab === "stage" && (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>{t("project.stage.navigation")}</h2>
                  <p className="muted">
                    {t("project.stage.active", {
                      version: formatStageLabel(currentStageKey),
                      title: currentStageDefinition?.title,
                    })}
                  </p>
                </div>
                <div className="stage-navigation-actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    aria-controls="project-stage-navigation"
                    aria-pressed={showFullStageJourney}
                    onClick={onToggleStageJourney}
                  >
                    {t(
                      showFullStageJourney
                        ? "project.stage.hideFuture"
                        : "project.stage.showJourney"
                    )}
                  </button>
                  {nextStageDefinition && (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() =>
                        onSetCurrentStage(project.id, nextStageDefinition.key)
                      }
                    >
                      {t("project.stage.next", {
                        version: formatStageLabel(nextStageDefinition.key),
                      })}
                    </button>
                  )}
                </div>
              </div>

              <div className="stage-nav" id="project-stage-navigation">
                {visibleStageDefinitions.map((stageDef) => {
                  const stageData = stages[stageDef.key];
                  const isActive = stageDef.key === currentStageKey;

                  return (
                    <button
                      key={stageDef.key}
                      type="button"
                      className={`stage-pill ${
                        isActive ? "stage-pill-active" : ""
                      }`}
                      aria-current={isActive ? "step" : undefined}
                      onClick={() => onSetCurrentStage(project.id, stageDef.key)}
                    >
                      <span className="stage-pill-version">
                        {formatStageLabel(stageDef.key)}
                      </span>
                      <span className="stage-pill-title">{stageDef.title}</span>
                      <span className="stage-pill-status">
                        {stageData?.status || "todo"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <StageEditor
              projectId={project.id}
              stageKey={currentStageKey}
              stage={currentStage}
              linkedBacklogItems={linkedBacklogItems}
              linkedJournalEntries={linkedJournalEntries}
              onUpdateStageField={onUpdateStageField}
            />
          </>
        )}

        {tab === "backlog" && (
          <BacklogPanel
            projectId={project.id}
            backlog={backlog}
            onAddBacklogItem={onAddBacklogItem}
            onUpdateBacklogItemStatus={onUpdateBacklogItemStatus}
          />
        )}

        {tab === "journal" && (
          <JournalPanel
            projectId={project.id}
            journal={journal}
            onAddJournalEntry={onAddJournalEntry}
          />
        )}

        {tab === "decisions" && (
          <DecisionsPanel
            projectId={project.id}
            decisions={decisions}
            onUpdateDecisionStatus={onUpdateDecisionStatus}
          />
        )}

        {tab === "attachments" && (
          <AttachmentsPanel
            projectId={project.id}
            attachments={attachments}
            onAddAttachment={onAddAttachment}
            onUpdateAttachment={onUpdateAttachment}
            onRemoveAttachment={onRemoveAttachment}
          />
        )}

        {tab === "repository" && <RepositoryPanel projectDoc={projectDoc} />}

        <DecisionTreeModal
          isOpen={isDecisionTreeOpen}
          onClose={() => setIsDecisionTreeOpen(false)}
          onSubmitDestination={handleDecisionSubmit}
        />
      </div>
    </div>
  );
}
