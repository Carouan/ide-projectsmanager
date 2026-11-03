import { useState } from "react";
import { useAppStore } from "./store/useAppStore";
import ProjectListScreen from "./features/projects/screens/ProjectListScreen";
import GovernedProjectBootstrapScreen from "./features/projects/screens/GovernedProjectBootstrapScreen";
import ProjectScreen from "./features/projects/screens/ProjectScreen";
import SettingsScreen from "./features/projects/screens/SettingsScreen";
import MarkdownPreview from "./features/markdown/components/MarkdownPreview";
import PwaPrompt from "./components/PwaPrompt";
import AppShell from "./app/AppShell";
import ThemeController from "./app/ThemeController";
import { I18nProvider } from "./i18n/useI18n";
import { projectToMarkdown } from "./services/markdownExport";
import { useRepositorySnapshot } from "./features/projects/hooks/useRepositorySnapshot.js";

export default function App() {
  const {
    projects,
    storageError,
    currentProject,
    createProject,
    importPublicRepositoryProject,
    importDiscoveredRepositoryProject,
    createGovernedProject,
    installIdeDemoProject,
    openProject,
    deleteProject,
    updateProjectMeta,
    migrateKnownPortfolioProgress,
    setCurrentStage,
    updateStageField,
    addBacklogItem,
    addWorkstream,
    updateWorkstream,
    reorderWorkstream,
    applyWorkstreamTemplate,
    updateBacklogItemWorkstream,
    addJournalEntry,
    handleDecisionTreeDestination,
    updateBacklogItemStatus,
    updateDecisionStatus,
    addAttachment,
    approveKnowledgeReference,
    updateAttachment,
    removeAttachment,
    exportCurrentProjectJson,
    exportAllProjectsJson,
    inspectProjectBundleFile,
    restoreProjectsFromBundle,
    importProjectFromFile,
    exportCurrentProjectMarkdown,
    settings,
    updateSettings,
    backupFolderStatus,
    backupDevice,
    backupSnapshotReview,
    connectBackupFolder,
    reauthorizeBackupFolder,
    disconnectBackupFolder,
    exportAllProjectsToBackupFolder,
    shareCurrentPortableSnapshot,
    downloadCurrentPortableSnapshot,
    inspectSharedPortableSnapshot,
    inspectBackupSnapshots,
    resolveBackupSnapshot,
  } = useAppStore();

  const [view, setView] = useState("list");
  const [previousView, setPreviousView] = useState("list");
  const repositoryState = useRepositorySnapshot(
    view === "project" ? currentProject?.repository || null : null
  );

  function handleCreateProject() {
    createProject();
    setView("project");
  }

  function handleCreateGovernedProject(preparedPackage) {
    createGovernedProject(preparedPackage);
    setView("project");
  }

  function handleInstallDemoProject() {
    installIdeDemoProject();
    setView("project");
  }

  function handleImportPublicRepository(draft) {
    importPublicRepositoryProject(draft);
    setView("project");
  }

  function handleOpenProject(projectId) {
    openProject(projectId);
    setView("project");
  }

  function handleBack() {
    setView("list");
  }

  function handleOpenSettings() {
    setPreviousView(view);
    setView("settings");
  }

  function handleBackFromSettings() {
    setView(previousView || "list");
  }

  const activeScreen =
    view === "list" ? (
      <ProjectListScreen
        projects={projects}
        onCreateProject={handleCreateProject}
        onStartGovernedProject={() => setView("governed")}
        onInstallDemoProject={handleInstallDemoProject}
        onOpenProject={handleOpenProject}
        onDeleteProject={deleteProject}
        onOpenSettings={handleOpenSettings}
        onMigrateKnownPortfolioProgress={migrateKnownPortfolioProgress}
        settings={settings}
        onUpdateSettings={updateSettings}
        onImportPublicRepository={handleImportPublicRepository}
        onImportDiscoveredRepository={importDiscoveredRepositoryProject}
      />
    ) : view === "governed" ? (
      <GovernedProjectBootstrapScreen
        onBack={handleBack}
        onCreateProject={handleCreateGovernedProject}
      />
    ) : view === "project" ? (
      <ProjectScreen
        projectDoc={currentProject}
        projectDocuments={projects}
        onBack={handleBack}
        onOpenSettings={handleOpenSettings}
        onUpdateProjectMeta={updateProjectMeta}
        onSetCurrentStage={setCurrentStage}
        onUpdateStageField={updateStageField}
        onAddBacklogItem={addBacklogItem}
        onAddWorkstream={addWorkstream}
        onUpdateWorkstream={updateWorkstream}
        onReorderWorkstream={reorderWorkstream}
        onApplyWorkstreamTemplate={applyWorkstreamTemplate}
        onUpdateBacklogItemWorkstream={updateBacklogItemWorkstream}
        onAddJournalEntry={addJournalEntry}
        onHandleDecisionTreeDestination={handleDecisionTreeDestination}
        onUpdateBacklogItemStatus={updateBacklogItemStatus}
        onUpdateDecisionStatus={updateDecisionStatus}
        onAddAttachment={addAttachment}
        onApproveKnowledgeReference={approveKnowledgeReference}
        onUpdateAttachment={updateAttachment}
        onRemoveAttachment={removeAttachment}
        onExportJson={exportCurrentProjectJson}
        onImportJson={importProjectFromFile}
        onExportMarkdown={() =>
          exportCurrentProjectMarkdown(repositoryState.result)
        }
        repositoryState={repositoryState}
        showFullStageJourney={settings?.showFullStageJourney === true}
        onToggleStageJourney={() =>
          updateSettings({
            showFullStageJourney: settings?.showFullStageJourney !== true,
          })
        }
      />
    ) : (
      <SettingsScreen
        settings={settings}
        projectCount={projects.length}
        onBack={handleBackFromSettings}
        onUpdateSettings={updateSettings}
        onExportAllProjects={exportAllProjectsJson}
        backupFolderStatus={backupFolderStatus}
        backupDevice={backupDevice}
        backupSnapshotReview={backupSnapshotReview}
        onConnectBackupFolder={connectBackupFolder}
        onReauthorizeBackupFolder={reauthorizeBackupFolder}
        onDisconnectBackupFolder={disconnectBackupFolder}
        onExportAllProjectsToBackupFolder={exportAllProjectsToBackupFolder}
        onSharePortableSnapshot={shareCurrentPortableSnapshot}
        onDownloadPortableSnapshot={downloadCurrentPortableSnapshot}
        onImportPortableSnapshot={inspectSharedPortableSnapshot}
        onInspectBackupSnapshots={inspectBackupSnapshots}
        onResolveBackupSnapshot={resolveBackupSnapshot}
        onInspectProjectBundle={inspectProjectBundleFile}
        onRestoreProjectBundle={restoreProjectsFromBundle}
      />
    );

  const rightPanel =
    view === "project" && settings?.markdownPreviewEnabled ? (
      <MarkdownPreview
        content={projectToMarkdown(currentProject, {
          locale: settings?.language,
          repositoryResult: repositoryState.result,
        })}
      />
    ) : null;

  return (
    <I18nProvider locale={settings?.language}>
      <ThemeController preference={settings?.theme} accessibility={settings} />
      {storageError ? (
        <main role="alert" className="panel" style={{ margin: "2rem auto", maxWidth: "48rem" }}>
          <h2>{settings?.language === "en" ? "Project storage unavailable" : "Stockage des projets indisponible"}</h2>
          <p>{settings?.language === "en"
            ? "Project copies are inconsistent or unavailable. Automatic writes are suspended to protect your data. Restore access to storage and reload the page; do not create or restore projects until the conflict is resolved."
            : "Les copies des projets sont divergentes ou inaccessibles. Les écritures automatiques sont suspendues pour protéger vos données. Rétablissez l’accès au stockage, puis rechargez la page ; ne créez ni ne restaurez de projets avant résolution du conflit."}</p>
        </main>
      ) : (
        <>
          <AppShell main={activeScreen} rightPanel={rightPanel} />
          <PwaPrompt />
        </>
      )}
    </I18nProvider>
  );
}
