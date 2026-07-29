# Data Flow & Failure Modes

## v1 — manual deck/card creation

### Data flow (happy path)

Every request passes through four layers:

Browser (React) → HTTP (Express route) → Repository (seam) → Driver (better-sqlite3) → SQLite

Example — creating a deck:

1. React form POSTs `{ title }` to `/decks`.
2. Express route reads `req.body.title`.
3. Route calls `deckRepo.create(title)` (the interface/menu).
4. `SqliteDeckRepository` runs a Drizzle `INSERT` via better-sqlite3.
5. SQLite writes the row and returns it.
6. Route responds `201` + JSON; React reloads the list.

### Failure modes

#### UI — network drops

- Now: the request never reaches the server; `fetch` rejects; the error is thrown in the browser, unhandled.
- Should: `.catch()` the fetch and show a friendly message.

#### All APIs — server fails to process the request

- Now: Express throws (a 500); the UI doesn't handle it.
- Should: handle it gracefully with a clear UX message.

#### All POST APIs — body has missing/wrong fields

- Now: the DB rejects it (NOT NULL / type) and throws an unhandled error.
- Should: validate the fields at the route _before_ inserting; return `400` if invalid.

#### POST APIs using a deckId — deckId doesn't exist

- Now: the foreign-key constraint rejects the insert; unhandled error.
- Should: catch it and return a graceful error (`400`/`404`).

#### GET APIs using a deckId — deckId doesn't exist

- Now: the query returns an empty list; the UI shows an empty deck.
- Should: return `404` for a nonexistent deck and surface it in the UX.

### Status (honest)

Validation and error handling are largely **unhandled in v1** — documented here and deferred.
(Handling AI-generated junk input comes in v2.)

---
## v2 — AI-generated decks

### Data flow (happy path)

Browser (React) → Express route → ResponseGenerator (seam) → Gemini → repositories → SQLite

1. React form POSTs `{ topic }` to `/decks/generate`.
2. Route calls `cardGenerator.generate(topic)`.
3. `GeminiResponseGenerator` calls Gemini with a `responseSchema` constraining the reply to `{ front, back }[]`.
4. The reply is parsed, then **validated** into trusted card content.
5. Route creates the deck, then loops the cards into `cardRepo.add(...)`.
6. Route responds `201`; React reloads the list.

The deck is created **after** generation succeeds (step 5, not step 2) — creating
it first left an empty orphan deck behind whenever generation failed.

### Failure modes

Each entry records the state a failure leaves behind, then its disposition. The
state is what makes a deferral informed: a failure leaving nothing behind is cheap
to defer; one leaving visible garbage is not.

#### UI — topic is empty
- Now: empty string is sent; the model is asked to generate cards about nothing.
- State: junk cards, or a validation throw. **Deferred — should fix** (cheap; avoids a wasted call).

#### UI — request never reaches the server
- Now: `fetch` rejects, unhandled (same gap as v1).
- State: nothing written. **Deferred — must fix** (user gets no feedback).

#### UI — no loading state during generation
- Now: several seconds with no feedback; double-click fires two generations.
- State: two decks for one intent. **Deferred — nice to have.**

#### Route — `topic` missing or not a string
- Now: `req.body.topic` is `any`, unchecked, flows into the prompt.
- State: junk cards. **Deferred — must fix** (the untrusted boundary v2 left open).

#### AI — the call fails (network, auth, bad model id, quota)
- Now: the SDK throws; unhandled 500.
- State: nothing written (generation runs before deck creation). **Deferred — must fix**, but low-risk: no mess left.

#### AI — the reply is not valid JSON
- Now: `JSON.parse` throws, rethrown as `"model did not return valid JSON"`; unhandled 500.
- State: nothing written. **Partly handled** — detected and labelled; graceful response deferred.

#### AI — the reply parses but isn't usable cards
Empty array, non-objects, blank strings. The schema constrains **shape, not quality**.
- Now: `validateCards()` throws a specific error before anything is persisted.
- State: nothing written. **Handled** — v2's core deliverable; junk never reaches the DB.

#### AI — cards are well-formed but off-topic / low quality
- Now: undetected, saved as correct.
- State: a deck of valid-but-poor cards. **Deferred — nice to have** (no realistic automated check).

#### DB — deck creation fails
- Now: repository throws; unhandled 500.
- State: nothing written. **Deferred — must fix.**

#### DB — card inserts fail partway through the loop
The only partial state here, and the only entry with a real design choice.
- Now: the deck and first *n* cards are committed; the loop throws; no cleanup.
- State: an incomplete deck, indistinguishable from a complete one.
- Options: **(1) roll back** — delete the deck; `onDelete: cascade` removes the
  inserted cards in one operation. **(2) accept the partial state** and tell the user.
- Chosen: **roll back** — a half-generated deck is worthless and undoing is cheap.
  (Contrast checkout, where money has moved: rolling back means a refund, so
  accepting the partial state and notifying wins.)
- Better still: insert in **one transaction** (`addMany`) so the partial state never exists.
- **Deferred — must fix** (highest priority: the only failure leaving misleading data).

#### Response — the reply never reaches the client
- Now: data is committed but the client never learns it succeeded.
- State: deck and cards exist and are correct. **Deferred — nice to have** (a refresh reveals them).

### Status (honest)

**Handled in v2:** validation of model output at the generator boundary
(`unknown` → checks → trusted type), so malformed AI output can never be
persisted; and deck creation moved after generation so failures leave no orphan.

**Deferred:** graceful error handling (route + UI), request input validation, and
transactional card inserts — all carried over from v1. Highest priority is the
partial card insert, the only failure that leaves misleading data behind.
