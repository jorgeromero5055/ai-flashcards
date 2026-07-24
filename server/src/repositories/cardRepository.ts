import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { cards } from "../db/schema";

type Card = typeof cards.$inferSelect;

export interface CardRepository {
  // 🔵 menu
  add(deckId: number, front: string, back: string): Card;
  listByDeck(deckId: number): Card[];
}

export class SqliteCardRepository implements CardRepository {
  // 🔵 kitchen
  add(deckId: number, front: string, back: string): Card {
    return db.insert(cards).values({ deckId, front, back }).returning().get(); // ⚪ insert spelling
  }

  listByDeck(deckId: number): Card[] {
    // 🔵 the FK filter: only comments whose postId matches
    return db.select().from(cards).where(eq(cards.deckId, deckId)).all();
  }
}
