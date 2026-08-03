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
          onClick={() => {
            dispatch({ type: "CARD_FLIPPED" });
          }}
        >
          <p>{text}</p>
        </button>
        {isBack && (
          <div>
            <button
              onClick={() => {
                dispatch({ type: "GRADE_PRESSED", correct: false });
              }}
            >
              incorrect
            </button>
            <button
              onClick={() => {
                dispatch({ type: "GRADE_PRESSED", correct: true });
              }}
            >
              correct
            </button>
          </div>
        )}
      </div>
    );
  }

  if (session.status === "complete") {
    return (
      <div>
        <p>your score</p>
        <p>
          {session.correctCount}/{session.totalCount}
        </p>
        <button
          onClick={() => {
            dispatch({ type: "SESSION_ENDED" });
          }}
        >
          exit
        </button>
      </div>
    );
  }

  return null;
}
