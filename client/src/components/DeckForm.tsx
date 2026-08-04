import { useState } from "react";

export function DeckForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const submitCreation = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    fetch("/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? "Something went wrong");
        }
      })
      .then(() => {
        setTitle("");
        onCreated();
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  const submitGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);
    fetch("/decks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? "Something went wrong");
        }
        return body;
      })
      .then(() => {
        setTopic("");
        onCreated();
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsGenerating(false);
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
        <button disabled={isGenerating} type="submit">
          {isGenerating ? "Generating" : "Generate"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
