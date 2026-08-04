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

app.use((err, req, res, next) => {
  res.status(500).json({ error: "something went wrong" });
});

app.post("/decks", (req, res) => {
  if (typeof req.body.title !== "string" || req.body.title.trim() === "")
    return res.status(400).json({ error: "title is required" });

  const deck = deckRepo.create(req.body.title);
  res.status(201).json(deck);
});

app.get("/decks", (req, res) => {
  res.json(deckRepo.list());
});

app.post("/decks/:id/cards", (req, res) => {
  if (typeof req.body.front !== "string" || req.body.front.trim() === "")
    return res.status(400).json({ error: "front is required" });
  if (typeof req.body.back !== "string" || req.body.back.trim() === "")
    return res.status(400).json({ error: "back is required" });
  const deckId = Number(req.params.id);
  const deckExist = deckRepo.getById(deckId);
  if (!deckExist) {
    return res.status(404).json({ error: "deck doesn't exist" });
  }

  const card = cardRepo.add(deckId, req.body.front, req.body.back);
  res.status(201).json(card);
});

app.get("/decks/:id/cards", (req, res) => {
  const deckId = Number(req.params.id);
  const deckExist = deckRepo.getById(deckId);
  if (!deckExist) {
    return res.status(404).json({ error: "deck doesn't exist" });
  }
  res.json(cardRepo.listByDeck(deckId));
});

app.post("/decks/generate", async (req, res) => {
  if (typeof req.body.topic !== "string" || req.body.topic.trim() === "")
    return res.status(400).json({ error: "topic is required" });
  const topic = req.body.topic;
  const cards = await cardGenerator.generate(topic);
  deckRepo.createWithCards(topic, cards);
  res.status(201).json(cards);
});

app.listen(3000, () => console.log("http://localhost:3000"));
