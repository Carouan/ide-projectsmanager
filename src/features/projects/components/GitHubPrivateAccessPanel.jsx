import { useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "../../../i18n/useI18n";
import {
  GITHUB_AUTHORIZATION_STATUS,
  githubAuthorizationSession,
} from "../../../services/githubAuthorizationSession";

export default function GitHubPrivateAccessPanel() {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [errorCode, setErrorCode] = useState(null);
  const authorization = useSyncExternalStore(
    githubAuthorizationSession.subscribe,
    githubAuthorizationSession.getSnapshot,
    githubAuthorizationSession.getSnapshot
  );
  const isAuthorized = authorization.status === GITHUB_AUTHORIZATION_STATUS.AUTHORIZED;

  function authorize(event) {
    event.preventDefault();
    setErrorCode(null);

    try {
      githubAuthorizationSession.connect(inputRef.current?.value || "");
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      setErrorCode(error?.code || "generic");
    }
  }

  function disconnect() {
    githubAuthorizationSession.disconnect();
    if (inputRef.current) inputRef.current.value = "";
    setErrorCode(null);
  }

  return (
    <section className="panel settings-github-access-panel">
      <div>
        <div className="eyebrow">{t("settings.github.eyebrow")}</div>
        <h2>{t("settings.github.title")}</h2>
        <p className="hero-text">{t("settings.github.description")}</p>
      </div>

      <div className={"github-access-status github-access-status-" + authorization.status}>
        <strong>{t("settings.github.status." + authorization.status)}</strong>
        <span>{t("settings.github.explanation." + authorization.status)}</span>
      </div>

      <div className="github-access-permissions">
        <strong>{t("settings.github.permissions.title")}</strong>
        <ul>
          <li>{t("settings.github.permissions.repositories")}</li>
          <li>{t("settings.github.permissions.metadata")}</li>
          <li>{t("settings.github.permissions.contents")}</li>
          <li>{t("settings.github.permissions.pullRequests")}</li>
          <li>{t("settings.github.permissions.statuses")}</li>
        </ul>
        <a
          className="github-access-token-link"
          href="https://github.com/settings/personal-access-tokens/new"
          rel="noreferrer"
          target="_blank"
        >
          {t("settings.github.actions.openGitHub")}
        </a>
      </div>

      <form className="github-access-form" onSubmit={authorize}>
        <label className="field">
          <span>{t("settings.github.fields.token")}</span>
          <input
            autoComplete="off"
            name="github-fine-grained-session-token"
            placeholder="github_pat_…"
            ref={inputRef}
            spellCheck={false}
            type="password"
          />
        </label>

        <div className="project-actions">
          <button className="btn btn-primary" type="submit">
            {t(
              isAuthorized
                ? "settings.github.actions.replace"
                : "settings.github.actions.authorize"
            )}
          </button>
          {isAuthorized && (
            <button className="btn btn-secondary" onClick={disconnect} type="button">
              {t("settings.github.actions.disconnect")}
            </button>
          )}
        </div>
      </form>

      <p className="github-access-limits">{t("settings.github.sessionOnly")}</p>
      <p className="github-access-limits">{t("settings.github.revokeOnGitHub")}</p>

      {errorCode && (
        <div className="bundle-restore-message bundle-restore-error" role="alert">
          {t("settings.github.errors." + errorCode)}
        </div>
      )}
    </section>
  );
}
