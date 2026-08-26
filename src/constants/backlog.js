export const BACKLOG_STATUS = {
  OPEN: "open",
  PLANNED: "planned",
  DONE: "done",
  DROPPED: "dropped",
};

const LEGACY_STATUS_MAP = {
  todo: BACKLOG_STATUS.OPEN,
};

export function normalizeBacklogStatus(status) {
  if (!status) return BACKLOG_STATUS.OPEN;
  return LEGACY_STATUS_MAP[status] || status;
}
