# Data Flow & Failure Modes

How a request travels through this system, and everything known to go wrong along
the way. Each failure records the **state it leaves behind**, because that is what
makes a decision to defer it informed rather than a guess: a failure that leaves
nothing behind is cheap to live with, one that leaves misleading data is not.

Dispositions are **handled**, **accepted** (a real limitation, deliberately not
fixed), or **open**.

---

## Data flow

### Creating and reading decks

```
Browser (React) → Express route → Repository (interface) → Drizzle → Postgres
```

1. React posts `{ title }` to `/decks`.
2. The route validates the body, then calls `deckRepo.create(title)` — the
   interface, never Drizzle directly.
3. `PostgresDeckRepository` runs the insert and returns the row.
4. The route responds `201`; React reloads the list.

### Generating a deck with AI

```
Browser → Express route → ResponseGenerator (interface) → Gemini
        → back through the route → Repository → Postgres
```

1. React posts `{ topic }` to `/decks/generate`.
2. The route validates `topic`, then calls `cardGenerator.generate(topic)`.
3. `GeminiResponseGenerator` calls Gemini with a `responseSchema` constraining the
   reply to `{ front, back }[]`.
4. The reply is parsed and passed through `validateCards`, which converts
   `unknown` into a trusted type or throws.
5. `deckRepo.createWithCards(topic, cards)` inserts the deck and every card **in
   one transaction**.
6. The route responds `201`; React reloads the list.

Ordering matters here: generation runs before the deck is created, so a generation
failure leaves nothing behind. The transaction covers the rest.

### Studying a deck

No network involved. The cards were already fetched; the session lives entirely in
memory.

```
{ status: "not-started" }
  → STUDY_PRESSED   { status: "started", index 0, front, score 0 }
  → CARD_FLIPPED    side becomes "back"
  → GRADE_PRESSED   score updated, index advances, side resets
  → …repeats…
  → GRADE_PRESSED   on the last card → { status: "complete", score, total }
  → SESSION_ENDED   → { status: "not-started" }
```

Every step is `reduce(state, event)` returning a new state. See
[ADR-0003](adr/0003-study-session-state-model.md).

---

## Failure modes

### The browser can't reach the server

- `fetch` rejects — connection refused, DNS failure, server asleep.
- **Handled.** Every request ends in a `.catch()` that stores the message in
  component state and renders it. Typed input is preserved, because the clearing
  step only runs on the success path.

### The server responds with an error status

- `fetch` does **not** reject on a `4xx` or `5xx` — a bad status is a successful
  round trip as far as it's concerned.
- **Handled.** Each handler checks `res.ok` and throws, so a bad status lands in
  the same `.catch()` as a dropped connection — one error path instead of two.
- The server always answers in JSON: an Express error handler catches anything
  thrown in a route and returns `{ error }` rather than Express's default HTML
  page. It also logs the original error, since a handler that only produces a
  friendly message leaves production undebuggable.
- The client still parses defensively (`.json().catch(() => ({}))`) and falls back
  to a generic message, because a proxy or platform layer can return HTML that the
  application never sees.

### A request body is missing or malformed

- `req.body` is `any` and callers are not obliged to send anything sensible.
- **Handled.** Each route checks `typeof x !== "string" || x.trim() === ""` and
  returns `400`. The type check is load-bearing: a missing field is `undefined`,
  and calling `.trim()` on it would throw the very `500` the guard exists to
  prevent.

### A request names a deck that doesn't exist

- **Handled.** `deckRepo.getById(id)` is checked first; a missing deck returns
  `404` rather than an empty list or a foreign-key error. The lookup lives behind
  the repository, so routes never query the database themselves.
- A non-numeric id (`/decks/abc/cards`) becomes `NaN`, matches no deck, and falls
  into the same `404`.

### The AI call fails — network, auth, quota

- The SDK throws; Express 5 forwards the rejection.
- **Handled.** The client sees a non-`ok` status and renders a message. Nothing was
  written: generation runs before the deck is created.

### The AI returns something that isn't usable cards

Empty array, non-objects, blank strings. A schema constrains **shape**, not
**quality**, so this remains possible even with structured output.

- **Handled.** `validateCards` throws a specific error before anything is
  persisted. This is the core of [ADR-0002](adr/0002-ai-generation-approach.md) —
  model output is untrusted input.

### The AI returns well-formed but off-topic or low-quality cards

- Nothing detects this; the cards are saved as if correct.
- **Accepted.** No realistic automated check exists for "is this a good flashcard"
  — only a person can judge it. The user can delete the deck.

### Card inserts fail partway through

The one failure with a genuinely partial state, and historically the highest-risk
one: a deck holding an incomplete set of cards is indistinguishable from a
complete one.

- **Handled.** `deckRepo.createWithCards` wraps the deck insert and every card
  insert in a single transaction, so the partial state never exists rather than
  being cleaned up afterwards.
- The transaction spans two tables, so it lives on the parent's repository — the
  route still never touches the database directly.
- The rollback depends on the error escaping the transaction, so any `try`/`catch`
  must wrap the transaction rather than sit inside it.

### The response never reaches the client after a successful write

- The data is committed but the client never learns it succeeded.
- **Accepted.** Self-correcting — a refresh reveals the deck. Guaranteeing delivery
  of a response is not worth building here.

### The page is reloaded mid-study-session

- All progress is lost and the user returns to the deck screen.
- **Accepted.** This is the stated cost of keeping session state in memory
  ([ADR-0003](adr/0003-study-session-state-model.md)), not an oversight.

### A study event arrives in a state where it doesn't apply

- **Handled by construction.** `reduce` matches on the pair of current state *and*
  event, so anything unmatched falls through to `return state`. A stray or
  out-of-order event is ignored rather than producing a half-valid session.

### A study session is started on an empty deck

- **Handled.** The start button isn't rendered when a deck has no cards. Without
  it, the session would begin at index 0 of an empty array and throw on read.

---

## Still open

Deliberate, and listed so they aren't mistaken for oversights.

**No shared request/response contract.** `client/src/types.ts` and
`server/src/types.ts` are two hand-maintained descriptions that happen to agree.
Nothing verifies the client and server expect the same shapes. Closing this means
a shared package or a schema tool (zod, tRPC, OpenAPI).

**No authentication.** One shared workspace; every visitor sees the same decks.
Deliberately out of scope — multi-user is the next project's subject rather than a
bolt-on here.

**Study mode has no failure modes beyond the two above,** because nothing in it
crosses the network. The cards are fetched before the session starts and no
session data is written anywhere, so the request/response/persistence categories
have no equivalent there. That absence is a consequence of the in-memory decision,
not a gap in the analysis.
