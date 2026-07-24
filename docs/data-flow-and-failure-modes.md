# Data Flow & Failure Modes (v1)

## Data flow (happy path)

Every request passes through four layers:

Browser (React) → HTTP (Express route) → Repository (seam) → Driver (better-sqlite3) → SQLite

Example — creating a deck:

1. React form POSTs `{ title }` to `/decks`.
2. Express route reads `req.body.title`.
3. Route calls `deckRepo.create(title)` (the interface/menu).
4. `SqliteDeckRepository` runs a Drizzle `INSERT` via better-sqlite3.
5. SQLite writes the row and returns it.
6. Route responds `201` + JSON; React reloads the list.

## Failure modes

### UI — network drops

- Now: the request never reaches the server; `fetch` rejects; the error is thrown in the browser, unhandled.
- Should: `.catch()` the fetch and show a friendly message.

### All APIs — server fails to process the request

- Now: Express throws (a 500); the UI doesn't handle it.
- Should: handle it gracefully with a clear UX message.

### All POST APIs — body has missing/wrong fields

- Now: the DB rejects it (NOT NULL / type) and throws an unhandled error.
- Should: validate the fields at the route _before_ inserting; return `400` if invalid.

### POST APIs using a deckId — deckId doesn't exist

- Now: the foreign-key constraint rejects the insert; unhandled error.
- Should: catch it and return a graceful error (`400`/`404`).

### GET APIs using a deckId — deckId doesn't exist

- Now: the query returns an empty list; the UI shows an empty deck.
- Should: return `404` for a nonexistent deck and surface it in the UX.

## Status (honest)

Validation and error handling are largely **unhandled in v1** — documented here and deferred.
(Handling AI-generated junk input comes in v2.)
