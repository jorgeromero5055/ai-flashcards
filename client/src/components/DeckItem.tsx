import { useEffect, useState } from "react";
import type { Card } from "../types";
import { StudyMode } from "./StudyMode";
import { useReducer } from "react";
import { reduce } from "../studySession";

export function DeckItem({ deckId }: { deckId: number }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [front, setFront] = useState<string>("");
  const [back, setBack] = useState<string>("");
  const [session, dispatch] = useReducer(reduce, { status: "not-started" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(`/decks/${deckId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId, front, back }),
    }).then(() => {
      setFront("");
      setBack("");
      loadCards();
    });
  };

  const loadCards = () =>
    fetch(`/decks/${deckId}/cards`)
      .then((c) => c.json())
      .then(setCards);

  useEffect(() => {
    loadCards();
  }, [deckId]);

  if (session.status !== "not-started") {
    return <StudyMode session={session} dispatch={dispatch} />;
  }

  return (
    <div>
      <form onSubmit={submit}>
        <input
          value={front}
          onChange={(e) => {
            setFront(e.target.value);
          }}
        />
        <input
          value={back}
          onChange={(e) => {
            setBack(e.target.value);
          }}
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {cards.map((c) => (
          <li key={c.id}>
            <p>{c.front}</p>
            <p>{c.back}</p>
          </li>
        ))}
      </ul>
      {cards.length > 0 && (
        <button
          onClick={() => {
            dispatch({ type: "STUDY_PRESSED", cards });
          }}
        >
          start session
        </button>
      )}
    </div>
  );
}
