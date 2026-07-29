import "dotenv/config";
import express from "express";

import {
  SqliteDeckRepository,
  DeckRepository,
} from "./repositories/deckRepository.js";

import {
  SqliteCardRepository,
  CardRepository,
} from "./repositories/cardRepository.js";

import {
  ResponseGenerator,
  GeminiResponseGenerator,
} from "./repositories/ResponseGenerator.js";

const app = express();
app.use(express.json());

const deckRepo: DeckRepository = new SqliteDeckRepository();
const cardRepo: CardRepository = new SqliteCardRepository();
const cardGenerator: ResponseGenerator = new GeminiResponseGenerator();

app.post("/decks", (req, res) => {
  const deck = deckRepo.create(req.body.title);
  res.status(201).json(deck);
});

app.get("/decks", (req, res) => {
  res.json(deckRepo.list());
});

app.post("/decks/:id/cards", (req, res) => {
  const deckId = Number(req.params.id);
  const card = cardRepo.add(deckId, req.body.front, req.body.back);
  res.status(201).json(card);
});

app.get("/decks/:id/cards", (req, res) => {
  const deckId = Number(req.params.id);
  res.json(cardRepo.listByDeck(deckId));
});

app.post("/decks/generate", async (req, res) => {
  const topic = req.body.topic;
  const cards = await cardGenerator.generate(topic);
  const deck = deckRepo.create(topic);
  cards.forEach((card) => {
    cardRepo.add(deck.id, card.front, card.back);
  });
  res.status(201).json(cards);
});

app.listen(3000, () => console.log("http://localhost:3000"));
