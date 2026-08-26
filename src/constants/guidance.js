export const USER_GUIDE_URLS = {
  fr: "https://github.com/Carouan/ide-projectsmanager/blob/main/docs/user-guide.md",
  en: "https://github.com/Carouan/ide-projectsmanager/blob/main/docs/user-guide.en.md",
};

export const STAGE_GUIDANCE_FIELD_KEYS = [
  "goal",
  "notes",
  "deliverable",
  "definitionOfDone",
];

export function getUserGuideUrl(locale) {
  return USER_GUIDE_URLS[locale] || USER_GUIDE_URLS.fr;
}

export function getStageGuidanceKeys(stageKey) {
  return {
    why: `guidance.stage.${stageKey}.why`,
    questions: `guidance.stage.${stageKey}.questions`,
    example: `guidance.stage.${stageKey}.example`,
  };
}

export function asGuidanceList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}
