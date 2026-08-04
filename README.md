# AI Flashcards

Paste a topic, an AI generates a flashcard deck, it's saved to a real database,
and you study it interactively.

React + TypeScript (Vite) · Node + Express · SQLite + Drizzle · Gemini

## Running it

```bash
cd server && npm i && npm run dev
```

```bash
cd client && npm i && npm run dev
```

Requires the Node version in `.nvmrc` and a `GEMINI_API_KEY` in `server/.env`.

## Tests

```bash
cd client && npm test
```

```bash
cd server && npm test
```

Coverage is deliberately narrow: the study-session reducer and the AI output
validator. Both are pure functions where the logic actually branches.

Components, routes, and repositories are untested — they're thin wiring, and
testing them would mostly test the framework. There is no coverage target; a
number would push toward testing the wiring that was deliberately left out.

## Design decisions

- [ADR-0001](docs/adr/0001-database-and-access-layer.md) — database and access layer
- [ADR-0002](docs/adr/0002-ai-generation-approach.md) — AI generation approach
- [ADR-0003](docs/adr/0003-study-session-state-model.md) — study-session state model

[Data flow and failure modes](docs/data-flow-and-failure-modes.md) traces each
request end to end and records what is handled, what is accepted, and what is
still open.
