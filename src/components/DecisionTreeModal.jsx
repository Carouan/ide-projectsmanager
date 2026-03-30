import { useMemo, useState } from "react";

const TREE = {
  id: "q1",
  question: "Est-ce que cette idée change ce que le projet doit faire ?",
  clarification:
    "Elle modifie les objectifs, le périmètre ou le besoin de départ, pas juste la façon de l'implémenter.",
  yes: {
    id: "q2",
    question:
      "Si tu ignores cette idée, la v.1.0 prévue résout-elle quand même le problème de départ ?",
    clarification:
      "Ce n'est pas : “serait-ce moins bien ?” mais bien : “est-ce que le projet reste utile et fonctionnel ?”",
    yes: "backlog",
    no: {
      id: "q3",
      question:
        "Cette idée reste-t-elle dans le même domaine ou problème que ta v.0.0 ?",
      clarification:
        "Même utilisateur, même contexte d'usage, même problématique centrale.",
      yes: "reframe",
      no: "newproject",
    },
  },
  no: {
    id: "q4",
    question:
      "Est-ce que cette idée remet en question des choix technologiques ou d'architecture ?",
    clarification:
      "Bibliothèque, protocole, structure de données, service tiers, architecture générale, etc.",
    yes: {
      id: "q5",
      question: "Es-tu encore avant la phase d'assemblage (avant v.0.4) ?",
      clarification:
        "Les composants principaux ne sont pas encore intégrés entre eux.",
      yes: "archi",
      no: "technote",
    },
    no: "backlog",
  },
};

const DESTINATIONS = {
  backlog: {
    label: "Backlog v.1.x",
    headline: "C'est une fonctionnalité additionnelle.",
    description:
      "Cette idée enrichit le projet mais n'est pas nécessaire pour que la v.1.0 réponde au besoin initial.",
    actionLabel: "Ajouter au backlog",
  },
  archi: {
    label: "Évaluation architecturale",
    headline: "C'est un pivot potentiel à évaluer consciemment.",
    description:
      "Tu es encore assez tôt pour remettre en question les fondations. Il faut en garder une trace explicite.",
    actionLabel: "Créer une entrée journal",
  },
  technote: {
    label: "Note technique post-v1.0",
    headline: "L'idée est valide, mais trop tardive pour changer les fondations maintenant.",
    description:
      "Note-la comme amélioration technique future et continue vers la v.1.0.",
    actionLabel: "Ajouter au backlog technique",
  },
  reframe: {
    label: "Retour en v.0.0",
    headline: "Le besoin initial doit être recadré.",
    description:
      "Cette idée montre que le projet ne répond plus correctement au vrai problème. Il faut revenir à la base.",
    actionLabel: "Créer la trace et revenir à v0.0",
  },
  newproject: {
    label: "Nouveau projet",
    headline: "Cette idée appartient à un autre projet.",
    description:
      "Elle est intéressante, mais elle ne doit pas contaminer le projet courant.",
    actionLabel: "Créer un nouveau projet",
  },
};

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
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaContent, setIdeaContent] = useState("");
  const [history, setHistory] = useState([]);
  const [currentNode, setCurrentNode] = useState(TREE);
  const [destinationKey, setDestinationKey] = useState(null);

  const destination = useMemo(() => {
    if (!destinationKey) return null;
    return DESTINATIONS[destinationKey] ?? null;
  }, [destinationKey]);

  function resetState() {
    setIdeaTitle("");
    setIdeaContent("");
    setHistory([]);
    setCurrentNode(TREE);
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

    let node = TREE;
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
      alert("Merci de donner au moins un titre à l'idée.");
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
            <div className="eyebrow">Capture guidée</div>
            <h2>Nouvelle idée</h2>
          </div>
          <button className="btn btn-secondary" onClick={handleClose}>
            Fermer
          </button>
        </div>

        <div className="form-grid">
          <label className="field field-full">
            <span>Titre de l'idée</span>
            <input
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              placeholder="Ex. intégrer un système de modèles de projet"
            />
          </label>

          <label className="field field-full">
            <span>Description / contexte</span>
            <textarea
              rows={5}
              value={ideaContent}
              onChange={(e) => setIdeaContent(e.target.value)}
              placeholder="Décris l'idée, le contexte, ce qui l'a déclenchée, ce que tu imagines..."
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
                    {item.nodeId} → {item.answer === "yes" ? "oui" : "non"}
                  </span>
                ))}
              </div>
            )}

            <div className="decision-actions">
              <button className="btn btn-primary" onClick={() => handleAnswer("yes")}>
                Oui
              </button>
              <button className="btn btn-secondary" onClick={() => handleAnswer("no")}>
                Non
              </button>
              {history.length > 0 && (
                <button className="btn btn-secondary" onClick={handleBack}>
                  Retour
                </button>
              )}
            </div>
          </section>
        )}

        {destination && (
          <section className="panel panel-compact">
            <div className="eyebrow">Destination</div>
            <h3>{destination.label}</h3>
            <p><strong>{destination.headline}</strong></p>
            <p className="muted">{destination.description}</p>

            <div className="decision-actions">
              <button className="btn btn-primary" onClick={handleConfirm}>
                {destination.actionLabel}
              </button>
              <button className="btn btn-secondary" onClick={handleBack}>
                Revenir au questionnaire
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}