export type Deck = { id: number; title: string };
export type Card = { deckId: number; id: number; front: string; back: string };
export type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };
