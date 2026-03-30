$ErrorActionPreference = "Stop"

Write-Host "=== Setup MVP React v2 ===" -ForegroundColor Cyan

if (-not (Test-Path "package.json")) {
    throw "package.json introuvable. Lance ce script depuis la racine du projet."
}

if (-not (Test-Path "src")) {
    throw "Dossier src introuvable."
}

$folders = @(
    "src/components",
    "src/screens",
    "src/store",
    "src/services"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Créé : $folder"
    }
}

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
    updateStageField,
    addBacklogItem,
    updateBacklogItemStatus,
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
      onUpdateStageField={updateStageField}
      onAddBacklogItem={addBacklogItem}
      onUpdateBacklogItemStatus={updateBacklogItemStatus}
    />
  );
}
'@ | Set-Content -Path "src/App.jsx" -Encoding UTF8

@'
import { useState } from "react";

export default function ProjectListScreen({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
}) {
  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="hero">
          <div>
            <div className="eyebrow">MVP local • React + Vite</div>
            <h1>IDE de projet personnel</h1>
            <p className="hero-text">
              Liste des projets sauvegardés localement dans le navigateur.
            </p>
          </div>

          <button className="btn btn-primary" onClick={onCreateProject}>
            + Nouveau projet
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h2>Aucun projet pour le moment</h2>
            <p>
              Crée ton premier projet pour commencer à structurer tes idées.
            </p>
          </div>
        ) : (
          <div className="card-grid">
            {projects.map((p) => (
              <article className="project-card" key={p.project.id}>
                <div className="project-card-header">
                  <div>
                    <h3>{p.project.title}</h3>
                    <p className="muted">{p.project.summary}</p>
                  </div>
                  <span className="badge">{p.project.currentStage}</span>
                </div>

                <div className="project-meta">
                  <span>Statut : {p.project.status}</span>
                  <span>
                    Modifié : {new Date(p.project.updatedAt).toLocaleString()}
                  </span>
                </div>

                <div className="project-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => onOpenProject(p.project.id)}
                  >
                    Ouvrir
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => onDeleteProject(p.project.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
'@ | Set-Content -Path "src/screens/ProjectListScreen.jsx" -Encoding UTF8

@'
import { useState } from "react";
import StageEditor from "../components/StageEditor";
import BacklogPanel from "../components/BacklogPanel";

export default function ProjectScreen({
  projectDoc,
  onBack,
  onUpdateProjectMeta,
  onUpdateStageField,
  onAddBacklogItem,
  onUpdateBacklogItemStatus,
}) {
  const [tab, setTab] = useState("project");

  if (!projectDoc) {
    return (
      <div className="page-shell">
        <div className="page-container">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Retour
          </button>
          <div className="empty-state">
            <h2>Aucun projet sélectionné</h2>
            <p>Reviens à la liste puis ouvre un projet.</p>
          </div>
        </div>
      </div>
    );
  }

  const { project, stages, backlog } = projectDoc;
  const stage = stages.v0_0;

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="topbar">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Retour
          </button>
          <div className="topbar-meta">
            <span className="badge">{project.currentStage}</span>
            <span className="muted">
              Dernière mise à jour :{" "}
              {new Date(project.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>

        <section className="hero hero-project">
          <div>
            <div className="eyebrow">Projet</div>
            <h1>{project.title}</h1>
            <p className="hero-text">{project.summary}</p>
          </div>
        </section>

        <div className="tabs">
          <button
            className={`tab ${tab === "project" ? "tab-active" : ""}`}
            onClick={() => setTab("project")}
          >
            Projet
          </button>
          <button
            className={`tab ${tab === "stage" ? "tab-active" : ""}`}
            onClick={() => setTab("stage")}
          >
            Étape v0.0
          </button>
          <button
            className={`tab ${tab === "backlog" ? "tab-active" : ""}`}
            onClick={() => setTab("backlog")}
          >
            Backlog
          </button>
        </div>

        {tab === "project" && (
          <section className="panel">
            <h2>Métadonnées du projet</h2>

            <div className="form-grid">
              <label className="field">
                <span>Titre</span>
                <input
                  value={project.title}
                  onChange={(e) =>
                    onUpdateProjectMeta(project.id, { title: e.target.value })
                  }
                />
              </label>

              <label className="field field-full">
                <span>Résumé</span>
                <textarea
                  rows={4}
                  value={project.summary}
                  onChange={(e) =>
                    onUpdateProjectMeta(project.id, { summary: e.target.value })
                  }
                />
              </label>

              <label className="field field-full">
                <span>Description</span>
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
          <StageEditor
            projectId={project.id}
            stageKey="v0_0"
            stage={stage}
            onUpdateStageField={onUpdateStageField}
          />
        )}

        {tab === "backlog" && (
          <BacklogPanel
            projectId={project.id}
            backlog={backlog}
            onAddBacklogItem={onAddBacklogItem}
            onUpdateBacklogItemStatus={onUpdateBacklogItemStatus}
          />
        )}
      </div>
    </div>
  );
}
'@ | Set-Content -Path "src/screens/ProjectScreen.jsx" -Encoding UTF8

@'
export default function StageEditor({
  projectId,
  stageKey,
  stage,
  onUpdateStageField,
}) {
  if (!stage) {
    return (
      <section className="panel">
        <h2>Étape introuvable</h2>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{stage.title}</h2>
          <p className="muted">Édition de l'étape {stage.version}</p>
        </div>
        <span className="badge">{stage.status}</span>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Statut</span>
          <select
            value={stage.status}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "status", e.target.value)
            }
          >
            <option value="todo">todo</option>
            <option value="in_progress">in_progress</option>
            <option value="blocked">blocked</option>
            <option value="done">done</option>
          </select>
        </label>

        <label className="field field-full">
          <span>Objectif</span>
          <textarea
            rows={3}
            value={stage.goal}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "goal", e.target.value)
            }
          />
        </label>

        <label className="field field-full">
          <span>Notes</span>
          <textarea
            rows={6}
            value={stage.notes}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "notes", e.target.value)
            }
          />
        </label>

        <label className="field field-full">
          <span>Livrable</span>
          <textarea
            rows={4}
            value={stage.deliverable}
            onChange={(e) =>
              onUpdateStageField(
                projectId,
                stageKey,
                "deliverable",
                e.target.value
              )
            }
          />
        </label>

        <label className="field field-full">
          <span>Definition of Done</span>
          <textarea
            rows={4}
            value={stage.definitionOfDone}
            onChange={(e) =>
              onUpdateStageField(
                projectId,
                stageKey,
                "definitionOfDone",
                e.target.value
              )
            }
          />
        </label>
      </div>
    </section>
  );
}
'@ | Set-Content -Path "src/components/StageEditor.jsx" -Encoding UTF8

@'
import { useState } from "react";

export default function BacklogPanel({
  projectId,
  backlog,
  onAddBacklogItem,
  onUpdateBacklogItemStatus,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleAdd() {
    if (!title.trim()) return;

    onAddBacklogItem(projectId, {
      title: title.trim(),
      description: description.trim(),
      type: "idea",
      priority: "medium",
      status: "open",
      source: "manual",
      relatedStage: "v0_0",
    });

    setTitle("");
    setDescription("");
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Backlog</h2>
          <p className="muted">
            Idées, améliorations et éléments reportés pour plus tard.
          </p>
        </div>
        <span className="badge">{backlog.length} item(s)</span>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Titre</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Ajouter export Markdown"
          />
        </label>

        <label className="field field-full">
          <span>Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décris brièvement l'idée"
          />
        </label>

        <div className="field-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            + Ajouter au backlog
          </button>
        </div>
      </div>

      <div className="backlog-list">
        {backlog.length === 0 ? (
          <div className="empty-inline">Aucun item backlog pour le moment.</div>
        ) : (
          backlog.map((item) => (
            <article className="backlog-item" key={item.id}>
              <div className="backlog-item-top">
                <div>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.description || "Sans description"}</p>
                </div>
                <span className="badge">{item.status}</span>
              </div>

              <div className="project-meta">
                <span>Type : {item.type}</span>
                <span>Priorité : {item.priority}</span>
                <span>Source : {item.source}</span>
              </div>

              <div className="project-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, "planned")
                  }
                >
                  Planned
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, "done")
                  }
                >
                  Done
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, "dropped")
                  }
                >
                  Dropped
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
'@ | Set-Content -Path "src/components/BacklogPanel.jsx" -Encoding UTF8

@'
import { useEffect, useState } from "react";
import { loadProjects, saveProjects } from "../services/storage";
import { createEmptyProject } from "../services/projectFactory";

function newBacklogId() {
  return `b_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

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

  function updateStageField(projectId, stageKey, field, value) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          stages: {
            ...p.stages,
            [stageKey]: {
              ...p.stages[stageKey],
              [field]: value,
            },
          },
        };
      })
    );
  }

  function addBacklogItem(projectId, item) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        const backlogItem = {
          id: newBacklogId(),
          createdAt: new Date().toISOString(),
          ...item,
        };

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          backlog: [backlogItem, ...p.backlog],
        };
      })
    );
  }

  function updateBacklogItemStatus(projectId, itemId, status) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          backlog: p.backlog.map((item) =>
            item.id === itemId ? { ...item, status } : item
          ),
        };
      })
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
    updateStageField,
    addBacklogItem,
    updateBacklogItemStatus,
  };
}
'@ | Set-Content -Path "src/store/useAppStore.js" -Encoding UTF8

@'
:root {
  font-family: Inter, Arial, sans-serif;
  color: #e7ecf3;
  background: #0f172a;
  line-height: 1.5;
  font-weight: 400;

  --bg: #0f172a;
  --bg-soft: #111827;
  --panel: #172033;
  --panel-2: #1e293b;
  --border: #2f3c52;
  --text: #e7ecf3;
  --muted: #a7b2c5;
  --primary: #7c3aed;
  --primary-2: #8b5cf6;
  --danger: #b91c1c;
  --danger-2: #ef4444;
  --secondary: #334155;
  --secondary-2: #475569;
  --badge: #243247;
  --shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at top, rgba(124, 58, 237, 0.18), transparent 30%),
    var(--bg);
  color: var(--text);
}

body {
  min-width: 320px;
}

button,
input,
textarea,
select {
  font: inherit;
}

.page-shell {
  min-height: 100vh;
  padding: 32px 20px 60px;
}

.page-container {
  max-width: 1100px;
  margin: 0 auto;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 28px;
}

.hero-project {
  margin-bottom: 20px;
}

.eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #b79cff;
  margin-bottom: 8px;
}

h1 {
  margin: 0 0 10px;
  font-size: 2.35rem;
  line-height: 1.1;
}

h2 {
  margin: 0 0 14px;
  font-size: 1.35rem;
}

h3 {
  margin: 0 0 10px;
  font-size: 1.1rem;
}

.hero-text,
.muted {
  color: var(--muted);
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.topbar-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.tab {
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  border-radius: 999px;
  padding: 10px 16px;
  cursor: pointer;
  transition: 0.18s ease;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.06);
}

.tab-active {
  background: rgba(124, 58, 237, 0.18);
  border-color: rgba(139, 92, 246, 0.55);
}

.card-grid {
  display: grid;
  gap: 16px;
}

.project-card,
.panel,
.empty-state,
.backlog-item {
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow);
}

.project-card {
  padding: 22px;
}

.project-card-header,
.panel-header,
.backlog-item-top {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: start;
}

.project-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 0.95rem;
  margin: 14px 0 18px;
}

.project-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.panel {
  padding: 24px;
}

.empty-state {
  padding: 36px 24px;
  text-align: center;
}

.empty-inline {
  padding: 18px;
  border: 1px dashed var(--border);
  border-radius: 14px;
  color: var(--muted);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  font-weight: 600;
}

.field-full {
  grid-column: 1 / -1;
}

.field-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-start;
}

input,
textarea,
select {
  width: 100%;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text);
  border-radius: 12px;
  padding: 12px 14px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

input:focus,
textarea:focus,
select:focus {
  border-color: rgba(139, 92, 246, 0.75);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.16);
}

.btn {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  color: white;
  font-weight: 600;
  transition: transform 0.12s ease, opacity 0.18s ease, background 0.18s ease;
}

.btn:hover {
  transform: translateY(-1px);
  opacity: 0.96;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
}

.btn-secondary {
  background: linear-gradient(135deg, var(--secondary), var(--secondary-2));
}

.btn-danger {
  background: linear-gradient(135deg, var(--danger), var(--danger-2));
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--badge);
  border: 1px solid var(--border);
  color: #dce7f7;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.9rem;
  white-space: nowrap;
}

.backlog-list {
  display: grid;
  gap: 14px;
  margin-top: 24px;
}

.backlog-item {
  padding: 18px;
}

@media (max-width: 760px) {
  .hero,
  .topbar,
  .project-card-header,
  .panel-header,
  .backlog-item-top {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .field-full {
    grid-column: auto;
  }
}
'@ | Set-Content -Path "src/index.css" -Encoding UTF8

Write-Host ""
Write-Host "=== v2 terminée ===" -ForegroundColor Green
Write-Host "Relance ensuite :" -ForegroundColor Yellow
Write-Host "  npm run dev"
Write-Host ""