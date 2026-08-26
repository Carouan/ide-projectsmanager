import { resolveProjectProgress } from "../../../services/projectProgress.js";
import { deriveAttentionItems } from "./attentionInboxModel.js";

export const DASHBOARD_VIEW = Object.freeze({
  GRID: "grid",
  LIST: "list",
});

export const DASHBOARD_SORT_FIELD = Object.freeze({
  TITLE: "title",
  UPDATED_AT: "updatedAt",
  PROGRESS: "progress",
});

export const DASHBOARD_SORT_DIRECTION = Object.freeze({
  ASCENDING: "asc",
  DESCENDING: "desc",
});

export const DASHBOARD_REPOSITORY_FILTER = Object.freeze({
  ALL: "all",
  LINKED: "linked",
  LOCAL: "local",
});

export const DASHBOARD_ATTENTION_FILTER = Object.freeze({
  ALL: "all",
  ACTION_REQUIRED: "action_required",
  BLOCKING_QUESTION: "blocking_question",
  DECISION_REQUIRED: "decision_required",
  VALIDATION_REQUIRED: "validation_required",
  INFORMATION: "information",
  NONE: "none",
});

export const DEFAULT_DASHBOARD_FILTERS = Object.freeze({
  query: "",
  status: "all",
  category: "all",
  repository: DASHBOARD_REPOSITORY_FILTER.ALL,
  attention: DASHBOARD_ATTENTION_FILTER.ALL,
});

const ACTIONABLE_ATTENTION = new Set([
  DASHBOARD_ATTENTION_FILTER.BLOCKING_QUESTION,
  DASHBOARD_ATTENTION_FILTER.DECISION_REQUIRED,
  DASHBOARD_ATTENTION_FILTER.VALIDATION_REQUIRED,
]);

function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

function projectCategories(projectDoc) {
  const project = projectDoc?.project || {};
  const values = [
    project.category,
    ...(Array.isArray(project.categories) ? project.categories : []),
    ...(Array.isArray(project.tags) ? project.tags : []),
  ];

  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function createAttentionIndex(projects, repositoryResults) {
  const categoriesByProjectId = new Map();

  for (const item of deriveAttentionItems(projects, repositoryResults)) {
    if (!categoriesByProjectId.has(item.projectId)) {
      categoriesByProjectId.set(item.projectId, new Set());
    }

    categoriesByProjectId.get(item.projectId).add(item.category);
  }

  return categoriesByProjectId;
}

export function normalizeDashboardPreferences(settings = {}) {
  return {
    dashboardView: Object.values(DASHBOARD_VIEW).includes(settings.dashboardView)
      ? settings.dashboardView
      : DASHBOARD_VIEW.GRID,
    dashboardSortField: Object.values(DASHBOARD_SORT_FIELD).includes(
      settings.dashboardSortField
    )
      ? settings.dashboardSortField
      : DASHBOARD_SORT_FIELD.UPDATED_AT,
    dashboardSortDirection: Object.values(DASHBOARD_SORT_DIRECTION).includes(
      settings.dashboardSortDirection
    )
      ? settings.dashboardSortDirection
      : DASHBOARD_SORT_DIRECTION.DESCENDING,
  };
}

export function createDashboardProjectRows(projects = [], repositoryResults = {}) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeRepositoryResults = repositoryResults || {};
  const attentionIndex = createAttentionIndex(safeProjects, safeRepositoryResults);

  return safeProjects.map((projectDoc, index) => {
    const project = projectDoc?.project || {};
    const categories = projectCategories(projectDoc);
    const repositoryResult = safeRepositoryResults[project.id] || null;

    return {
      projectDoc,
      projectId: project.id,
      title: project.title || "",
      status: project.status || "",
      categories,
      repositoryResult,
      hasRepository: Boolean(projectDoc?.repository),
      attentionCategories: attentionIndex.get(project.id) || new Set(),
      progress: resolveProjectProgress(projectDoc, repositoryResult),
      updatedAt: Date.parse(project.updatedAt),
      searchText: normalizeSearchValue(
        [
          project.title,
          project.summary,
          project.description,
          project.status,
          projectDoc?.repository?.fullName,
          ...categories,
        ].join(" ")
      ),
      index,
    };
  });
}

