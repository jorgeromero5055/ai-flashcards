# AI Flashcards

Type a topic, an AI generates a flashcard deck, it's saved to a real database,
and you study it — flip each card, mark yourself, get a score.

**Live:** https://ai-flashcards-1-3ygc.onrender.com
*(the API runs on a free instance, so the first request after a quiet period takes
about a minute to wake up)*

React + TypeScript (Vite) · Node + Express · Postgres + Drizzle · Gemini

---

## What it does

- Create a deck by hand, or give the AI a topic and let it write the cards
- Browse a deck — questions listed, tap one to reveal its answer
- Study a deck — flip a card, mark *Got it* or *Missed it*, see a score at the end

## Running it locally

Requires the Node version in `.nvmrc` and a local Postgres.

```bash
createdb ai_flashcards
```

```bash
cd server && npm install && npm run db:migrate && npm run dev
```

```bash
cd client && npm install && npm run dev
```

`server/.env` needs `DATABASE_URL` and `GEMINI_API_KEY`.

## Tests

```bash
cd client && npm test
```

```bash
cd server && npm test
```

Coverage is deliberately narrow — the study-session reducer and the AI output
validator. Both are pure functions where the logic actually branches.

Components, routes, and repositories are untested: they're thin wiring, and
testing them would mostly test the framework. There is no coverage target, since
a number would push toward testing exactly the wiring that was left out on
purpose.

---

## How it's built

**Two seams.** All database access sits behind repository interfaces, and the AI
call sits behind a `ResponseGenerator` interface. Both are wired in a composition
root, so consumers depend on the interface rather than on Drizzle or Gemini. The
database seam got tested for real in v6 — see below.

**Untrusted input is validated at its boundary.** A language model's output is
untrusted no matter how it's requested, so `validateCards` converts `unknown` to a
typed value or throws. Nothing unvalidated reaches the database.

**Study state is a client-side state machine.** A tagged union of the three
states a session can be in, plus a pure reducer holding every transition. The
components render the current state and report events; they contain no logic.

**Writes that belong together are atomic.** Generating a deck inserts the deck and
all its cards in one transaction, so a failure partway through can't leave a deck
that looks complete but isn't.

## Design decisions

Each records what was chosen, what was rejected, and what it cost.

- [ADR-0001 — Database and access layer](docs/adr/0001-database-and-access-layer.md)
  *(includes what the Postgres swap later proved and disproved about the seam)*
- [ADR-0002 — AI generation approach](docs/adr/0002-ai-generation-approach.md)
- [ADR-0003 — Study-session state model](docs/adr/0003-study-session-state-model.md)

[**Data flow and failure modes**](docs/data-flow-and-failure-modes.md) traces each
request end to end and records every known failure — what's handled, what's
accepted, and what's still open.

## Known limitations

Deliberate, not overlooked:

- **No authentication — one shared workspace.** Everyone who opens the URL sees the
  same decks. Auth is the focus of the next project rather than a bolt-on here.
- **No shared request/response contract.** Client and server types are maintained
  separately; nothing verifies they agree. Closing this means a shared package or
  a schema tool.

## Built in tagged milestones

| | |
|---|---|
| `v1` | Schema, repository seam, HTTP CRUD, React UI |
| `v2` | AI generation behind a swappable seam, with output validation |
| `v3` | Study mode as a client-side state machine |
| `v4` | Hardening — transactions, input validation, error paths |
| `v5` | Tests for the reducer and the validator |
| `v6` | SQLite → Postgres, deployed |
| `v7` | Design tokens, styling, navigation |
