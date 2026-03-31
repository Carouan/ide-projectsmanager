import { useMemo, useState } from "react";
import { useI18n } from "../i18n/useI18n";

function buildTree(t) {
  return {
    id: "q1",
    question: t("decisionTree.questions.q1.question"),
    clarification: t("decisionTree.questions.q1.clarification"),
    yes: {
      id: "q2",
      question: t("decisionTree.questions.q2.question"),
      clarification: t("decisionTree.questions.q2.clarification"),
      yes: "backlog",
      no: {
        id: "q3",
        question: t("decisionTree.questions.q3.question"),
        clarification: t("decisionTree.questions.q3.clarification"),
        yes: "reframe",
        no: "newproject",
      },
    },
    no: {
      id: "q4",
      question: t("decisionTree.questions.q4.question"),
      clarification: t("decisionTree.questions.q4.clarification"),
      yes: {
        id: "q5",
        question: t("decisionTree.questions.q5.question"),
        clarification: t("decisionTree.questions.q5.clarification"),
        yes: "archi",
        no: "technote",
      },
      no: "backlog",
    },
  };
}

function buildDestinations(t) {
  return {
    backlog: {
      label: t("decisionTree.destinations.backlog.label"),
      headline: t("decisionTree.destinations.backlog.headline"),
      description: t("decisionTree.destinations.backlog.description"),
      actionLabel: t("decisionTree.destinations.backlog.action"),
    },
    archi: {
      label: t("decisionTree.destinations.archi.label"),
      headline: t("decisionTree.destinations.archi.headline"),
      description: t("decisionTree.destinations.archi.description"),
      actionLabel: t("decisionTree.destinations.archi.action"),
    },
    technote: {
      label: t("decisionTree.destinations.technote.label"),
      headline: t("decisionTree.destinations.technote.headline"),
      description: t("decisionTree.destinations.technote.description"),
      actionLabel: t("decisionTree.destinations.technote.action"),
    },
    reframe: {
      label: t("decisionTree.destinations.reframe.label"),
      headline: t("decisionTree.destinations.reframe.headline"),
      description: t("decisionTree.destinations.reframe.description"),
      actionLabel: t("decisionTree.destinations.reframe.action"),
    },
    newproject: {
      label: t("decisionTree.destinations.newproject.label"),
      headline: t("decisionTree.destinations.newproject.headline"),
      description: t("decisionTree.destinations.newproject.description"),
      actionLabel: t("decisionTree.destinations.newproject.action"),
    },
  };
}

function getNextNode(node, answer) {
  return answer === "yes" ? node.yes : node.no;
}

function isDestination(value) {
  return typeof value === "string";
}

export default function DecisionTreeModal({
  isOpen,
  onClose,
  onSubmitDestination,
}) {
  const { t } = useI18n();
  const tree = useMemo(() => buildTree(t), [t]);
  const destinations = useMemo(() => buildDestinations(t), [t]);

  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaContent, setIdeaContent] = useState("");
  const [history, setHistory] = useState([]);
  const [currentNode, setCurrentNode] = useState(tree);
  const [destinationKey, setDestinationKey] = useState(null);

  const destination = useMemo(() => {
    if (!destinationKey) return null;
    return destinations[destinationKey] ?? null;
  }, [destinationKey, destinations]);

  function resetState() {
    setIdeaTitle("");
    setIdeaContent("");
    setHistory([]);
    setCurrentNode(tree);
    setDestinationKey(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleAnswer(answer) {
    const next = getNextNode(currentNode, answer);

    setHistory((prev) => [...prev, { nodeId: currentNode.id, answer }]);

    if (isDestination(next)) {
      setDestinationKey(next);
      return;
    }

    setCurrentNode(next);
  }

  function handleBack() {
    if (history.length === 0) return;

    const newHistory = history.slice(0, -1);

    let node = tree;
    for (const step of newHistory) {
      const next = getNextNode(node, step.answer);
      if (isDestination(next)) break;
      node = next;
    }

    setHistory(newHistory);
    setDestinationKey(null);
    setCurrentNode(node);
  }

  function handleConfirm() {
    if (!ideaTitle.trim()) {
      alert(t("decisionTree.alert.titleRequired"));
      return;
    }

    if (!destinationKey) return;

    onSubmitDestination({
      destinationKey,
      ideaTitle: ideaTitle.trim(),
      ideaContent: ideaContent.trim(),
      history,
    });

    resetState();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="eyebrow">{t("decisionTree.eyebrow")}</div>
            <h2>{t("decisionTree.title")}</h2>
          </div>
          <button className="btn btn-secondary" onClick={handleClose}>
            {t("decisionTree.actions.close")}
          </button>
        </div>

        <div className="form-grid">
          <label className="field field-full">
            <span>{t("decisionTree.form.ideaTitle")}</span>
            <input
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              placeholder={t("decisionTree.form.ideaTitlePlaceholder")}
            />
          </label>

          <label className="field field-full">
            <span>{t("decisionTree.form.ideaDescription")}</span>
            <textarea
              rows={5}
              value={ideaContent}
              onChange={(e) => setIdeaContent(e.target.value)}
              placeholder={t("decisionTree.form.ideaDescriptionPlaceholder")}
            />
          </label>
        </div>

        {!destination && (
          <section className="panel panel-compact">
            <div className="panel-header">
              <div>
                <h3>{currentNode.question}</h3>
                <p className="muted">{currentNode.clarification}</p>
              </div>
            </div>

            {history.length > 0 && (
              <div className="decision-breadcrumbs">
                {history.map((item, index) => (
                  <span key={`${item.nodeId}-${index}`} className="decision-badge">
                    {item.nodeId} → {item.answer === "yes" ? t("decisionTree.answers.yes") : t("decisionTree.answers.no")}
                  </span>
                ))}
              </div>
            )}

            <div className="decision-actions">
              <button className="btn btn-primary" onClick={() => handleAnswer("yes")}>
                {t("decisionTree.answers.yes")}
              </button>
              <button className="btn btn-secondary" onClick={() => handleAnswer("no")}>
                {t("decisionTree.answers.no")}
              </button>
              {history.length > 0 && (
                <button className="btn btn-secondary" onClick={handleBack}>
                  {t("decisionTree.actions.back")}
                </button>
              )}
            </div>
          </section>
        )}

        {destination && (
          <section className="panel panel-compact">
            <div className="eyebrow">{t("decisionTree.destination")}</div>
            <h3>{destination.label}</h3>
            <p><strong>{destination.headline}</strong></p>
            <p className="muted">{destination.description}</p>

            <div className="decision-actions">
              <button className="btn btn-primary" onClick={handleConfirm}>
                {destination.actionLabel}
              </button>
              <button className="btn btn-secondary" onClick={handleBack}>
                {t("decisionTree.actions.backToQuestions")}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