export function deriveDashboardFilterOptions(rows = [], locale = "fr") {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const statuses = new Set();
  const categories = new Map();

  for (const row of rows) {
    if (row.status) statuses.add(row.status);

    for (const category of row.categories) {
      const normalizedCategory = normalizeSearchValue(category);
      if (!categories.has(normalizedCategory)) {
        categories.set(normalizedCategory, category);
      }
    }
  }

  return {
    statuses: [...statuses].sort(collator.compare),
    categories: [...categories.values()].sort(collator.compare),
  };
}

function matchesAttentionFilter(row, filter) {
  if (filter === DASHBOARD_ATTENTION_FILTER.ALL) return true;
  if (filter === DASHBOARD_ATTENTION_FILTER.NONE) {
    return row.attentionCategories.size === 0;
  }
  if (filter === DASHBOARD_ATTENTION_FILTER.ACTION_REQUIRED) {
    return [...row.attentionCategories].some((category) =>
      ACTIONABLE_ATTENTION.has(category)
    );
  }

  return row.attentionCategories.has(filter);
}

function matchesDashboardFilters(row, filters) {
  const query = normalizeSearchValue(filters.query);

  if (query && !row.searchText.includes(query)) return false;
  if (filters.status !== "all" && row.status !== filters.status) return false;
  if (
    filters.category !== "all" &&
    !row.categories.some(
      (category) =>
        normalizeSearchValue(category) === normalizeSearchValue(filters.category)
    )
  ) {
    return false;
  }
  if (
    filters.repository === DASHBOARD_REPOSITORY_FILTER.LINKED &&
    !row.hasRepository
  ) {
    return false;
  }
  if (
    filters.repository === DASHBOARD_REPOSITORY_FILTER.LOCAL &&
    row.hasRepository
  ) {
    return false;
  }

  return matchesAttentionFilter(row, filters.attention);
}

function compareNullableNumber(left, right, direction) {
  const leftUnavailable = left === null || !Number.isFinite(left);
  const rightUnavailable = right === null || !Number.isFinite(right);

  if (leftUnavailable !== rightUnavailable) return leftUnavailable ? 1 : -1;
  if (leftUnavailable) return 0;

  return (left - right) * direction;
}

export function selectDashboardProjects(rows = [], options = {}) {
  const filters = {
    ...DEFAULT_DASHBOARD_FILTERS,
    ...(options.filters || {}),
  };
  const preferences = normalizeDashboardPreferences(options.preferences);
  const direction =
    preferences.dashboardSortDirection === DASHBOARD_SORT_DIRECTION.ASCENDING
      ? 1
      : -1;
  const collator = new Intl.Collator(options.locale || "fr", {
    sensitivity: "base",
    numeric: true,
  });

  return rows.filter((row) => matchesDashboardFilters(row, filters)).sort((left, right) => {
    let difference = 0;

    if (preferences.dashboardSortField === DASHBOARD_SORT_FIELD.TITLE) {
      difference = collator.compare(left.title, right.title) * direction;
    } else if (preferences.dashboardSortField === DASHBOARD_SORT_FIELD.PROGRESS) {
      difference = compareNullableNumber(
        left.progress.percent,
        right.progress.percent,
        direction
      );
    } else {
      difference = compareNullableNumber(left.updatedAt, right.updatedAt, direction);
    }

    return difference || collator.compare(left.title, right.title) || left.index - right.index;
  });
}

export function hasActiveDashboardFilters(filters = DEFAULT_DASHBOARD_FILTERS) {
  return (
    Boolean(String(filters.query || "").trim()) ||
    filters.status !== DEFAULT_DASHBOARD_FILTERS.status ||
    filters.category !== DEFAULT_DASHBOARD_FILTERS.category ||
    filters.repository !== DEFAULT_DASHBOARD_FILTERS.repository ||
    filters.attention !== DEFAULT_DASHBOARD_FILTERS.attention
  );
}
