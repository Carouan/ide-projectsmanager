import { useMemo } from "react";
import { useI18n } from "../../../i18n/useI18n";

function readConflict(sync) {
  if (sync?.lastConflict && typeof sync.lastConflict === "object") {
    return sync.lastConflict;
  }

  if (sync?.conflict && typeof sync.conflict === "object") {
    return sync.conflict;
  }

  return null;
}

function resolveSyncStatus(projectDoc) {
  const sync = projectDoc?.sync || {};
  const conflict = readConflict(sync);

  if (conflict?.hasConflict) {
    return "conflict";
  }

  if (sync?.lastError || sync?.error) {
    return "error";
  }

  if (sync?.dirty === true) {
    return "dirty";
  }

  if (sync?.remoteVersion > 0 || sync?.lastSyncedAt) {
    return "synced";
  }

  return "local_only";
}

export default function SyncStatusBadge({ projectDoc }) {
  const { t } = useI18n();

  const status = useMemo(() => resolveSyncStatus(projectDoc), [projectDoc]);

  return (
    <span className={`badge sync-badge sync-badge-${status}`}>
      {t("project.sync.label")}: {t(`project.sync.state.${status}`)}
    </span>
  );
}
