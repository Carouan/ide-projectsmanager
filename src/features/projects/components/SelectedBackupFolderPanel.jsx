import { useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import {
  PORTABLE_BACKUP_ERROR_CODE,
  PORTABLE_BACKUP_PERMISSION,
} from "../../../repositories/portableBackup/portableBackupProvider";

function permissionKey(status) {
  if (!status?.isSupported) return "unsupported";
  if (!status.isConnected) return "disconnected";
  return status.permission || PORTABLE_BACKUP_PERMISSION.UNKNOWN;
}

function translatedError(t, error) {
  const knownCodes = new Set([
    PORTABLE_BACKUP_ERROR_CODE.PERMISSION_DENIED,
    PORTABLE_BACKUP_ERROR_CODE.PERMISSION_REQUIRED,
    PORTABLE_BACKUP_ERROR_CODE.PROVIDER_UNAVAILABLE,
    PORTABLE_BACKUP_ERROR_CODE.SELECTION_ABORTED,
    PORTABLE_BACKUP_ERROR_CODE.SECURITY_RESTRICTION,
    PORTABLE_BACKUP_ERROR_CODE.INVALID_PICKER_OPTIONS,
    PORTABLE_BACKUP_ERROR_CODE.WRITE_FAILED,
  ]);
  const code = knownCodes.has(error?.code) ? error.code : "generic";
  return t(`settings.backup.folder.errors.${code}`, {
    cause: error?.causeCode || error?.name || "UnknownError",
  });
}

export default function SelectedBackupFolderPanel({
  projectCount,
  status,
  device,
  onConnect,
  onReauthorize,
  onDisconnect,
  onWrite,
}) {
  const { t } = useI18n();
  const [pendingAction, setPendingAction] = useState("");
  const [feedback, setFeedback] = useState(null);
  const permission = permissionKey(status);
  const isSupported = status?.isSupported === true;
  const isConnected = status?.isConnected === true;
  const isGranted = status?.permission === PORTABLE_BACKUP_PERMISSION.GRANTED;

  async function runAction(action, callback) {
    setPendingAction(action);
    setFeedback(null);

    try {
      const result = await callback();

      if (action === "write" && result?.filename) {
        setFeedback({
          kind: "success",
          message: t("settings.backup.folder.saved", {
            filename: result.reference || result.filename,
          }),
        });
      }
    } catch (error) {
      setFeedback({ kind: "error", message: translatedError(t, error) });
    } finally {
      setPendingAction("");
    }
  }

  return (
    <section className="panel settings-folder-panel">
      <div>
        <div className="eyebrow">{t("settings.backup.folder.eyebrow")}</div>
        <h2>{t("settings.backup.folder.title")}</h2>
        <p className="hero-text">{t("settings.backup.folder.description")}</p>
      </div>

      <div className={`folder-status folder-status-${permission}`}>
        <strong>{t(`settings.backup.folder.status.${permission}`)}</strong>
        {isConnected && status.folderName && (
          <span>{t("settings.backup.folder.name", { name: status.folderName })}</span>
        )}
        {isConnected && device?.label && (
          <span>{t("settings.backup.folder.device", { label: device.label })}</span>
        )}
        <span>{t(`settings.backup.folder.explanation.${permission}`)}</span>
        {isConnected && (
          <span>
            {t(
              status.isRemembered
                ? "settings.backup.folder.remembered"
                : "settings.backup.folder.sessionOnly"
            )}
          </span>
        )}
      </div>

      {isSupported && (
        <div className="folder-actions">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={Boolean(pendingAction)}
            onClick={() => runAction("connect", onConnect)}
          >
            {t(
              isConnected
                ? "settings.backup.folder.change"
                : "settings.backup.folder.choose"
            )}
          </button>

          {isConnected && !isGranted && (
            <button
              className="btn btn-primary"
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("authorize", onReauthorize)}
            >
              {t("settings.backup.folder.authorize")}
            </button>
          )}

          {isConnected && isGranted && (
            <button
              className="btn btn-primary"
              type="button"
              disabled={Boolean(pendingAction) || projectCount === 0}
              onClick={() => runAction("write", onWrite)}
            >
              {t("settings.backup.folder.write")}
            </button>
          )}

          {isConnected && (
            <button
              className="btn btn-secondary"
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("disconnect", onDisconnect)}
            >
              {t("settings.backup.folder.disconnect")}
            </button>
          )}
        </div>
      )}

      <p className="folder-fallback-note">{t("settings.backup.folder.fallback")}</p>

      {feedback && (
        <div
          className={`bundle-restore-message bundle-restore-${feedback.kind}`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </div>
      )}
    </section>
  );
}
