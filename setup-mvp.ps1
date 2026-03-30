$ErrorActionPreference = "Stop"

Write-Host "=== Setup MVP React local ===" -ForegroundColor Cyan

# Vérifier qu'on est bien dans un projet Vite/React
if (-not (Test-Path "package.json")) {
    throw "package.json introuvable. Lance ce script depuis la racine du projet Vite."
}

if (-not (Test-Path "src")) {
    throw "Dossier src introuvable. Lance ce script depuis la racine du projet."
}

# 1. Supprimer les éléments inutiles du template
if (Test-Path "src/assets") {
    Remove-Item "src/assets" -Recurse -Force
    Write-Host "Supprimé : src/assets"
}

if (Test-Path "src/App.css") {
    Remove-Item "src/App.css" -Force
    Write-Host "Supprimé : src/App.css"
}

# 2. Créer l'arborescence utile
$folders = @(
    "src/store",
    "src/screens",
    "src/services"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Créé : $folder"
    }
}

# 3. Écrire les fichiers

@'
export function createEmptyProject() {
  const now = new Date().toISOString();

  return {
    schemaVersion: "1.0",
    project: {
      id: crypto.randomUUID(),
      slug: "nouveau-projet",
      title: "Nouveau projet",
      summary: "Résumé à compléter",
      description: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
      tags: [],
      owner: "Sébastien",
      currentStage: "v0_0",
    },
    stages: {
      v0_0: {
        version: "v.0.0",
        title: "Idée initiale",
        status: "todo",
        goal: "",
        notes: "",
        deliverable: "",
        definitionOfDone: "",
        linkedBacklogIds: [],
        linkedJournalIds: [],
      },
    },
    backlog: [],
    journal: [],
    decisions: [],
    attachments: [],
    settings: {
      theme: "dark",
      autosave: true,
      exportFormat: "markdown",
    },
  };
}
'@ | Set-Content -Path "src/services/projectFactory.js" -Encoding UTF8

@'
const STORAGE_KEY = "ide-projet-personnel.projects";

export function loadProjects() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
'@ | Set-Content -Path "src/services/storage.js" -Encoding UTF8

@'
import { useEffect, useState } from "react";
import { loadProjects, saveProjects } from "../services/storage";
import { createEmptyProject } from "../services/projectFactory";

export function useAppStore() {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadProjects();
    setProjects(loaded);
    if (loaded.length > 0) {
      setCurrentProjectId(loaded[0].project.id);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveProjects(projects);
  }, [projects, isHydrated]);

  function createProject() {
    const newProject = createEmptyProject();
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newProject.project.id);
  }

  function openProject(projectId) {
    setCurrentProjectId(projectId);
  }

  function deleteProject(projectId) {
    setProjects((prev) => prev.filter((p) => p.project.id !== projectId));
    setCurrentProjectId((prev) => (prev === projectId ? null : prev));
  }

  function updateProjectMeta(projectId, patch) {
    setProjects((prev) =>
      prev.map((p) =>
        p.project.id === projectId
          ? {
              ...p,
              project: {
                ...p.project,
                ...patch,
                updatedAt: new Date().toISOString(),
              },
            }
          : p
      )
    );
  }

  const currentProject =
    projects.find((p) => p.project.id === currentProjectId) ?? null;

  return {
    projects,
    currentProject,
    currentProjectId,
    createProject,
    openProject,
    deleteProject,
    updateProjectMeta,
  };
}
'@ | Set-Content -Path "src/store/useAppStore.js" -Encoding UTF8

@'
export default function ProjectListScreen({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
}) {
  return (
    <div style={{ padding: 24 }}>
      <h1>IDE de projet personnel</h1>
      <p>Liste des projets locaux</p>

      <button onClick={onCreateProject} style={{ marginBottom: 16 }}>
        Nouveau projet
      </button>

      {projects.length === 0 ? (
        <p>Aucun projet pour le moment.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {projects.map((p) => (
            <div
              key={p.project.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                background: "#fff",
              }}
            >
              <h3>{p.project.title}</h3>
              <p>{p.project.summary}</p>
              <p>Étape courante : {p.project.currentStage}</p>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onOpenProject(p.project.id)}>
                  Ouvrir
                </button>
                <button onClick={() => onDeleteProject(p.project.id)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
'@ | Set-Content -Path "src/screens/ProjectListScreen.jsx" -Encoding UTF8

@'
export default function ProjectScreen({
  projectDoc,
  onBack,
  onUpdateProjectMeta,
}) {
  if (!projectDoc) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={onBack}>← Retour</button>
        <p>Aucun projet sélectionné.</p>
      </div>
    );
  }

  const { project } = projectDoc;

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <button onClick={onBack}>← Retour</button>

      <h1>{project.title}</h1>

      <label>
        Titre
        <br />
        <input
          value={project.title}
          onChange={(e) =>
            onUpdateProjectMeta(project.id, { title: e.target.value })
          }
          style={{ width: "100%", maxWidth: 500 }}
        />
      </label>

      <label>
        Résumé
        <br />
        <textarea
          value={project.summary}
          onChange={(e) =>
            onUpdateProjectMeta(project.id, { summary: e.target.value })
          }
          rows={4}
          style={{ width: "100%", maxWidth: 700 }}
        />
      </label>

      <div>
        <strong>Étape actuelle :</strong> {project.currentStage}
      </div>

      <div>
        <strong>Dernière mise à jour :</strong> {project.updatedAt}
      </div>
    </div>
  );
}
'@ | Set-Content -Path "src/screens/ProjectScreen.jsx" -Encoding UTF8

@'
import { useState } from "react";
import { useAppStore } from "./store/useAppStore";
import ProjectListScreen from "./screens/ProjectListScreen";
import ProjectScreen from "./screens/ProjectScreen";

export default function App() {
  const {
    projects,
    currentProject,
    createProject,
    openProject,
    deleteProject,
    updateProjectMeta,
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

  return view === "list" ? (
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
    />
  );
}
'@ | Set-Content -Path "src/App.jsx" -Encoding UTF8

@'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'@ | Set-Content -Path "src/main.jsx" -Encoding UTF8

@'
:root {
  font-family: Arial, sans-serif;
}

body {
  margin: 0;
  background: #f7f7f7;
  color: #222;
}

button {
  cursor: pointer;
}
'@ | Set-Content -Path "src/index.css" -Encoding UTF8

# 4. Créer une task VS Code pour lancer Vite plus facilement
if (-not (Test-Path ".vscode")) {
    New-Item -ItemType Directory -Path ".vscode" | Out-Null
    Write-Host "Créé : .vscode"
}

@'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Vite: dev",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
'@ | Set-Content -Path ".vscode/tasks.json" -Encoding UTF8

Write-Host ""
Write-Host "=== Terminé ===" -ForegroundColor Green
Write-Host "Tu peux maintenant lancer :" -ForegroundColor Yellow
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Ou dans VS Code :" -ForegroundColor Yellow
Write-Host "  Terminal > Run Task > Vite: dev"