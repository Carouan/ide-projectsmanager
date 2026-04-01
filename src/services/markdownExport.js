function escapeLine(value) {
  return String(value ?? "").trim();
}

export function projectToMarkdown(projectDoc) {
  if (!projectDoc || !projectDoc.project) {
    return "# Projet invalide";
  }

  const { project, stages, backlog, journal, decisions } = projectDoc;

  const lines = [];

  lines.push(`# ${escapeLine(project.title)}`);
  lines.push("");
  lines.push(`${escapeLine(project.summary)}`);
  lines.push("");

  lines.push("## Métadonnées");
  lines.push("");
  lines.push(`- Statut : ${escapeLine(project.status)}`);
  lines.push(`- Étape actuelle : ${escapeLine(project.currentStage)}`);
  lines.push(`- Propriétaire : ${escapeLine(project.ownerId || "-")}`);
  lines.push(`- Créé le : ${escapeLine(project.createdAt)}`);
  lines.push(`- Dernière mise à jour : ${escapeLine(project.updatedAt)}`);
  lines.push("");

  if (escapeLine(project.description)) {
    lines.push("## Description");
    lines.push("");
    lines.push(escapeLine(project.description));
    lines.push("");
  }

  lines.push("## Étapes");
  lines.push("");

  Object.entries(stages || {}).forEach(([stageKey, stage]) => {
    lines.push(`### ${escapeLine(stage.version)} — ${escapeLine(stage.title)}`);
    lines.push("");
    lines.push(`- Clé : ${stageKey}`);
    lines.push(`- Statut : ${escapeLine(stage.status)}`);
    lines.push("");

    if (escapeLine(stage.goal)) {
      lines.push("#### Objectif");
      lines.push("");
      lines.push(escapeLine(stage.goal));
      lines.push("");
    }

    if (escapeLine(stage.notes)) {
      lines.push("#### Notes");
      lines.push("");
      lines.push(escapeLine(stage.notes));
      lines.push("");
    }

    if (escapeLine(stage.deliverable)) {
      lines.push("#### Livrable");
      lines.push("");
      lines.push(escapeLine(stage.deliverable));
      lines.push("");
    }

    if (escapeLine(stage.definitionOfDone)) {
      lines.push("#### Definition of Done");
      lines.push("");
      lines.push(escapeLine(stage.definitionOfDone));
      lines.push("");
    }
  });

  lines.push("## Backlog");
  lines.push("");

  if (!backlog || backlog.length === 0) {
    lines.push("_Aucun item backlog._");
    lines.push("");
  } else {
    backlog.forEach((item) => {
      lines.push(`### ${escapeLine(item.title)}`);
      lines.push("");
      lines.push(`- Statut : ${escapeLine(item.status)}`);
      lines.push(`- Type : ${escapeLine(item.type)}`);
      lines.push(`- Priorité : ${escapeLine(item.priority)}`);
      lines.push(`- Source : ${escapeLine(item.source)}`);
      lines.push(`- Étape liée : ${escapeLine(item.relatedStage)}`);
      lines.push("");
      if (escapeLine(item.description)) {
        lines.push(escapeLine(item.description));
        lines.push("");
      }
    });
  }

  lines.push("## Journal");
  lines.push("");

  if (!journal || journal.length === 0) {
    lines.push("_Aucune entrée de journal._");
    lines.push("");
  } else {
    journal.forEach((entry) => {
      lines.push(`### ${escapeLine(entry.title || entry.type || "Entrée")}`);
      lines.push("");
      lines.push(`- Type : ${escapeLine(entry.type)}`);
      lines.push(`- Étape : ${escapeLine(entry.stage)}`);
      lines.push(`- Date : ${escapeLine(entry.createdAt)}`);
      lines.push("");
      lines.push(escapeLine(entry.content));
      lines.push("");
    });
  }

  lines.push("## Décisions");
  lines.push("");

  if (!decisions || decisions.length === 0) {
    lines.push("_Aucune décision structurée._");
    lines.push("");
  } else {
    decisions.forEach((decision) => {
      lines.push(`### ${escapeLine(decision.title)}`);
      lines.push("");
      lines.push(`- Date : ${escapeLine(decision.date)}`);
      lines.push(`- Statut : ${escapeLine(decision.status)}`);
      lines.push("");
      lines.push(`**Contexte**`);
      lines.push("");
      lines.push(escapeLine(decision.context));
      lines.push("");
      lines.push(`**Décision**`);
      lines.push("");
      lines.push(escapeLine(decision.decision));
      lines.push("");
    });
  }

  return lines.join("\n");
}

export function downloadMarkdownFile(filename, markdown) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}