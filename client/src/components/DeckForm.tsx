import { useState } from "react";

export function DeckForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  const submitCreation = (e: React.FormEvent) => {
    e.preventDefault();
    fetch("/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then(() => {
      setTitle("");
      onCreated();
    });
  };

  const submitGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    fetch("/decks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    }).then(() => {
      setTopic("");
      onCreated();
    });
  };

  return (
    <>
      <form onSubmit={submitCreation}>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
        />
        <button type="submit">Add</button>
      </form>

      <form onSubmit={submitGenerate}>
        <input
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
          }}
        />
        <button type="submit">Generate</button>
      </form>
    </>
  );
}
