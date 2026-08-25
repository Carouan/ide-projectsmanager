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
    currentProject,
    createProject,
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
      />
    ) : view === "governed" ? (
      <GovernedProjectBootstrapScreen
        onBack={handleBack}
        onCreateProject={handleCreateGovernedProject}
      />
    ) : view === "project" ? (
      <ProjectScreen
        projectDoc={currentProject}
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
      <AppShell main={activeScreen} rightPanel={rightPanel} />
      <PwaPrompt />
    </I18nProvider>
  );
}
