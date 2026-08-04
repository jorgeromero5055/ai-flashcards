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

- Was: the request never reaches the server; `fetch` rejects; the error is thrown in the browser, unhandled.
- **Handled in v4:** every fetch ends in `.catch()`, which stores the message in component
  state and renders it. The user's typed input is preserved, because the clearing
  step only runs on the success path.

#### All APIs — server fails to process the request

- Was: Express throws (a 500); the UI doesn't handle it.
- **Handled in v4:** `fetch` does not reject on a bad status, so each handler checks
  `res.ok` and throws — routing both failure kinds into one `.catch()`. Express's
  default 500 sends HTML, so the body is parsed with a fallback
  (`.json().catch(() => ({}))`) and a generic message is used when the server sent
  no `error` field.

#### All POST APIs — body has missing/wrong fields

- Was: the DB rejects it (NOT NULL / type) and throws an unhandled error.
- **Handled in v4:** each route type-checks before use
  (`typeof x !== "string" || x.trim() === ""`) and returns `400`. The type check is
  load-bearing — a missing field is `undefined`, and calling `.trim()` on it would
  throw the very 500 this is meant to prevent.

#### POST APIs using a deckId — deckId doesn't exist

- Was: the foreign-key constraint rejects the insert; unhandled error.
- **Handled in v4:** `deckRepo.getById(id)` is checked first; a missing deck returns
  `404`. The existence check sits behind the repository, so the route never queries
  the database itself (ADR-0001).

#### GET APIs using a deckId — deckId doesn't exist

- Was: the query returns an empty list; the UI shows an empty deck.
- **Handled in v4:** same `getById` check, returning `404` instead of an empty list.
  A non-numeric id (`/decks/abc/cards`) becomes `NaN`, matches no deck, and falls
  into the same `404` — no separate guard needed.

### Status (honest)

Validation and error handling were **unhandled in v1** — documented here and deferred.
All five entries above were closed in v4.

---

## v2 — AI-generated decks

### Data flow (happy path)

Browser (React) → HTTP (Express route) → ResponseGenerator (seam) → Gemini API
→ back through the route → Card/Deck repositories → SQLite

Generating a deck from a topic:

1. React form POSTs `{ topic }` to `/decks/generate`.
2. Express route reads `req.body.topic`.
3. Route calls `cardGenerator.generate(topic)` (the interface).
4. `GeminiResponseGenerator` calls Gemini with a `responseSchema` constraining
   the reply to `{ front, back }[]`.
5. The reply is parsed, then **validated** into trusted card content.
6. Route creates the deck (`deckRepo.create(topic)`).
7. Route loops the cards into `cardRepo.add(deck.id, front, back)`.
8. Route responds `201` + JSON; React reloads the list.

Note on ordering: the deck is created **after** generation succeeds (step 6, not
step 3). Creating it first meant a generation failure left an empty orphan deck
behind — see below.

### Failure modes

Each entry records what happens now, what state a failure leaves behind, and
whether it is handled or deferred. The state is what makes a deferral an
informed decision rather than a guess: a failure that leaves nothing behind is
cheap to defer, one that leaves visible garbage is not.

#### UI — topic is empty

- Now: an empty string is POSTed; the model is asked to generate cards about nothing.
- State: whatever the model returns — likely junk cards, or a validation throw.
- Should: reject empty input in the form before sending.
- **Disposition: handled in v4** — the route rejects a blank topic with `400` before
  the model is ever called.

#### UI — request never reaches the server

- Now: `fetch` rejects; the error is unhandled in the browser (same gap as v1).
- State: nothing written; the DB is untouched.
- Should: `.catch()` the fetch and show a friendly message.
- **Disposition: handled in v4** — every fetch ends in `.catch()`, and the message is
  stored in component state and rendered.

#### UI — no loading state during generation

- Now: generation takes several seconds with no feedback; the button stays live,
  so a double-click fires two generations.
- State: two decks created for one intent.
- Should: disable the button and show progress while the request is in flight.
- **Disposition: handled in v4** — an `isGenerating` flag disables the button and
  swaps its label while the request is in flight, reset in `.finally()` so a failure
  does not leave it stuck.

#### Route — body has a missing or non-string `topic`

- Now: `req.body.topic` is `any` and unchecked; it flows straight into the prompt.
- State: depends on what the model does with it — likely junk cards.
- Should: validate at the route and return `400` before calling the model.
- **Disposition: handled in v4** — `typeof topic !== "string" || topic.trim() === ""`
  returns `400`. The type check is load-bearing: a missing field is `undefined`, and
  calling `.trim()` on it would throw the very 500 the guard exists to prevent.

