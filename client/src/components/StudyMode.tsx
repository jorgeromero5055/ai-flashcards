import type { StudySession, StudyEvent } from "../studySession";

export function StudyMode({
  session,
  dispatch,
}: {
  session: StudySession;
  dispatch: React.Dispatch<StudyEvent>;
}) {
  if (session.status === "started") {
    const text = session.cards[session.currentIndex][session.side];
    const isBack = session.side === "back";

    return (
      <div>
        <button
          className="card"
          onClick={() => dispatch({ type: "CARD_FLIPPED" })}
        >
          {text}
        </button>

        {isBack && (
          <div className="actions">
            <button
              onClick={() =>
                dispatch({ type: "GRADE_PRESSED", correct: false })
              }
            >
              Missed it
            </button>
            <button
              onClick={() => dispatch({ type: "GRADE_PRESSED", correct: true })}
            >
              Got it
            </button>
          </div>
        )}
      </div>
    );
  }

  if (session.status === "complete") {
    return (
      <div className="score">
        <p className="score-label">Your score</p>
        <p className="score-value">
          {session.correctCount}/{session.totalCount}
        </p>
        <button onClick={() => dispatch({ type: "SESSION_ENDED" })}>
          Exit
        </button>
      </div>
    );
  }

  return null;
}
