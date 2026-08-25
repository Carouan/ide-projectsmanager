export default function AppShell({ main, children, rightPanel = null }) {
  const mainContent = main ?? children;
  const hasRightPanel = rightPanel != null;

  return (
    <div className={`app-shell${hasRightPanel ? "" : " app-shell-full-width"}`}>
      <main className="app-shell-main">{mainContent}</main>
      {hasRightPanel && (
        <aside className="app-shell-right-panel">{rightPanel}</aside>
      )}
    </div>
  );
}
