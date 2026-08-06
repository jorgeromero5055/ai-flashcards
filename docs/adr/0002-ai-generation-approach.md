# ADR-0002: Use Gemini structured output to generate cards

## Status

Accepted

## Context

v2's capability is: a user types a **topic** and the AI fills the deck. That
means an external model has to hand back data our code can store as cards.

The problem this decision solves: **a language model returns free-form text by
default.** Our card repository needs a specific structure — a list of
`{ front, back }` pairs. Something has to guarantee the model's output matches
the struct we expect.

Constraints shaping the choice:

- **Reuse over reinvention** — v2 should lean on patterns already built
  (Project 1's Gemini integration, v1's repository seam).
- **The provider must stay swappable** — we don't want to marry the app to Gemini.
- **The model is non-deterministic** — whatever we choose, its output is
  untrusted input.

## Decision

Generate cards with **Gemini using structured output** — the request carries a
`responseSchema` describing an array of `{ front, back }` objects (with a
per-field `description`), and the API constrains the model's response to match it.

The call sits behind a **`ResponseGenerator` seam** — an interface plus a
`GeminiResponseGenerator` implementation, wired in the composition root. This is
the same seam pattern as ADR-0001's repositories, applied to the AI boundary
rather than the database.

## Alternatives considered

- **Prompt-and-parse** — ask for JSON in the prompt text and `JSON.parse` the
  reply. Simplest to write, but the model can disobey the instruction: prose
  around the JSON, markdown code fences, or malformed output. That pushes the
  burden onto parsing and validation for no benefit. Rejected as unreliable.
- **Tool / function calling** — define a function whose parameters are the card
  schema and read the cards off the call arguments. This works, and it was
  historically *the* way to force structure out of models with no native
  structured-output mode. But it is agentic machinery — built for letting a model
  invoke behavior — and we only ever want data back. Since the model we use
  supports structured output natively, tool calling is the heavier, less direct
  path for the same result. Rejected as a workaround we no longer need.

## Consequences

- (+) The response arrives already shaped as `{ front, back }[]`, so the
  generator returns clean card content and no caller has to parse model text.
- (+) Callers depend only on `generate(topic) → { front, back }[]`. Swapping
  Gemini for another provider is a change inside the implementation; routes, the
  repositories, and the UI are untouched.
- (+) Field `description`s live in the schema rather than the prompt, so the
  field semantics sit next to the fields and there is one place to keep in sync.
- (−) **A schema constrains shape, not quality.** The model can still return an
  empty array, blank strings, or off-topic cards. The output remains untrusted
  input, so the generator validates it at the boundary before returning
  (`unknown` → checks → trusted type). See `data-flow-and-failure-modes.md`.
- (−) Structured output is a provider capability, so a future provider without it
  would force the implementation back to prompt-and-parse. The seam contains that
  risk to one file.
