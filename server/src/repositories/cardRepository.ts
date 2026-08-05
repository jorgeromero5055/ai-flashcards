import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { cards } from "../db/schema.js";

type Card = typeof cards.$inferSelect;

export interface CardRepository {
  add(deckId: number, front: string, back: string): Promise<Card>;
  listByDeck(deckId: number): Promise<Card[]>;
}

export class PostgresCardRepository implements CardRepository {
  async add(deckId: number, front: string, back: string): Promise<Card> {
    const [card] = await db
      .insert(cards)
      .values({ deckId, front, back })
      .returning();
    return card;
  }

  async listByDeck(deckId: number): Promise<Card[]> {
    return await db.select().from(cards).where(eq(cards.deckId, deckId));
  }
}
