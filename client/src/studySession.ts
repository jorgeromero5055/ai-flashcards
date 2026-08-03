import type { Card } from "./types";

export type StudySession =
  | { status: "not-started" }
  | {
      status: "started";
      cards: Card[];
      currentIndex: number;
      side: "front" | "back";
      correctCount: number;
    }
  | { status: "complete"; correctCount: number; totalCount: number };

export type StudyEvent =
  | { type: "STUDY_PRESSED"; cards: Card[] }
  | { type: "CARD_FLIPPED" }
  | { type: "GRADE_PRESSED"; correct: boolean }
  | { type: "SESSION_ENDED" };

export function reduce(state: StudySession, event: StudyEvent): StudySession {
  if (state.status === "not-started" && event.type === "STUDY_PRESSED") {
    return {
      status: "started",
      cards: event.cards,
      currentIndex: 0,
      side: "front",
      correctCount: 0,
    };
  }

  if (state.status === "started" && event.type === "CARD_FLIPPED") {
    return { ...state, side: "back" };
  }

  if (state.status === "started" && event.type === "GRADE_PRESSED") {
    const currentIndex = state.currentIndex + 1;

    const correctCount = event.correct
      ? state.correctCount + 1
      : state.correctCount;
    const sessionEnded = currentIndex === state.cards.length;

    if (sessionEnded) {
      return {
        status: "complete",
        correctCount: correctCount,
        totalCount: state.cards.length,
      };
    }

    return {
      ...state,
      currentIndex: currentIndex,
      side: "front",
      correctCount: correctCount,
    };
  }

  if (state.status === "complete" && event.type === "SESSION_ENDED") {
    return { status: "not-started" };
  }

  return state;
}
