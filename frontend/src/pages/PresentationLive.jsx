import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DraggableList from "../components/DraggableList";
import { useApp } from "../context/AppContext";

const PRESENTATION_SECONDS = 7 * 60;
const QA_SECONDS = 3 * 60;
const WARNING_SECONDS = 2 * 60;

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function PresentationLive() {
  const { groups, order, currentIndex, nextGroup, updatePresentation } = useApp();
  const navigate = useNavigate();
  const groupsPath = "/groups";

  const [phase, setPhase] = useState("presenting"); // presenting | qa
  const [secondsLeft, setSecondsLeft] = useState(PRESENTATION_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") navigate(groupsPath);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, groupsPath]);

  if (!order || order.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          No presentation order set. Go back to the Randomizer to generate one.
        </div>
      </div>
    );
  }

  const currentGroup = groups.find((g) => g.id === order[currentIndex]);
  const isLast = currentIndex >= order.length - 1;
  const isWarning = phase === "presenting" && secondsLeft <= WARNING_SECONDS;
  const isDone = secondsLeft === 0;

  function startQA() {
    setPhase("qa");
    setSecondsLeft(QA_SECONDS);
    setRunning(true);
  }

  function resetTimer() {
    setPhase("presenting");
    setSecondsLeft(PRESENTATION_SECONDS);
    setRunning(false);
  }

  function goNext() {
    nextGroup();
    resetTimer();
  }

  const currentId = order[currentIndex];
  const listedIds = order.filter((id) => groups.some((g) => g.id === id));

  async function jumpTo(id) {
    if (id === currentId) return;
    await updatePresentation({ currentIndex: order.indexOf(id) });
    resetTimer();
  }

  async function reorder(nextOrder) {
    const nextIndex = nextOrder.indexOf(currentId);
    await updatePresentation({
      order: nextOrder,
      currentIndex: nextIndex === -1 ? Math.min(currentIndex, nextOrder.length - 1) : nextIndex,
    });
  }

  return (
    <div className="live-page">
      <button
        className="live-exit"
        onClick={() => navigate(groupsPath)}
        aria-label="Exit presentation mode"
        title="Exit (Esc)"
      >
        Exit
      </button>

      <aside className="live-order">
        <p className="live-order-title">Order</p>
        <DraggableList
          items={listedIds}
          onReorder={reorder}
          label="Presentation order"
          getItemClassName={(id) => {
            const index = order.indexOf(id);
            if (index === currentIndex) return "live-order-current";
            if (index < currentIndex) return "live-order-done";
            return "";
          }}
          renderItem={(id) => (
            <span
              className="live-order-name"
              role="button"
              tabIndex={0}
              aria-current={id === currentId ? "true" : undefined}
              onClick={() => jumpTo(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  jumpTo(id);
                }
              }}
            >
              {groups.find((g) => g.id === id)?.name}
            </span>
          )}
        />
      </aside>

      <p className="live-phase">{phase === "presenting" ? "Presenting" : "Q&A"}</p>
      <div className="live-heading">
        <h1 className="live-name">{currentGroup?.name}</h1>
        {currentGroup?.members && (
          <p className="live-members">{currentGroup.members.split(", ").join(" · ")}</p>
        )}
      </div>

      <div className={`live-timer ${isWarning ? "live-timer-warning" : ""} ${isDone ? "live-timer-done" : ""}`}>
        {formatTime(secondsLeft)}
      </div>

      <div className="live-controls">
        <button className="btn" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start"}
        </button>
        {phase === "presenting" ? (
          <button className="btn btn-primary" onClick={startQA}>
            Start Q&amp;A
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={isLast ? () => navigate(groupsPath) : goNext}
          >
            {isLast ? "Finish session" : "Next group →"}
          </button>
        )}
      </div>

      <p className="live-progress">
        Group {currentIndex + 1} of {order.length}
      </p>
    </div>
  );
}
