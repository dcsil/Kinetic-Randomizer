import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const PRESENTATION_SECONDS = 5 * 60;
const QA_SECONDS = 3 * 60;
const WARNING_SECONDS = 2 * 60;

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function PresentationLive() {
  const { groups, order, currentIndex, nextGroup } = useApp();
  const navigate = useNavigate();

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

  function goNext() {
    nextGroup();
    setPhase("presenting");
    setSecondsLeft(PRESENTATION_SECONDS);
    setRunning(false);
  }

  return (
    <div className="live-page">
      <p className="live-phase">{phase === "presenting" ? "Presenting" : "Q&A"}</p>
      <h1 className="live-name">{currentGroup?.name}</h1>

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
            onClick={isLast ? () => navigate("/dashboard") : goNext}
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
