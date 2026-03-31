import { useRegisterSW } from "virtual:pwa-register/react";
import { useI18n } from "../i18n/useI18n";

export default function PwaPrompt({ language }) {
  const { t } = useI18n(language);
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
              <strong>{t("pwa.offlineReadyTitle")}</strong>
              <p>{t("pwa.offlineReadyBody")}</p>
            </>
          )}

          {needRefresh && (
            <>
              <strong>{t("pwa.newVersionTitle")}</strong>
              <p>{t("pwa.newVersionBody")}</p>
            </>
          )}
        </div>

        <div className="pwa-toast-actions">
          {needRefresh && (
            <button
              className="btn btn-primary"
              onClick={() => updateServiceWorker(true)}
            >
              {t("buttons.update")}
            </button>
          )}

          <button className="btn btn-secondary" onClick={closePrompt}>
            {t("buttons.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
