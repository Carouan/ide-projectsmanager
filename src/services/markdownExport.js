import { formatStageLabel, getStageDefinition } from "../constants/stages.js";
import {
  formatCalendarDate,
  formatDateTime,
} from "./dateTimePresentation.js";
import {
  formatProjectProgress,
  resolveProjectProgress,
} from "./projectProgress.js";
import { normalizeWorkstreams } from "./projectWorkstreams.js";

function escapeLine(value) {
  return String(value ?? "").trim();
}

export function projectToMarkdown(projectDoc, options = {}) {
  if (!projectDoc || !projectDoc.project) {
    return "# Projet invalide";
  }

  const { project, stages, backlog, journal, decisions } = projectDoc;
  const locale = options.locale || "fr";
  const english = locale === "en";
  const workstreams = normalizeWorkstreams(projectDoc.workstreams);
  const workstreamsById = new Map(
    workstreams.map((workstream) => [workstream.id, workstream])
  );
  const effectiveProgress = resolveProjectProgress(
    projectDoc,
    options.repositoryResult
  );
  const presentDateTime = (value) => formatDateTime(value, locale, options) || "-";
  const presentCalendarDate = (value) =>
    formatCalendarDate(value, locale, options) || "-";

  const lines = [];

  lines.push(`# ${escapeLine(project.title)}`);
  lines.push("");
  lines.push(`${escapeLine(project.summary)}`);
  lines.push("");

  lines.push("## Métadonnées");
  lines.push("");
  lines.push(`- Statut : ${escapeLine(project.status)}`);
  lines.push(
    `- Étape actuelle : ${escapeLine(formatStageLabel(project.currentStage))}`
  );
  lines.push(
    `- Progression déclarée : ${escapeLine(
      formatProjectProgress(
        project.progressPercent,
        locale === "en" ? "Not declared" : "Non déclarée"
      )
    )}`
  );
  if (effectiveProgress.percent !== null) {
    const sourceLabel =
      effectiveProgress.source === "manual"
        ? english
          ? "set manually"
          : "définie manuellement"
        : effectiveProgress.source === "roadmap"
          ? english
            ? `GitHub roadmap: ${effectiveProgress.completed}/${effectiveProgress.total} objectives`
            : `roadmap GitHub : ${effectiveProgress.completed}/${effectiveProgress.total} objectifs`
          : english
            ? `estimated from ${formatStageLabel(effectiveProgress.stageKey)}`
            : `estimée depuis ${formatStageLabel(effectiveProgress.stageKey)}`;

    lines.push(
      `- ${english ? "Project progress" : "Avancement du projet"} : ${formatProjectProgress(effectiveProgress.percent)} (${sourceLabel})`
    );
  }
  lines.push(`- Propriétaire : ${escapeLine(project.ownerId || "-")}`);
  lines.push(`- Créé le : ${escapeLine(presentDateTime(project.createdAt))}`);
  lines.push(
    `- Dernière mise à jour : ${escapeLine(presentDateTime(project.updatedAt))}`
  );
  lines.push("");

  if (escapeLine(project.description)) {
    lines.push("## Description");
    lines.push("");
    lines.push(escapeLine(project.description));
    lines.push("");
  }

  if (workstreams.length > 0) {
    lines.push(english ? "## Workstreams" : "## Chantiers");
    lines.push("");

    for (const workstream of workstreams) {
      lines.push(`### ${escapeLine(workstream.title)}`);
      lines.push("");
      lines.push(
        `- ${english ? "Status" : "Statut"} : ${escapeLine(workstream.status)}`
      );

      if (workstream.category) {
        lines.push(
          `- ${english ? "Category" : "Catégorie"} : ${escapeLine(workstream.category)}`
        );
      }

      if (workstream.archived) {
        lines.push(english ? "- Archived : yes" : "- Archivé : oui");
      }

      if (escapeLine(workstream.description)) {
        lines.push("");
        lines.push(escapeLine(workstream.description));
      }

      lines.push("");
    }
  }

  lines.push("## Étapes");
  lines.push("");

  Object.entries(stages || {}).forEach(([stageKey, stage]) => {
    lines.push(
      `### ${escapeLine(formatStageLabel(stageKey || stage.version))} — ${escapeLine(stage.title)}`
    );
    lines.push("");
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

      if (item.workstreamId) {
        const linkedWorkstream = workstreamsById.get(item.workstreamId);
        const workstreamTitle = linkedWorkstream
          ? linkedWorkstream.title
          : english
            ? `[unknown reference: ${item.workstreamId}]`
            : `[référence inconnue : ${item.workstreamId}]`;

        lines.push(
          `- ${english ? "Workstream" : "Chantier"} : ${escapeLine(workstreamTitle)}`
        );
      }

      const linkedStage = item.stageKey || item.relatedStage;
      const stageLabel =
        item.stageKey && !getStageDefinition(item.stageKey)
          ? english
            ? `[unknown stage: ${item.stageKey}]`
            : `[étape inconnue : ${item.stageKey}]`
          : formatStageLabel(linkedStage);

      lines.push(
        `- Étape liée : ${escapeLine(stageLabel)}`
      );
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
      lines.push(`- Étape : ${escapeLine(formatStageLabel(entry.stage))}`);
      lines.push(`- Date : ${escapeLine(presentDateTime(entry.createdAt))}`);
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
      lines.push(`- Date : ${escapeLine(presentCalendarDate(decision.date))}`);
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
