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
            <div className="eyebrow">MVP local - React + Vite</div>
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
