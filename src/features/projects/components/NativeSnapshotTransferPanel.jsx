import { useRef, useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import {
  inspectNativeSnapshotTransferSupport,
  NATIVE_SNAPSHOT_TRANSFER_ERROR,
} from "../../../services/nativeSnapshotTransfer";

const IMPORT_ERROR_CODES = new Set([
  "invalid_snapshot",
  "unsupported_snapshot_format",
  "unsupported_snapshot_version",
  "invalid_snapshot_id",
  "invalid_device_id",
  "invalid_device_label",
  "invalid_snapshot_date",
  "invalid_parent_snapshot_id",
  "invalid_bundle",
  "unsupported_format",
  "unsupported_version",
  "invalid_projects",
  "invalid_project_count",
  "invalid_project",
  "duplicate_project_id",
]);

export default function NativeSnapshotTransferPanel({
  projectCount,
  onShare,
  onDownload,
  onImport,
}) {
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const [support] = useState(() => inspectNativeSnapshotTransferSupport());
  const [pendingAction, setPendingAction] = useState("");
  const [feedback, setFeedback] = useState(null);

  async function runTransfer(action, callback) {
    setPendingAction(action);
    setFeedback(null);

    try {
      const result = await callback();
      setFeedback({
        kind: "success",
        message: t(`settings.backup.transfer.result.${action}`, result),
      });
    } catch (error) {
      const isCancelled = error?.code === NATIVE_SNAPSHOT_TRANSFER_ERROR.CANCELLED;
      const knownTransferCode = Object.values(NATIVE_SNAPSHOT_TRANSFER_ERROR)
        .includes(error?.code);
      const code = knownTransferCode ? error.code : "generic";
      setFeedback({
        kind: isCancelled ? "info" : "error",
        message: t(`settings.backup.transfer.errors.${code}`),
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingAction("import");
    setFeedback(null);

    try {
      await onImport(file);
      setFeedback({
        kind: "success",
        message: t("settings.backup.transfer.result.import", { filename: file.name }),
      });
    } catch (error) {
      const code = IMPORT_ERROR_CODES.has(error?.code) ? error.code : "generic_import";
      setFeedback({
        kind: "error",
        message: t(`settings.backup.transfer.errors.${code}`),
      });
    } finally {
      setPendingAction("");
      event.target.value = "";
    }
  }

  return (
    <section className="panel settings-native-transfer-panel">
      <div>
        <div className="eyebrow">{t("settings.backup.transfer.eyebrow")}</div>
        <h2>{t("settings.backup.transfer.title")}</h2>
        <p className="hero-text">{t("settings.backup.transfer.description")}</p>
      </div>

      <div className={`native-transfer-status native-transfer-status-${support.isSupported ? "available" : "fallback"}`}>
        <strong>
          {t(`settings.backup.transfer.status.${support.isSupported ? "available" : "fallback"}`)}
        </strong>
        <span>
          {t(`settings.backup.transfer.status.${support.isSupported ? "availableDescription" : "fallbackDescription"}`)}
        </span>
      </div>

      <div className="folder-actions">
        {support.isSupported && (
          <button
            className="btn btn-primary"
            type="button"
            disabled={Boolean(pendingAction) || projectCount === 0}
            onClick={() => runTransfer("share", onShare)}
          >
            {pendingAction === "share"
              ? t("settings.backup.transfer.actions.sharing")
              : t("settings.backup.transfer.actions.share")}
          </button>
        )}
        <button
          className="btn btn-secondary"
          type="button"
          disabled={Boolean(pendingAction) || projectCount === 0}
          onClick={() => runTransfer("download", onDownload)}
        >
          {t("settings.backup.transfer.actions.download")}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={Boolean(pendingAction)}
          onClick={() => fileInputRef.current?.click()}
        >
          {pendingAction === "import"
            ? t("settings.backup.transfer.actions.importing")
            : t("settings.backup.transfer.actions.import")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.snapshot.json,application/json"
          className="visually-hidden"
          aria-label={t("settings.backup.transfer.actions.import")}
          onChange={handleImport}
        />
      </div>

      <p className="folder-fallback-note">{t("settings.backup.transfer.manualNotice")}</p>

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
