import { expect, test } from "vitest";
import { reduce } from "./studySession";
import type { StudySession } from "../src/studySession";

const state: StudySession = {
  status: "started",
  cards: [{ id: 1, deckId: 1, front: "a", back: "1" }],
  currentIndex: 0,
  side: "front",
  correctCount: 0,
};

const state2: StudySession = {
  status: "started",
  cards: [
    { id: 1, deckId: 1, front: "a", back: "1" },
    { id: 2, deckId: 1, front: "b", back: "2" },
  ],
  currentIndex: 0,
  side: "front",
  correctCount: 0,
};

const complete: StudySession = {
  status: "complete",
  correctCount: 1,
  totalCount: 1,
};

test("starting a session shows the first card, front side, score zero", () => {
  const next = reduce(
    { status: "not-started" },
    {
      type: "STUDY_PRESSED",
      cards: [{ id: 1, deckId: 1, front: "a", back: "1" }],
    }
  );

  expect(next).toEqual(state);
});

test("flipping a card from the front will change the side of the card to the back", () => {
  const flipped = reduce(state, {
    type: "CARD_FLIPPED",
  });

  expect(flipped).toEqual({
    ...state,
    side: "back",
  });
});

test("flipping a card from the back will not change the state at all", () => {
  const flipped = reduce(
    { ...state, side: "back" },
    {
      type: "CARD_FLIPPED",
    }
  );

  expect(flipped).toEqual({ ...state, side: "back" });
});

test("grading a card as correct will update the corrrect count and update the current index of the card to the next one with the side set to front", () => {
  const graded = reduce(state2, {
    type: "GRADE_PRESSED",
    correct: true,
  });

  expect(graded).toEqual({
    ...state2,
    currentIndex: 1,
    side: "front",
    correctCount: 1,
  });
});

test("grading a card as incorrect will not update the corrrect count and update the current index of the card to the next one with the side set to front", () => {
  const graded = reduce(state2, {
    type: "GRADE_PRESSED",
    correct: false,
  });

  expect(graded).toEqual({
    ...state2,
    currentIndex: 1,
    side: "front",
  });
});

test("grading the last card will set the session as complete with the correct / total count", () => {
  const last = reduce(state, {
    type: "GRADE_PRESSED",
    correct: true,
  });

  expect(last).toEqual(complete);
});

test("ending the session will rever it to the intitial state", () => {
  const ended = reduce(complete, {
    type: "SESSION_ENDED",
  });

  expect(ended).toEqual({ status: "not-started" });
});

test("triggering a unknown scenairio returns the same state", () => {
  const ended = reduce(complete, { type: "GRADE_PRESSED", correct: true });

  expect(ended).toEqual(complete);
});
