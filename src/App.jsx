import { useState } from "react";
import { useAppStore } from "./store/useAppStore";
import ProjectListScreen from "./features/projects/screens/ProjectListScreen";
import ProjectScreen from "./features/projects/screens/ProjectScreen";
import SettingsScreen from "./features/projects/screens/SettingsScreen";
import MarkdownPreview from "./features/markdown/components/MarkdownPreview";
import PwaPrompt from "./components/PwaPrompt";
import AppShell from "./app/AppShell";
import { I18nProvider } from "./i18n/useI18n";
import { projectToMarkdown } from "./services/markdownExport";

export default function App() {
  const {
    projects,
    currentProject,
    createProject,
    installIdeDemoProject,
    openProject,
    deleteProject,
    updateProjectMeta,
    setCurrentStage,
    updateStageField,
    addBacklogItem,
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
  } = useAppStore();

  const [view, setView] = useState("list");
  const [previousView, setPreviousView] = useState("list");

  function handleCreateProject() {
    createProject();
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
        onInstallDemoProject={handleInstallDemoProject}
        onOpenProject={handleOpenProject}
        onDeleteProject={deleteProject}
        onOpenSettings={handleOpenSettings}
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
        onAddJournalEntry={addJournalEntry}
        onHandleDecisionTreeDestination={handleDecisionTreeDestination}
        onUpdateBacklogItemStatus={updateBacklogItemStatus}
        onUpdateDecisionStatus={updateDecisionStatus}
        onAddAttachment={addAttachment}
        onUpdateAttachment={updateAttachment}
        onRemoveAttachment={removeAttachment}
        onExportJson={exportCurrentProjectJson}
        onImportJson={importProjectFromFile}
        onExportMarkdown={exportCurrentProjectMarkdown}
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
        onInspectProjectBundle={inspectProjectBundleFile}
        onRestoreProjectBundle={restoreProjectsFromBundle}
      />
    );

  const rightPanel =
    view === "project" && settings?.markdownPreviewEnabled ? (
      <MarkdownPreview
        content={projectToMarkdown(currentProject, {
          locale: settings?.language,
        })}
      />
    ) : null;

  return (
    <I18nProvider locale={settings?.language}>
      <AppShell main={activeScreen} rightPanel={rightPanel} />
      <PwaPrompt />
    </I18nProvider>
  );
}
