import { db } from "../db/index.js";
import { decks } from "../db/schema.js";
import { cards } from "../db/schema.js";
import { Cards } from "../types.js";
import { eq } from "drizzle-orm";

type Deck = typeof decks.$inferSelect;

export interface DeckRepository {
  create(title: string): Deck;
  list(): Deck[];
  createWithCards(title: string, generatedCards: Cards): Deck;
  getById(id: number): Deck | undefined;
}

export class SqliteDeckRepository implements DeckRepository {
  create(title: string): Deck {
    return db.insert(decks).values({ title }).returning().get();
  }

  list(): Deck[] {
    return db.select().from(decks).all();
  }

  createWithCards(title: string, aiCards: Cards): Deck {
    const deck = db.transaction((tx) => {
      const deck = tx.insert(decks).values({ title }).returning().get();
      for (const c of aiCards) {
        tx.insert(cards)
          .values({ deckId: deck.id, front: c.front, back: c.back })
          .run();
      }
      return deck;
    });

    return deck;
  }

  getById(id: number): Deck | undefined {
    return db.select().from(decks).where(eq(decks.id, id)).get();
  }
}
