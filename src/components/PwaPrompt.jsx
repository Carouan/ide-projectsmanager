import { useRegisterSW } from "virtual:pwa-register/react";
import { useI18n } from "../i18n/useI18n";

export default function PwaPrompt() {
  const { t } = useI18n();
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
              <strong>{t("pwa.offlineReady.title")}</strong>
              <p>{t("pwa.offlineReady.description")}</p>
            </>
          )}

          {needRefresh && (
            <>
              <strong>{t("pwa.needRefresh.title")}</strong>
              <p>{t("pwa.needRefresh.description")}</p>
            </>
          )}
        </div>

        <div className="pwa-toast-actions">
          {needRefresh && (
            <button
              className="btn btn-primary"
              onClick={() => updateServiceWorker(true)}
            >
              {t("pwa.actions.update")}
            </button>
          )}

          <button className="btn btn-secondary" onClick={closePrompt}>
            {t("pwa.actions.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
