const CHECKBOX_LINE = /^(\s*)(?:[-*+]\s+)\[([ xX])\]\s+(.+?)\s*$/u;
const HEADING_LINE = /^(#{1,6})\s+(.+?)\s*$/u;
const WEIGHT_MARKER = /\s*<!--\s*weight\s*:\s*(\d{1,3})\s*-->\s*$/iu;
const SCOPE_START = /<!--\s*roadmap-progress\s*:\s*start\s*-->/iu;
const SCOPE_END = /<!--\s*roadmap-progress\s*:\s*end\s*-->/iu;
const ROADMAP_HEADING = /\b(?:roadmap|feuille de route)\b/iu;

function indentationWidth(value) {
  return String(value || "").replace(/\t/g, "  ").length;
}

function selectExplicitScope(lines) {
  const startIndex = lines.findIndex((line) => SCOPE_START.test(line));
  if (startIndex < 0) return null;

  const endOffset = lines
    .slice(startIndex + 1)
    .findIndex((line) => SCOPE_END.test(line));

  return endOffset < 0
    ? lines.slice(startIndex + 1)
    : lines.slice(startIndex + 1, startIndex + 1 + endOffset);
}

function selectReadmeRoadmapSection(lines) {
  const startIndex = lines.findIndex((line) => {
    const heading = HEADING_LINE.exec(line.trim());
    return heading && ROADMAP_HEADING.test(heading[2]);
  });

  if (startIndex < 0) return [];

  const startHeading = HEADING_LINE.exec(lines[startIndex].trim());
  const level = startHeading[1].length;
  const endOffset = lines.slice(startIndex + 1).findIndex((line) => {
    const heading = HEADING_LINE.exec(line.trim());
    return heading && heading[1].length <= level;
  });

  return endOffset < 0
    ? lines.slice(startIndex + 1)
    : lines.slice(startIndex + 1, startIndex + 1 + endOffset);
}

function selectProgressLines(markdown, sourcePath) {
  const lines = String(markdown || "").split(/\r?\n/);
  const explicitScope = selectExplicitScope(lines);
  if (explicitScope) return explicitScope;

  return /(^|\/)readme\.md$/iu.test(String(sourcePath || ""))
    ? selectReadmeRoadmapSection(lines)
    : lines;
}

function parseWeight(label) {
  const marker = WEIGHT_MARKER.exec(label);
  if (!marker) return { label: label.trim(), weight: 1 };

  const weight = Number(marker[1]);
  return {
    label: label.slice(0, marker.index).trim(),
    weight: Number.isInteger(weight) && weight > 0 ? weight : 1,
  };
}

function parseCheckboxes(lines) {
  const candidates = [];
  let inFence = false;
  let currentSection = null;

  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/u.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = HEADING_LINE.exec(line.trim());
    if (heading) {
      currentSection = heading[2].trim();
      continue;
    }

    const checkbox = CHECKBOX_LINE.exec(line);
    if (!checkbox) continue;

    const weightedLabel = parseWeight(checkbox[3]);
    if (!weightedLabel.label) continue;

    candidates.push({
      line: index + 1,
      indentation: indentationWidth(checkbox[1]),
      completed: checkbox[2].toLowerCase() === "x",
      label: weightedLabel.label,
      weight: weightedLabel.weight,
      section: currentSection,
    });
  }

  return candidates.filter((candidate, index) => {
    for (let nextIndex = index + 1; nextIndex < candidates.length; nextIndex += 1) {
      const nextCandidate = candidates[nextIndex];
      if (nextCandidate.indentation <= candidate.indentation) break;
      if (nextCandidate.indentation > candidate.indentation) return false;
    }
    return true;
  });
}

export function parseRoadmapProgress(markdown, options = {}) {
  if (typeof markdown !== "string" || !markdown.trim()) return null;

  const sourcePath = options.sourcePath || "ROADMAP.md";
  const objectives = parseCheckboxes(
    selectProgressLines(markdown, sourcePath)
  );
  if (objectives.length === 0) return null;

  const completedObjectives = objectives.filter(
    (objective) => objective.completed
  );
  const totalWeight = objectives.reduce(
    (total, objective) => total + objective.weight,
    0
  );
  const completedWeight = completedObjectives.reduce(
    (total, objective) => total + objective.weight,
    0
  );

  return {
    sourcePath,
    percent: Math.round((completedWeight / totalWeight) * 100),
    completed: completedObjectives.length,
    total: objectives.length,
    completedWeight,
    totalWeight,
    objectives,
    nextObjectives: objectives
      .filter((objective) => !objective.completed)
      .slice(0, 3),
  };
}
