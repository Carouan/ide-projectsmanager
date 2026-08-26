import { useI18n } from "../i18n/useI18n";

export default function AppShell({ main, children, rightPanel = null }) {
  const { t } = useI18n();
  const mainContent = main ?? children;
  const hasRightPanel = rightPanel != null;

  return (
    <div className={`app-shell${hasRightPanel ? "" : " app-shell-full-width"}`}>
      <a className="skip-link" href="#main-content">
        {t("accessibility.skipToContent")}
      </a>
      <main className="app-shell-main" id="main-content" tabIndex={-1}>
        {mainContent}
      </main>
      {hasRightPanel && (
        <aside className="app-shell-right-panel">{rightPanel}</aside>
      )}
    </div>
  );
}
