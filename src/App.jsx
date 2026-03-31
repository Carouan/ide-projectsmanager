import { useState } from "react";
import { useAppStore } from "./store/useAppStore";
import ProjectListScreen from "./features/projects/screens/ProjectListScreen";
import ProjectScreen from "./features/projects/screens/ProjectScreen";
import SettingsScreen from "./features/projects/screens/SettingsScreen";
import MarkdownPreview from "./features/markdown/components/MarkdownPreview";
import PwaPrompt from "./components/PwaPrompt";
import AppShell from "./app/AppShell";
import { I18nProvider } from "./i18n/useI18n";

function buildStagePreviewContent(projectDoc) {
  if (!projectDoc?.stages || !projectDoc?.project?.currentStage) {
    return "";
  }

  const activeStage = projectDoc.stages[projectDoc.project.currentStage];
  if (!activeStage) {
    return "";
  }

  const sections = [
    { title: "Objective", value: activeStage.goal },
    { title: "Notes", value: activeStage.notes },
    { title: "Deliverable", value: activeStage.deliverable },
    { title: "Definition of done", value: activeStage.definitionOfDone },
  ].filter((section) => String(section.value || "").trim());

  return sections.map((section) => `## ${section.title}\n${section.value}`).join("\n\n");
}

export default function App() {
  const {
    projects,
    currentProject,
    createProject,
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
    exportCurrentProjectJson,
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
        onExportJson={exportCurrentProjectJson}
        onImportJson={importProjectFromFile}
        onExportMarkdown={exportCurrentProjectMarkdown}
      />
    ) : (
      <SettingsScreen
        settings={settings}
        onBack={handleBackFromSettings}
        onUpdateSettings={updateSettings}
      />
    );

  const rightPanel =
    view === "project" && settings?.markdownPreviewEnabled ? (
      <MarkdownPreview content={buildStagePreviewContent(currentProject)} />
    ) : null;

  return (
    <I18nProvider locale={settings?.language}>
      <AppShell main={activeScreen} rightPanel={rightPanel} />
      <PwaPrompt />
    </I18nProvider>
  );
}
