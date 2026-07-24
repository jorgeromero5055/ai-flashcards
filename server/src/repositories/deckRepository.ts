import { db } from "../db/index";
import { decks } from "../db/schema";

type Deck = typeof decks.$inferSelect;

export interface DeckRepository {
  create(title: string): Deck;
  list(): Deck[];
}

export class SqliteDeckRepository implements DeckRepository {
  create(title: string): Deck {
    return db.insert(decks).values({ title }).returning().get();
  }

  list(): Deck[] {
    return db.select().from(decks).all();
  }
}