#### AI boundary — the call itself fails (network, auth, bad model id, quota)

- Now: the Gemini SDK throws; the route has no handler, so Express returns a 500.
- State: nothing written. Generation runs before the deck is created, so no
  orphan deck and no partial data.
- Should: catch it and return a graceful error.
- **Disposition: handled in v4** — Express 5 forwards the rejection, so the client
  receives a non-`ok` status and renders a message instead of failing silently.

#### AI boundary — the reply is not valid JSON

- Now: `JSON.parse` throws; caught and rethrown as `"model did not return valid JSON"`.
  Unhandled at the route, so a 500 reaches the client.
- State: nothing written.
- Should: surface it as a graceful error to the user.
- **Disposition: handled in v4** — detection was already there; v4 added the graceful
  response, so the labelled error now reaches the user instead of a bare 500.

#### AI boundary — the reply parses but is not usable cards

Empty array, items that are not objects, or blank `front`/`back` strings. The
schema constrains **shape**, not **quality**, so this is still possible.

- Now: `validateCards()` throws a specific error (`"no cards returned"`,
  `"front missing a value"`, …) before anything is persisted.
- State: nothing written — the throw happens before deck creation.
- Should: keep the validation; add a graceful response.
- **Disposition: handled** (this is v2's core deliverable — junk never reaches the DB).

#### AI boundary — cards are well-formed but off-topic or low quality

- Now: nothing detects this; the cards are saved as if correct.
- State: a deck of valid-but-poor cards.
- Should: this is a prompt/quality concern, not a correctness one.
- **Disposition: accepted — will not fix.** No automated check for "is this a good
  flashcard" is realistic; only a human can judge it. Retired from the deferred list
  in v4 rather than left implying someone will get to it.

#### DB — deck creation fails

- Now: the repository throws; unhandled 500.
- State: nothing written; the cards exist only in memory and are discarded.
- Should: catch and return a graceful error.
- **Disposition: handled in v4** — the failure surfaces to the client as a message.
  It also became impossible to leave anything behind: deck creation now runs inside
  the same transaction as the card inserts.

#### DB — card inserts fail partway through the loop

The one failure with a genuinely partial state, and the only entry here with a
real design choice.

- Now: the deck and the first _n_ cards are already committed; the loop throws
  mid-way. Nothing cleans up.
- State: a deck holding an incomplete set of cards, visible to the user and
  indistinguishable from a complete one.
- Two options:
  1. **Roll back (compensating action)** — delete the deck. The schema's
     `onDelete: cascade` removes the already-inserted cards with it, so one
     delete cleans up everything.
  2. **Accept the partial state** — keep the deck and tell the user it is incomplete.
- Chosen: **roll back.** A half-generated deck is worthless to the user and there
  is nothing expensive to undo — deleting is cheap and cascade makes it a single
  operation. (Contrast a checkout flow, where money has already moved and
  rolling back means a refund; there, accepting the partial state and notifying
  the user is the better option.)
- Better still: insert all cards in **one transaction** (`addMany`), so the
  partial state never exists rather than being cleaned up after the fact.
- **Disposition: handled in v4** — `deckRepo.createWithCards(title, cards)` wraps the
  deck insert and every card insert in one `db.transaction`. The partial state no
  longer exists rather than being cleaned up after the fact, so option 1 above was
  never needed. Note the transaction spans two tables, so it lives on the parent's
  repository — the route still never touches `db` (ADR-0001).
  Also: the rollback depends on the error escaping the transaction, so any
  `try/catch` must wrap the transaction, never sit inside it.

#### Response — the reply never reaches the client

- Now: the data is committed but the client never learns it succeeded.
- State: the deck and cards exist and are correct; the UI just doesn't show them.
- Should: the client catches the error; a refresh reveals the deck, since the
  write already succeeded.
- **Disposition: accepted — will not fix.** Self-correcting: the write succeeded and a
  refresh reveals it. Guaranteeing delivery of a response is not worth building here.
  Retired from the deferred list in v4.

### Status (honest)

**Handled in v2:** validation of the model's output at the generator boundary —
untrusted data is checked before it is trusted (`unknown` → checks → typed), so
malformed AI output can never be persisted. Deck creation was also moved after
generation so a failure leaves no orphan deck.

**Deferred at the time of writing:** graceful error handling end to end (route and
UI), request input validation, and transactional card inserts. These were deferred
in v1 as well; v2 documents them with their failure states so the next milestone
could prioritise by blast radius rather than by guesswork. Highest priority was the
partial card insert — the only failure that leaves misleading data in the database.
**All of these were closed in v4**, in that order.
---

## v3 — study mode

### Data flow (happy path)

1. The deck screen has already loaded its cards (v1 flow). The user presses
   **start session** → `STUDY_PRESSED` carries those cards in → the session
   becomes `started` at index 0, front side, score 0.
2. The user taps the card → `CARD_FLIPPED` → side becomes `back`, and the
   grading buttons appear.
3. The user grades it → `GRADE_PRESSED { correct }` → the score is incremented if
   correct, the index advances, and the side resets to `front`.
4. Steps 2–3 repeat for each card.
5. Grading the **last** card → `GRADE_PRESSED` → the session becomes `complete`,
   carrying the final score and the number of cards studied.
6. The user presses **exit** → `SESSION_ENDED` → the session returns to
   `not-started` and the deck screen renders again.

Every step is `reduce(state, event)` returning a new state. No step touches the
network.

### Failure modes

This list is short, and that is the finding: **nothing in study mode crosses the
network.** The cards were fetched before the session began, and no session data
is written anywhere. So the v1/v2 categories — request fails, DB write fails,
response never arrives, model returns junk — have no equivalent here. What
remains are input and lifecycle cases.

#### The deck has no cards

- The start button is not rendered when `cards.length === 0`, so a session over an
  empty deck cannot be entered. **Handled.**
- Without this, `started` would begin at index 0 of an empty array and reading the
  current card would throw.

#### The page is reloaded mid-session

- All progress is lost and the user lands back on the deck screen.
- **Accepted, not deferred** — this is the stated cost of the in-memory decision
  (ADR-0003), not an oversight.

#### An event arrives that does not fit the current state

- `reduce` matches on the pair (current state + event), so an event that fits no
  pair falls through to `return state` and nothing changes.
- **Handled by design.** A stray or out-of-order event is ignored rather than
  producing a half-valid state.

### Status (honest)

**Handled in v3:** the empty-deck case, and out-of-order events by construction.
Illegal session states are unrepresentable rather than defended against.

**Accepted (not a defect):** sessions do not survive a reload, and scores are not
kept after exit. Both follow from ADR-0003.

**Not v3's to fix:** card text is only `notNull`, so an empty-string front or back
can still be created and would render as a blank card. That is a card-creation
concern from v1 and belongs to the deferred input-validation work.

---

## v4 — hardening

No new capability and no new data flow. v4 pays down the debts recorded above, in
blast-radius order: the failure that leaves misleading data first, the invisible
ones last. Each entry in the v1 and v2 sections carries its own disposition; this
section records only what is left.

### What changed, in one line each

1. **Atomicity** — `deckRepo.createWithCards` wraps the deck insert and all card
   inserts in one transaction, so a partial deck cannot exist.
2. **Input validation** — every route type-checks its body and returns `400`;
   a missing or non-existent `deckId` returns `404` via `deckRepo.getById`.
3. **Error paths in the UI** — all five fetches check `res.ok`, throw, and land in a
   single `.catch()` that renders the message. Input is only cleared on success.
4. **In-flight state** — generation disables its button and swaps its label, so the
   multi-second wait can no longer produce two decks from one intent.

### Status (honest)

**Closed in v4:** every "must fix" and "should fix" carried from v1 and v2.

**Retired as accepted — will not fix:** off-topic-but-well-formed AI cards (no
realistic automated check), and a response lost after a successful write
(self-correcting on refresh). Both were previously listed as deferred, which
implied someone would get to them.

**Still open, deliberately:**

- **No shared request/response contract.** `client/src/types.ts` and
  `server/src/types.ts` are two hand-maintained guesses that happen to agree.
  Nothing verifies the client and server describe the same shapes. Closing this
  means a shared package or a schema tool (zod, tRPC, OpenAPI) — real work, and
  not what v4 was for.
- **Empty strings are rejected at the route, not in the schema.** Columns are only
  `notNull`, so a direct database write or a future code path could still store
  `""`. The rule is *validate at the boundary, constrain at the store* — v4 did the
  first half. The second needs a `CHECK` constraint and a migration.
- **No tests.** The project has none. `reduce` and `validateCards` are both pure
  functions and are the obvious first targets. This is a practice gap rather than
  a deferred feature, and it is scheduled as its own milestone rather than
  documented and left.
