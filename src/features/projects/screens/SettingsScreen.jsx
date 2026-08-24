import { useI18n } from "../../../i18n/useI18n";
import ProjectBundleRestorePanel from "../components/ProjectBundleRestorePanel";
import SelectedBackupFolderPanel from "../components/SelectedBackupFolderPanel";

export default function SettingsScreen({
  settings,
  projectCount = 0,
  onBack,
  onUpdateSettings,
  onExportAllProjects,
  onInspectProjectBundle,
  onRestoreProjectBundle,
  backupFolderStatus,
  onConnectBackupFolder,
  onReauthorizeBackupFolder,
  onDisconnectBackupFolder,
  onExportAllProjectsToBackupFolder,
}) {
  const safeSettings = settings || {};
  const { t } = useI18n();

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="topbar">
          <button className="btn btn-secondary" onClick={onBack}>
            {t("settings.back")}
          </button>
        </div>

        <section className="hero hero-project">
          <div>
            <div className="eyebrow">{t("settings.eyebrow")}</div>
            <h1>{t("settings.title")}</h1>
            <p className="hero-text">
              {t("settings.description")}
            </p>
          </div>
        </section>

        <section className="panel">
          <h2>{t("settings.preferences")}</h2>
          <div className="form-grid">
            <label className="field">
              <span>{t("settings.language")}</span>
              <select
                value={safeSettings.language || "fr"}
                onChange={(e) => onUpdateSettings({ language: e.target.value })}
              >
                <option value="fr">{t("settings.language.fr")}</option>
                <option value="en">{t("settings.language.en")}</option>
              </select>
            </label>

            <label className="field">
              <span>{t("settings.theme")}</span>
              <select
                value={safeSettings.theme || "dark"}
                onChange={(e) => onUpdateSettings({ theme: e.target.value })}
              >
                <option value="dark">{t("settings.theme.dark")}</option>
                <option value="light">{t("settings.theme.light")}</option>
              </select>
            </label>

            <label className="field field-full field-toggle">
              <span>{t("settings.markdownPreview")}</span>
              <input
                type="checkbox"
                checked={Boolean(safeSettings.markdownPreviewEnabled)}
                onChange={(e) =>
                  onUpdateSettings({ markdownPreviewEnabled: e.target.checked })
                }
              />
            </label>
          </div>
        </section>

        <section className="panel settings-backup-panel">
          <div>
            <div className="eyebrow">{t("settings.backup.eyebrow")}</div>
            <h2>{t("settings.backup.title")}</h2>
            <p className="hero-text">
              {t("settings.backup.description", { count: projectCount })}
            </p>
          </div>
          <button
            className="btn btn-primary"
            type="button"
            disabled={projectCount === 0}
            onClick={onExportAllProjects}
          >
            {t("settings.backup.exportAll")}
          </button>
        </section>

        <SelectedBackupFolderPanel
          projectCount={projectCount}
          status={backupFolderStatus}
          onConnect={onConnectBackupFolder}
          onReauthorize={onReauthorizeBackupFolder}
          onDisconnect={onDisconnectBackupFolder}
          onWrite={onExportAllProjectsToBackupFolder}
        />

        <ProjectBundleRestorePanel
          onInspectProjectBundle={onInspectProjectBundle}
          onRestoreProjectBundle={onRestoreProjectBundle}
        />
      </div>
    </div>
  );
}
