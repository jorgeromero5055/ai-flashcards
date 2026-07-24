import type { Deck } from "../types";

export function DeckList({
  decks,
  onSelect,
}: {
  decks: Deck[];
  onSelect: (id: number) => void;
}) {
  return (
    <ul>
      {decks.map((d) => (
        <li key={d.id} onClick={() => onSelect(d.id)}>
          {d.title}
        </li>
      ))}
    </ul>
  );
}
