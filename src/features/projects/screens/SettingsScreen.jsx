export default function SettingsScreen({ settings, onBack, onUpdateSettings }) {
  const safeSettings = settings || {};

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="topbar">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Retour
          </button>
        </div>

        <section className="hero hero-project">
          <div>
            <div className="eyebrow">Paramètres</div>
            <h1>Réglages de l'application</h1>
            <p className="hero-text">
              Modifie la langue, le thème et l'activation de l'aperçu markdown.
            </p>
          </div>
        </section>

        <section className="panel">
          <h2>Préférences</h2>
          <div className="form-grid">
            <label className="field">
              <span>Langue</span>
              <select
                value={safeSettings.language || "fr"}
                onChange={(e) => onUpdateSettings({ language: e.target.value })}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>

            <label className="field">
              <span>Thème</span>
              <select
                value={safeSettings.theme || "dark"}
                onChange={(e) => onUpdateSettings({ theme: e.target.value })}
              >
                <option value="dark">Sombre</option>
                <option value="light">Clair</option>
              </select>
            </label>

            <label className="field field-full field-toggle">
              <span>Aperçu markdown</span>
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
      </div>
    </div>
  );
}
