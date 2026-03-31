import { useState } from "react";
import { useAppStore } from "./store/useAppStore";
import ProjectListScreen from "./features/projects/screens/ProjectListScreen";
import ProjectScreen from "./features/projects/screens/ProjectScreen";
import SettingsScreen from "./features/projects/screens/SettingsScreen";
import PwaPrompt from "./components/PwaPrompt";
import AppShell from "./app/AppShell";

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
        language={settings.language}
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
        language={settings.language}
      />
    ) : (
      <SettingsScreen
        settings={settings}
        onBack={handleBackFromSettings}
        onUpdateSettings={updateSettings}
      />
    );

  return (
    <>
      <AppShell main={activeScreen} rightPanel={null} />
      <PwaPrompt language={settings.language} />
    </>
  );
}
