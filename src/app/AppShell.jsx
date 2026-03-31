export default function AppShell({ main, children, rightPanel = null }) {
  const mainContent = main ?? children;

  return (
    <div className="app-shell">
      <main className="app-shell-main">{mainContent}</main>
      <aside className="app-shell-right-panel" aria-hidden={rightPanel == null}>
        {rightPanel}
      </aside>
    </div>
  );
}
