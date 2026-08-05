import { DeckList } from "./components/DeckList";
import { DeckForm } from "./components/DeckForm";
import { useEffect, useState } from "react";
import { DeckItem } from "./components/DeckItem";
import type { Deck } from "./types";
import { API_URL } from "../api";
function App() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDeck = () => {
    setError(null);
    fetch(`${API_URL}/decks`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? "Something went wrong");
        }
        return body;
      })
      .then((data) => setDecks(data))
      .catch((err) => {
        setError(err.message);
      });
  };

  useEffect(() => {
    loadDeck();
  }, []);

  return (
    <>
      {!selectedDeck ? (
        <div>
          <h1>Decks</h1>
          <DeckForm onCreated={loadDeck} />
          <DeckList decks={decks} onSelect={setSelectedDeck} />
        </div>
      ) : (
        <DeckItem deckId={selectedDeck} />
      )}
      {error && <p role="alert">{error}</p>}
    </>
  );
}

export default App;
