import { useRegisterSW } from "virtual:pwa-register/react";

export default function PwaPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  function closePrompt() {
    setOfflineReady(false);
    setNeedRefresh(false);
  }

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div className="pwa-toast-container">
      <div className="pwa-toast">
        <div className="pwa-toast-message">
          {offlineReady && (
            <>
              <strong>Application prête hors ligne.</strong>
              <p>Le cache PWA est maintenant actif sur cet appareil.</p>
            </>
          )}

          {needRefresh && (
            <>
              <strong>Nouvelle version disponible.</strong>
              <p>Recharge l’application pour utiliser la dernière version.</p>
            </>
          )}
        </div>

        <div className="pwa-toast-actions">
          {needRefresh && (
            <button
              className="btn btn-primary"
              onClick={() => updateServiceWorker(true)}
            >
              Mettre à jour
            </button>
          )}

          <button className="btn btn-secondary" onClick={closePrompt}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}