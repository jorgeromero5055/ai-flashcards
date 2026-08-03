# ADR-0003: Model the study session as an in-memory state machine

## Status

Accepted

## Context

v3's capability is: a user studies a saved deck — flip a card, mark it got-it or
missed-it, see a score. Unlike v1 and v2, which were data-in/data-out, this is the
first feature whose state **changes over time on the client** in response to user
interaction.

Two questions had to be answered:

- **Where does the session state live** — in memory, or persisted?
- **What shape does it take** — how is "where the user is in the session"
  represented?

Constraints shaping the choice:

- **The done-line is a score at the end**, not a study history. Nothing requires a
  session to survive a reload or move between devices.
- **The UI should hold no rules.** Components should render the current state and
  report what the user did, nothing more.

## Decision

Keep the session **in memory only** (React state, discarded on reload), and model
it as a **hand-written state machine** in `client/src/studySession.ts`:

- `StudySession` — a discriminated union tagged by `status`
  (`not-started` / `started` / `complete`). Each variant carries only the fields
  that state actually has.
- `StudyEvent` — a flat list of the things a user can do
  (`STUDY_PRESSED` / `CARD_FLIPPED` / `GRADE_PRESSED` / `SESSION_ENDED`), carrying
  only data the state could not already know.
- `reduce(state, event)` — a pure function holding every rule for which state
  follows which. It never mutates the state it is given.

`useReducer` in `DeckItem` binds this to React; `status` decides which whole
screen renders.

## Alternatives considered

- **Persist sessions to the database** — a `study_sessions` table, a migration,
  and endpoints. Rejected: that is v1-shaped work already proven by this project,
  so it adds no new pattern, and nothing on the done-line requires resuming a
  session or reviewing past scores.
- **An assortment of booleans** (`isStudying`, `showingBack`, `isDone`) held in
  separate `useState` calls. Rejected: N booleans permit 2^N combinations, and
  most are nonsense (`isStudying && isDone`). Every consumer would then have to
  defend against states that cannot really happen.
- **A state-machine library (xstate)** — the same model, with the plumbing and a
  visualiser provided. Rejected as overkill: this machine is three states, four
  events, and about thirty lines.

## Consequences

- (+) Every rule of the feature is readable in one pure function that imports no
  React, and can be reasoned about — or tested — without rendering anything.
- (+) The components decide nothing. The UI could be rebuilt entirely without
  touching the machine, the same way ADR-0001's repository seam lets the database
  change without touching the routes.
- (+) Illegal states are unrepresentable: `currentIndex` only exists while
  studying, so there is no "which card am I on" to answer once the session is over.
- (+) **Cheap to reverse.** If score history is wanted later, a table is added and
  the result written when the session reaches `complete` — the state machine
  itself does not change.
- (−) The state type is more involved than a few booleans, and every transition
  must be written out explicitly rather than being implied by a setter.
- (−) **Progress is lost on reload.** A half-finished session cannot be resumed,
  and no score is kept after the user exits. Accepted deliberately — see above.
