import { useEffect, useState } from "react";
import type { Card } from "../types";
import { StudyMode } from "./StudyMode";
import { useReducer } from "react";
import { reduce } from "../studySession";
import { API_URL } from "../../api";

export function DeckItem({
  deckId,
  onBack,
}: {
  deckId: number;
  onBack: () => void;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [front, setFront] = useState<string>("");
  const [back, setBack] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [session, dispatch] = useReducer(reduce, { status: "not-started" });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    fetch(`${API_URL}/decks/${deckId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId, front, back }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? "Something went wrong");
        }
      })
      .then(() => {
        setFront("");
        setBack("");
        loadCards();
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  const loadCards = () => {
    setError(null);
    fetch(`${API_URL}/decks/${deckId}/cards`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? "Something went wrong");
        }
        return body;
      })
      .then(setCards)
      .catch((err) => {
        setError(err.message);
      });
  };

  useEffect(() => {
    loadCards();
  }, [deckId]);

  if (session.status !== "not-started") {
    return <StudyMode session={session} dispatch={dispatch} />;
  }

  return (
    <div>
      <button className="back" onClick={onBack}>
        ← Back to decks
      </button>
      <form onSubmit={submit}>
        <label className="field">
          Front of card
          <input value={front} onChange={(e) => setFront(e.target.value)} />
        </label>

        <label className="field">
          Back of card
          <input value={back} onChange={(e) => setBack(e.target.value)} />
        </label>
        <button type="submit">Add</button>
      </form>

      <ul>
        {cards.map((c) => (
          <li
            key={c.id}
            className="row"
            onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
          >
            <p className="row-front">{c.front}</p>
            {expandedId === c.id && <p className="row-back">{c.back}</p>}
          </li>
        ))}
      </ul>
      {cards.length > 0 && (
        <button
          className="start-btn"
          onClick={() => {
            dispatch({ type: "STUDY_PRESSED", cards });
          }}
        >
          Start session
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
