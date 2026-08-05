import { db } from "../db/index.js";
import { decks } from "../db/schema.js";
import { cards } from "../db/schema.js";
import { Cards } from "../types.js";
import { eq } from "drizzle-orm";

type Deck = typeof decks.$inferSelect;

export interface DeckRepository {
  create(title: string): Promise<Deck>;
  list(): Promise<Deck[]>;
  createWithCards(title: string, generatedCards: Cards): Promise<Deck>;
  getById(id: number): Promise<Deck | undefined>;
}

export class PostgresDeckRepository implements DeckRepository {
  async create(title: string): Promise<Deck> {
    const [deck] = await db.insert(decks).values({ title }).returning();
    return deck;
  }

  async list(): Promise<Deck[]> {
    return await db.select().from(decks);
  }

  async createWithCards(title: string, aiCards: Cards): Promise<Deck> {
    return await db.transaction(async (tx) => {
      const [deck] = await tx.insert(decks).values({ title }).returning();
      for (const c of aiCards) {
        await tx
          .insert(cards)
          .values({ deckId: deck.id, front: c.front, back: c.back });
      }
      return deck;
    });
  }

  async getById(id: number): Promise<Deck | undefined> {
    const [deck] = await db.select().from(decks).where(eq(decks.id, id));
    return deck;
  }
}
