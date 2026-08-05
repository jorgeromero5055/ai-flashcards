import "dotenv/config";
import express from "express";

import {
  PostgresDeckRepository,
  DeckRepository,
} from "./repositories/deckRepository.js";

import {
  PostgresCardRepository,
  CardRepository,
} from "./repositories/cardRepository.js";

import {
  ResponseGenerator,
  GeminiResponseGenerator,
} from "./repositories/ResponseGenerator.js";

import type { ErrorRequestHandler } from "express";

const app = express();
app.use(express.json());

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(500).json({ error: "something went wrong" });
};
const deckRepo: DeckRepository = new PostgresDeckRepository();
const cardRepo: CardRepository = new PostgresCardRepository();
const cardGenerator: ResponseGenerator = new GeminiResponseGenerator();

app.post("/decks", async (req, res) => {
  if (typeof req.body.title !== "string" || req.body.title.trim() === "")
    return res.status(400).json({ error: "title is required" });

  const deck = await deckRepo.create(req.body.title);
  res.status(201).json(deck);
});

app.get("/decks", async (req, res) => {
  res.json(await deckRepo.list());
});

app.post("/decks/:id/cards", async (req, res) => {
  if (typeof req.body.front !== "string" || req.body.front.trim() === "")
    return res.status(400).json({ error: "front is required" });
  if (typeof req.body.back !== "string" || req.body.back.trim() === "")
    return res.status(400).json({ error: "back is required" });
  const deckId = Number(req.params.id);
  const deckExist = await deckRepo.getById(deckId);
  if (!deckExist) {
    return res.status(404).json({ error: "deck doesn't exist" });
  }

  const card = await cardRepo.add(deckId, req.body.front, req.body.back);
  res.status(201).json(card);
});

app.get("/decks/:id/cards", async (req, res) => {
  const deckId = Number(req.params.id);
  const deckExist = await deckRepo.getById(deckId);
  if (!deckExist) {
    return res.status(404).json({ error: "deck doesn't exist" });
  }
  res.json(await cardRepo.listByDeck(deckId));
});

app.post("/decks/generate", async (req, res) => {
  if (typeof req.body.topic !== "string" || req.body.topic.trim() === "")
    return res.status(400).json({ error: "topic is required" });
  const topic = req.body.topic;
  const cards = await cardGenerator.generate(topic);
  await deckRepo.createWithCards(topic, cards);
  res.status(201).json(cards);
});

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`http://localhost:${port}`));
