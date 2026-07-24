import { DeckList } from "./components/DeckList";
import { DeckForm } from "./components/DeckForm";
import { useEffect, useState } from "react";
import { DeckItem } from "./components/DeckItem";
import type { Deck } from "./types";

function App() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null);

  const loadDeck = () => {
    fetch("/decks")
      .then((res) => res.json())
      .then((data) => setDecks(data));
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
    </>
  );
}

export default App;
