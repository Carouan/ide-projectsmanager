import { useState } from "react";
import { useAppStore } from "./store/useAppStore";
import ProjectListScreen from "./features/projects/screens/ProjectListScreen";
import ProjectScreen from "./features/projects/screens/ProjectScreen";
import PwaPrompt from "./components/PwaPrompt";

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
  } = useAppStore();

  const [view, setView] = useState("list");

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

  return (
    <>
      {view === "list" ? (
        <ProjectListScreen
          projects={projects}
          onCreateProject={handleCreateProject}
          onOpenProject={handleOpenProject}
          onDeleteProject={deleteProject}
        />
      ) : (
        <ProjectScreen
          projectDoc={currentProject}
          onBack={handleBack}
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
      )}

      <PwaPrompt />
    </>
  );
}