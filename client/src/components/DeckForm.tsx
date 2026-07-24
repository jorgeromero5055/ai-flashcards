import { useState } from "react";

export function DeckForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");

  const submit = (e: React.FormEvent) => {
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

  return (
    <form onSubmit={submit}>
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
        }}
      />
      <button type="submit">Add</button>
    </form>
  );
}
