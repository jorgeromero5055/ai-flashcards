# ADR-0001: Use SQLite + Drizzle for persistence

## Status

Accepted

## Context

This app's core value is saved flashcard decks that persist — a user creates a
deck and its cards, and they must still be there after a refresh or a server
restart. That rules out in-memory storage and forces a real database.

Constraints shaping the choice:

- **Learning project** whose target skill is _data modeling_ — the DB choice
  should maximize learning of schemas and relations, not infrastructure.
- **Right-sized scope, solo developer** — minimal setup and operational burden.
- **May move to production later**, so the choice shouldn't lock us in.

## Decision

Use **SQLite** as the database engine and **Drizzle** as the access layer
(with drizzle-kit for migrations), all behind a repository seam.

## Alternatives considered

- **Postgres** — production-grade, but needs a running server (Docker or a
  hosted instance). That operational overhead teaches devops, not the data
  modeling this project is about. Rejected for now; the seam lets us adopt it
  later if scale demands.
- **Raw SQL (better-sqlite3 only)** — maximum SQL learning, but maximum
  boilerplate: no type safety and hand-written migrations. Too much plumbing
  for the payoff at this stage.
- **Prisma** — excellent DX, but its own schema DSL abstracts the SQL away.
  We'd learn "Prisma," not the underlying relational modeling that is the whole
  point of the project.

## Consequences

- (+) Zero-setup: the database is a single local file, on a real relational engine.
- (+) Type-safe queries and schema-inferred types via Drizzle.
- (+) Migrations are versioned and replayable (drizzle-kit).
- (+) All DB access sits behind a repository seam, so swapping SQLite for
  Postgres later is a one-file change with no impact on routes or UI.
- (−) SQLite isn't built for high write-concurrency or large-scale production
  traffic, so a real production deployment will likely require the Postgres
  swap. We accept simplicity and learning speed now in exchange for deferring
  production-scale concerns.
