import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./explorer.css";
import { LOGOS } from "./logos";
import {
  ARCHITECTURE,
  ENDPOINTS,
  FINDINGS,
  LESSONS,
  PERSONA,
  PRO_TIPS,
  REFLECTION,
  STEPS,
  TEAM,
  TRADEOFFS,
} from "./data";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const SEVERITY_LABEL = {
  smooth: "Smooth",
  great: "Great",
  moderate: "Moderate",
  severe: "Severe",
};

const SWITCH_LABEL = {
  page: "Page switch",
  mental: "Mental gear switch",
  recovery: "Recovery detour",
};

const TOTAL_SECONDS = STEPS.reduce((sum, s) => sum + s.seconds, 0);
// The intended flow: sign in, start presenting.
const HAPPY_IDS = [1, 4];
const findingById = (id) => FINDINGS.find((f) => f.id === id);

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Pretty-print, but keep arrays of plain values (e.g. the order's ids) on one
// wrapped line so responses fit the box.
function compactJson(value) {
  return JSON.stringify(value, null, 2).replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, inner) =>
    `[${inner.replace(/\s*\n\s*/g, " ")}]`
  );
}

async function timedGet(path) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${API_BASE}${path}`);
    const body = await res.json();
    return {
      status: res.status,
      ms: Math.round(performance.now() - t0),
      body: compactJson(body),
    };
  } catch (err) {
    return { status: "ERR", body: String(err.message) };
  }
}

function formatSplit(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ------------------------------------------------------------------ */
/* Presenter timer — our own dual-phase timer: 7 min talk, 3 min Q&A.  */
/* ------------------------------------------------------------------ */
const TALK_SECONDS = 7 * 60;
const QA_SECONDS = 3 * 60;
const WARNING_SECONDS = 2 * 60;

function usePresenterTimer() {
  const [phase, setPhase] = useState("talk");
  const [left, setLeft] = useState(TALK_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  return {
    phase,
    left,
    running,
    toggle: () => setRunning((r) => !r),
    startQA: () => {
      setPhase("qa");
      setLeft(QA_SECONDS);
      setRunning(true);
    },
    reset: () => {
      setPhase("talk");
      setLeft(TALK_SECONDS);
      setRunning(false);
    },
  };
}

function PresenterTimer({ timer }) {
  const warn = timer.phase === "talk" && timer.left <= WARNING_SECONDS && timer.left > 0;
  const done = timer.left === 0;
  return (
    <div className={`cx-timer ${warn ? "is-warn" : ""} ${done ? "is-done" : ""}`}>
      <button
        type="button"
        className="cx-timer-main"
        onClick={timer.toggle}
        title="Start / pause presenter timer (T)"
      >
        <span className="cx-timer-phase">{timer.phase === "talk" ? "Talk" : "Q&A"}</span>
        <span className="cx-timer-time">{formatClock(timer.left)}</span>
        <span className={`cx-timer-dot ${timer.running ? "is-on" : ""}`} aria-hidden="true" />
      </button>
      {timer.phase === "talk" && (
        <button type="button" className="cx-chip-btn" onClick={timer.startQA}>
          Q&amp;A →
        </button>
      )}
      <button
        type="button"
        className="cx-icon-btn"
        onClick={timer.reset}
        aria-label="Reset presenter timer"
        title="Reset presenter timer"
      >
        ↺
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */
function SeverityPill({ severity }) {
  return <span className={`cx-pill cx-sev-${severity}`}>{SEVERITY_LABEL[severity]}</span>;
}

function Modal({ onClose, children, wide, className = "" }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="cx-modal-backdrop" onMouseDown={onClose}>
      <div
        className={`cx-modal ${wide ? "cx-modal-wide" : ""} ${className}`}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="cx-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function FindingModalBody({ finding, onShowStep, onReproduce }) {
  const evidence = finding.steps.flatMap((id) => STEPS.find((s) => s.id === id)?.evidence || []);
  return (
    <>
      <div className="cx-modal-head">
        <SeverityPill severity={finding.severity} />
      </div>
      <h2 className="cx-modal-title">{finding.title}</h2>
      {finding.severity === "great" && finding.detail && <p className="cx-lead">{finding.detail}</p>}
      {evidence.length > 0 && (
        <div className="cx-evidence cx-modal-evidence">
          {evidence.map((e) => (
            <EvidenceThumb key={e.src} evidence={e} />
          ))}
        </div>
      )}

      {finding.severity !== "great" && (
        <div className="cx-analysis">
          {finding.steps
            .map((id) => STEPS.find((s) => s.id === id))
            .filter((s) => s?.contextSwitch)
            .map((s) => (
              <div className="cx-analysis-row" key={s.id}>
                <span className="cx-analysis-k">{SWITCH_LABEL[s.switchType]}</span>
                <span>{s.contextSwitch}</span>
              </div>
            ))}
          <div className="cx-analysis-row">
            <span className="cx-analysis-k">Cause</span>
            <span>{finding.rootCause}</span>
          </div>
          {finding.detail && (
            <div className="cx-analysis-row">
              <span className="cx-analysis-k">Consequence</span>
              <span>{finding.detail}</span>
            </div>
          )}
          <div className="cx-analysis-row">
            <span className="cx-analysis-k">Time lost</span>
            <span>{finding.timeLost}</span>
          </div>
          <div className="cx-analysis-row cx-analysis-rec">
            <span className="cx-analysis-k">
              {finding.rec ? `Recommendation #${finding.rec}` : "Recommendation"}
            </span>
            <span>{finding.recommendation}</span>
          </div>
          <div className="cx-analysis-row">
            <span className="cx-analysis-k">Status</span>
            <span>
              <span className="cx-pill cx-pill-open">Open</span> Next sprint
            </span>
          </div>
        </div>
      )}

      <div className="cx-modal-actions">
        {onShowStep && finding.steps.length > 0 && (
          <button type="button" className="cx-btn" onClick={() => onShowStep(finding.steps[0])}>
            Show on journey
          </button>
        )}
        {onReproduce && finding.severity !== "great" && (
          <button
            type="button"
            className="cx-btn cx-btn-primary"
            onClick={() => onReproduce(STEPS.find((s) => s.id === finding.steps[0]).demo)}
          >
            Reproduce live →
          </button>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Chapters                                                            */
/* ------------------------------------------------------------------ */
function TitleChapter({ go }) {
  return (
    <div className="cx-title">
      <h1 className="cx-hero">
        <span className="cx-hero-brand">{TEAM.product}</span>
        <span className="cx-hero-sub">By {TEAM.name}</span>
      </h1>
      <div className="cx-members">
        {TEAM.members.map((m) => (
          <div className="cx-member" key={m.name}>
            {m.photo ? (
              <img className="cx-avatar cx-avatar-photo" src={m.photo} alt="" />
            ) : (
              <span className="cx-avatar" aria-hidden="true">
                {m.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </span>
            )}
            <span>
              <strong>{m.name}</strong>
              <span className="cx-muted cx-small">{m.role}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="cx-title-stats cx-title-live">
        <button type="button" className="cx-stat" onClick={() => go("demo")}>
          <span className="cx-stat-num cx-live-dot-wrap">
            <span className="cx-live-dot" aria-hidden="true" /> Live
          </span>
          <span className="cx-stat-label">working demo</span>
        </button>
      </div>
    </div>
  );
}

function PersonaChapter() {
  return (
    <div className="cx-stack">
    <div className="cx-grid-2">
      <div className="cx-card cx-persona">
        <div className="cx-persona-head">
          <span className="cx-persona-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="48" height="48">
              <circle cx="24" cy="17" r="8" fill="currentColor" opacity="0.9" />
              <path d="M8 42c2-9 9-14 16-14s14 5 16 14" fill="currentColor" opacity="0.55" />
            </svg>
          </span>
          <div>
            <p className="cx-kicker">Persona</p>
            <h2>{PERSONA.title}</h2>
          </div>
        </div>
      </div>
      <div className="cx-stack">
        <div className="cx-card cx-card-accent">
          <p className="cx-kicker">Goal</p>
          <p className="cx-goal">{PERSONA.goal}</p>
        </div>
      </div>
    </div>
    <div className="cx-card cx-story">
      <p className="cx-kicker">CUJ boundary</p>
      {PERSONA.stories.map((story) => (
        <p key={story} className="cx-story-text">
          {story}
        </p>
      ))}
    </div>
    </div>
  );
}

function JourneyChapter({ selected, setSelected, openFinding, initialView }) {
  const [mode, setMode] = useState(initialView === "unhappy" ? "unhappy" : "happy");
  const visible = mode === "happy" ? STEPS.filter((s) => HAPPY_IDS.includes(s.id)) : STEPS;
  const step = visible.find((s) => s.id === selected) || visible[0];
  const shownTotal = visible.reduce((sum, s) => sum + s.seconds, 0);
  const switches = STEPS.filter((s) => s.contextSwitch);

  return (
    <div className="cx-journey">
      <div className="cx-journey-top">
        <div className="cx-segmented" role="tablist" aria-label="Path">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "happy"}
            className={mode === "happy" ? "is-active" : ""}
            onClick={() => setMode("happy")}
          >
            Happy path
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "unhappy"}
            className={mode === "unhappy" ? "is-active" : ""}
            onClick={() => setMode("unhappy")}
          >
            Unhappy path
          </button>
        </div>
        <div className="cx-metrics">
          <div className="cx-metric">
            <span className="cx-metric-num">{shownTotal}s</span>
            <span className="cx-metric-label">time to task</span>
          </div>
          <div className="cx-metric">
            <span className="cx-metric-num">{mode === "happy" ? 0 : switches.length}</span>
            <span className="cx-metric-label">context switches</span>
          </div>
        </div>
      </div>

      <div className="cx-path" role="list">
        <svg className="cx-path-line" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden="true">
          <line x1="0" y1="5" x2="100" y2="5" />
        </svg>
        {visible.map((s) => (
          <button
            key={s.id}
            type="button"
            role="listitem"
            className={`cx-node cx-node-${s.severity} ${s.id === step.id ? "is-selected" : ""}`}
            onClick={() => {
              setSelected(s.id);
              if (s.findingId && s.id === step.id) openFinding(s.findingId);
            }}
          >
            <span className="cx-node-dot">
              {s.id}
              {s.contextSwitch && <span className="cx-node-switch" aria-label="context switch" />}
            </span>
            <span className="cx-node-title">{s.title}</span>
            <span className="cx-node-time">{s.seconds}s</span>
          </button>
        ))}
      </div>

      <div className="cx-ribbon" aria-label="Time spent per step">
        {visible.map((s) => (
          <button
            type="button"
            key={s.id}
            className={`cx-ribbon-seg cx-ribbon-${s.severity} ${s.id === step.id ? "is-selected" : ""}`}
            style={{ flexGrow: s.seconds }}
            onClick={() => setSelected(s.id)}
            title={`Step ${s.id}: ${s.seconds}s`}
          >
            <span>{s.seconds}s</span>
          </button>
        ))}
      </div>

      <div className="cx-step-detail cx-card" key={step.id}>
        <div className="cx-step-text">
          <div className="cx-modal-head">
            <span className="cx-step-num">Step {step.id}</span>
            <SeverityPill severity={step.severity} />
            <span className="cx-muted">{step.seconds}s</span>
          </div>
          <h3>{step.title}</h3>
          <p className="cx-lead">{step.action}</p>
          {step.contextSwitch ? (
            <p className={`cx-switch cx-switch-${step.switchType}`}>
              <strong>{SWITCH_LABEL[step.switchType]}:</strong> {step.contextSwitch}
            </p>
          ) : (
            <p className="cx-muted">No friction.</p>
          )}
          <div className="cx-modal-actions">
            {step.findingId && (
              <button
                type="button"
                className={`cx-btn cx-btn-${step.severity}`}
                onClick={() => openFinding(step.findingId)}
              >
                Why it hurts
              </button>
            )}
          </div>
        </div>
        <div className="cx-evidence">
          {step.evidence.length === 0 && (
            <div className="cx-evidence-empty">No screenshot for this step.</div>
          )}
          {step.evidence.map((e) => (
            <EvidenceThumb key={e.src} evidence={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditChapter({ openFinding }) {
  return (
    <div className="cx-journey">
      <div className="cx-metrics cx-metrics-left">
        <div className="cx-metric">
          <span className="cx-metric-num">{TOTAL_SECONDS}s</span>
          <span className="cx-metric-label">total time to task</span>
        </div>
        <div className="cx-metric">
          <span className="cx-metric-num">{STEPS.filter((s) => s.contextSwitch).length}</span>
          <span className="cx-metric-label">context switches</span>
        </div>
        <div className="cx-metric">
          <span className="cx-metric-num cx-sev-text-severe">
            {FINDINGS.filter((f) => f.severity !== "great").length}
          </span>
          <span className="cx-metric-label">lowlights</span>
        </div>
      </div>
      <JourneyTable openFinding={openFinding} />
    </div>
  );
}

function JourneyTable({ openFinding }) {
  return (
    <div className="cx-card cx-table-wrap">
      <table className="cx-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Action</th>
            <th>Context switch</th>
            <th>Time</th>
            <th>Severity</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {STEPS.map((s) => (
            <tr
              key={s.id}
              className={s.findingId ? "is-clickable" : ""}
              onClick={() => s.findingId && openFinding(s.findingId)}
            >
              <td className="cx-table-num">{s.id}</td>
              <td>
                <strong>{s.title}</strong>
                <span className="cx-muted cx-block cx-small">{s.action}</span>
              </td>
              <td>
                {s.contextSwitch ? (
                  <span className={`cx-switch cx-switch-${s.switchType}`}>
                    {SWITCH_LABEL[s.switchType]}
                  </span>
                ) : (
                  <span className="cx-muted">—</span>
                )}
              </td>
              <td className="cx-table-num">{s.seconds}s</td>
              <td>
                <SeverityPill severity={s.severity} />
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <span className="cx-table-thumbs">
                  {s.evidence.map((e) => (
                    <EvidenceThumb key={e.src} evidence={e} compact />
                  ))}
                  {s.evidence.length === 0 && <span className="cx-muted">—</span>}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td>
              <strong>Total</strong>
            </td>
            <td>
              <strong>{STEPS.filter((s) => s.contextSwitch).length} switches</strong>
            </td>
            <td className="cx-table-num">
              <strong>{TOTAL_SECONDS}s</strong>
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function EvidenceThumb({ evidence, compact }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`cx-thumb ${compact ? "cx-thumb-compact" : ""}`}
        onClick={() => setOpen(true)}
      >
        <img src={evidence.src} alt={evidence.caption} loading="lazy" />
        {!compact && <span>{evidence.caption}</span>}
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} wide>
          <img className="cx-lightbox-img" src={evidence.src} alt={evidence.caption} />
          <p className="cx-muted">{evidence.caption} · audit capture</p>
        </Modal>
      )}
    </>
  );
}

function FindingsChapter({ openFinding }) {
  return (
    <div className="cx-findings">
      <div className="cx-finding-grid">
        {FINDINGS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`cx-finding cx-finding-${f.severity}`}
            onClick={() => openFinding(f.id)}
          >
            <SeverityPill severity={f.severity} />
            <span className="cx-finding-title">{f.title}</span>
            {f.detail && <span className="cx-muted cx-small">{f.detail}</span>}
            {f.rec && (
              <span className="cx-finding-foot">
                <span className="cx-pill cx-pill-rec">Rec #{f.rec}</span>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Live demo: the real app in an iframe, a CUJ stopwatch, and an autopilot that
   walks the unhappy path through the real UI (same origin, so it can drive it). */
const DEMO_ROUTES = {
  login: "/",
  groups: "/groups",
  randomizer: "/randomizer",
  live: "/live",
};

// Stopwatch state for a CUJ run, shared by manual and autopilot runs.
function useRun() {
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(0);
  const [splits, setSplits] = useState([]);
  const [switches, setSwitches] = useState(0);
  const [pausedAt, setPausedAt] = useState(null);
  const running = startedAt !== null && splits.length < STEPS.length;
  const ticking = running && pausedAt === null;

  useEffect(() => {
    if (!ticking) return undefined;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [ticking]);

  const total = splits.reduce((a, b) => a + b, 0);
  return {
    splits,
    switches,
    running,
    started: startedAt !== null,
    elapsed: startedAt ? (running ? now - startedAt : total) : 0,
    start() {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
      setSplits([]);
      setSwitches(0);
      setPausedAt(null);
    },
    pause() {
      if (pausedAt !== null) return;
      const t = Date.now();
      setPausedAt(t);
      setNow(t);
    },
    resume() {
      if (pausedAt === null) return;
      const t = Date.now();
      setStartedAt((s) => (s === null ? s : s + (t - pausedAt)));
      setPausedAt(null);
      setNow(t);
    },
    next() {
      if (startedAt === null) return;
      const t = Date.now();
      setSplits((s) => [...s, t - startedAt - s.reduce((a, b) => a + b, 0)]);
      setNow(t);
    },
    addSwitch: () => setSwitches((n) => n + 1),
    reset() {
      setStartedAt(null);
      setSplits([]);
      setSwitches(0);
      setPausedAt(null);
    },
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Auto-play speed: every scripted delay is multiplied by this (1.5 = 50% slower).
const AUTOPLAY_PACE = 1.5;

// The embedded app is rendered zoomed out; keep in sync with .cx-frame in CSS.
const FRAME_SCALE = 0.85;

function DemoChapter({ demoTarget }) {
  const routes = DEMO_ROUTES;
  const frameRef = useRef(null);
  const [target, setTarget] = useState(() => ({ key: demoTarget?.key || "groups", nonce: 0 }));
  const [path, setPath] = useState("/groups");
  const [cursor, setCursor] = useState(null); // { x, y, click }
  const [caption, setCaption] = useState(null); // { step, text }
  const [auto, setAuto] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  // Autopilot timings reflect the script, not a user — don't compare them to the audit.
  const [autoRan, setAutoRan] = useState(false);
  const abortRef = useRef(false);
  const run = useRun();
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  const src = routes[target.key] || "/groups";

  const navigate = useCallback((key) => {
    setTarget((t) => ({ key, nonce: t.nonce + 1 }));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const p = frameRef.current?.contentWindow?.location.pathname;
        if (p) setPath(p);
      } catch {
        // detached frame
      }
    }, 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    abortRef.current = true;
  }, []);

  /* --- autopilot helpers --- */
  const doc = () => frameRef.current?.contentDocument;
  const check = () => {
    if (abortRef.current) throw new Error("stopped");
  };

  // Like wait(), but paced by AUTOPLAY_PACE and frozen while paused.
  // `exact` skips pacing for holds that must last a fixed time.
  async function pwait(ms, exact = false) {
    let left = exact ? ms : ms * AUTOPLAY_PACE;
    while (left > 0) {
      check();
      const step = Math.min(100, left);
      await wait(step);
      if (!pausedRef.current) left -= step;
    }
    check();
  }

  async function find(predicate, what = "element", timeout = 15000) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      check();
      const el = predicate(doc());
      if (el) return el;
      await wait(150);
    }
    throw new Error(`couldn't find ${what}`);
  }

  // Navigate the frame and wait for the *new* document, so we never act on the
  // page that was showing before.
  async function load(key) {
    const old = frameRef.current;
    navigate(key);
    const until = Date.now() + 15000;
    while (Date.now() < until) {
      check();
      const f = frameRef.current;
      try {
        if (
          f &&
          f !== old &&
          f.contentWindow.location.href !== "about:blank" &&
          f.contentDocument.readyState === "complete"
        ) {
          return;
        }
      } catch {
        // frame still initialising
      }
      await wait(100);
    }
    throw new Error("the demo page didn't load");
  }

  const bySelector = (sel, text) => (d) =>
    d && [...d.querySelectorAll(sel)].find((el) => !text || el.textContent.trim().includes(text));

  async function pointAt(el, click = false) {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    await pwait(350);
    const r = el.getBoundingClientRect();
    const x = (r.left + r.width / 2) * FRAME_SCALE;
    const y = (r.top + r.height / 2) * FRAME_SCALE;
    setCursor({ x, y, click: false });
    await pwait(700);
    check();
    if (click) {
      setCursor({ x, y, click: true });
      el.click();
      await pwait(250);
      setCursor((c) => c && { ...c, click: false });
    }
  }

  async function type(el, text) {
    const setter = Object.getOwnPropertyDescriptor(
      frameRef.current.contentWindow.HTMLInputElement.prototype,
      "value"
    ).set;
    for (let i = 1; i <= text.length; i += 1) {
      check();
      setter.call(el, text.slice(0, i));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await pwait(45);
    }
  }

  async function say(stepIndex, text, hold = 1400, exact = false) {
    setCaption({ step: STEPS[stepIndex], text });
    await pwait(hold, exact);
    check();
  }

  async function autopilot() {
    abortRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setAuto(true);
    setAutoRan(true);
    let restoreGroup = null;
    const r = () => runRef.current;
    try {
      await load("login");
      const first = await find(
        (d) => d?.querySelector("#name") || bySelector(".topnav-user .btn", "Sign out")(d),
        "the login page"
      );
      r().start();

      // 1 · Sign in
      await say(0, "Signing in as the instructor.", 600);
      if (first.id !== "name") await pointAt(first, true);
      const input = await find(bySelector("#name"), "the name field");
      await pointAt(input, true);
      await type(input, "Atoosa Nasiri");
      await pointAt(await find(bySelector(".login-card button[type=submit]"), "Sign in"), true);
      await find(bySelector(".group-card"), "the group list");
      r().next();

      // 2 · Page switch
      await say(1, "Readiness can't be changed here — switch to the Randomizer.", 1200);
      await pointAt(await find(bySelector(".topnav-link", "Randomizer"), "the Randomizer link"), true);
      r().addSwitch();
      r().next();

      // 3 · Randomize
      await say(2, "Mark a group not ready, then randomize.", 900);
      const rows = await find((d) => {
        const all = d && [...d.querySelectorAll(".checklist-row")];
        return all && all.length ? all : null;
      }, "the group checklist");
      const row = rows[rows.length - 1];
      const box = row.querySelector("input[type=checkbox]");
      if (box.checked) {
        restoreGroup = row.querySelector(".checklist-name")?.textContent.trim();
        await pointAt(box, true);
      }
      await pwait(500);
      await pointAt(await find(bySelector("button", "Randomize order"), "Randomize order"), true);
      await find(bySelector(".order-tile"), "the randomized order");
      await say(2, "Not-ready group lands last.", 1500);
      r().next();

      // 4 · Start presentations
      await say(3, "Start the session.", 600);
      await pointAt(await find(bySelector("button", "Start presentations"), "Start presentations"), true);
      await find(bySelector(".live-timer"), "the live timer");
      r().next();

      // 5 · Timer idle
      await say(4, "The group is talking — but the clock isn't running.", 600);
      await pointAt(await find(bySelector(".live-timer"), "the live timer"));
      await pwait(1400);
      r().addSwitch();
      r().next();

      // 6 · Manual start
      await say(5, "Instructor has to remember to press Start.", 600);
      const startBtn = await find(bySelector(".live-controls .btn", "Start"), "the Start button");
      await pointAt(startBtn, true);
      await say(5, "Presenting — timer running.", 10000, true);
      await say(5, "Switch to Q&A — its own countdown.", 300);
      await pointAt(await find(bySelector(".live-controls .btn", "Start Q&A"), "Start Q&A"), true);
      await pwait(4000);
      await pointAt(await find(bySelector(".live-controls .btn", "Pause"), "Pause"), true);
      r().next();

      // 7 · Delete risk (shown, not clicked)
      await say(6, "Back on Groups: one click on Delete and it's gone — no confirm.", 600);
      await pointAt(await find(bySelector(".live-exit"), "Exit"), true);
      const del = await find(bySelector(".group-card .btn-danger", "Delete"), "a Delete button");
      await pointAt(del);
      // The frame doesn't load explorer.css, so highlight inline.
      del.style.outline = "3px solid oklch(56% 0.2 25)";
      del.style.outlineOffset = "3px";
      await pwait(2200);
      del.style.outline = "";
      del.style.outlineOffset = "";
      r().addSwitch();
      r().next();
      setCaption({ step: null, text: "Unhappy path complete. (Delete not clicked in the demo.)" });
    } catch (err) {
      // A stopped run is discarded so Auto-play is offered again.
      if (err.message === "stopped") r().reset();
      setCaption(
        err.message === "stopped"
          ? null
          : { step: null, text: `Auto-play stopped: ${err.message}. Press Auto-play to retry.` }
      );
    } finally {
      pausedRef.current = false;
      setPaused(false);
      setCursor(null);
      setAuto(false);
      if (restoreGroup) {
        try {
          const groups = await fetch(`${API_BASE}/api/groups`).then((x) => x.json());
          const g = groups.find((x) => x.name === restoreGroup);
          if (g && !g.ready) {
            await fetch(`${API_BASE}/api/groups/${g.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ready: true }),
            });
          }
        } catch {
          // best effort
        }
      }
    }
  }

  function stop() {
    abortRef.current = true;
  }

  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) runRef.current.pause();
    else runRef.current.resume();
  }


  return (
    <div className="cx-demo">
      <div className="cx-browser">
        <div className="cx-browser-bar">
          <span className="cx-browser-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="cx-browser-url">localhost:5173{path}</span>
          <a className="cx-chip-btn" href={path} target="_blank" rel="noreferrer">
            Pop out ↗
          </a>
        </div>
        <div className="cx-frame-wrap">
          <iframe
            key={target.nonce}
            ref={frameRef}
            className="cx-frame"
            src={src}
            title="Kinetic Randomizer live demo"
            onLoad={forwardClickerKeys}
          />
          {auto && <div className="cx-frame-shield" aria-hidden="true" />}
          {cursor && (
            <span
              className={`cx-cursor ${cursor.click ? "is-click" : ""}`}
              style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
              aria-hidden="true"
            />
          )}
          {caption && (
            <div className="cx-caption" role="status">
              {caption.step && (
                <span className={`cx-caption-step cx-sev-${caption.step.severity}`}>
                  {caption.step.id}
                </span>
              )}
              <span>{caption.text}</span>
              {paused && <span className="cx-caption-paused">Paused</span>}
            </div>
          )}
        </div>
      </div>
      <LiveRun
        run={run}
        auto={auto}
        compare={!autoRan}
        onAuto={autopilot}
        onStop={stop}
        paused={paused}
        onTogglePause={togglePause}
        onGo={(key) => {
          setAutoRan(false);
          navigate(key);
        }}
      />
    </div>
  );
}

// Presentation clickers send PageUp/PageDown. Forward them out of the embedded
// app so chapter navigation still works after clicking inside the demo.
function forwardClickerKeys(e) {
  try {
    e.currentTarget.contentWindow.addEventListener("keydown", (ev) => {
      if (ev.key === "PageUp" || ev.key === "PageDown") {
        ev.preventDefault();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: ev.key }));
      }
    });
  } catch {
    // frame not same-origin; nothing to forward
  }
}

function LiveRun({ run, auto, compare, paused, onAuto, onStop, onTogglePause, onGo }) {
  const current = run.splits.length;
  const baseline = TOTAL_SECONDS * 1000;
  const finished = run.started && !run.running;

  function manualStart() {
    run.start();
    onGo(STEPS[0].demo);
  }

  function manualNext() {
    const upcoming = STEPS[current + 1];
    run.next();
    if (upcoming && upcoming.demo !== STEPS[current].demo) onGo(upcoming.demo);
  }

  return (
    <aside className="cx-run cx-card">
      <div className="cx-run-head">
        <div>
          <p className="cx-kicker">CUJ run</p>
          <p className="cx-run-clock">{formatSplit(run.elapsed)}</p>
          <p className="cx-muted cx-small">Baseline {TOTAL_SECONDS}s</p>
        </div>
        <div className="cx-run-switch">
          <span className="cx-metric-num">{run.switches}</span>
          <button
            type="button"
            className="cx-chip-btn"
            onClick={run.addSwitch}
            disabled={!run.running || auto}
          >
            + switch
          </button>
        </div>
      </div>
      <ol className="cx-run-steps">
        {STEPS.map((s, i) => {
          const done = i < run.splits.length;
          const active = run.running && i === current;
          const delta = done ? run.splits[i] - s.seconds * 1000 : 0;
          return (
            <li
              key={s.id}
              className={`${done ? "is-done" : ""} ${active ? "is-active" : ""} cx-run-${s.severity}`}
            >
              <button
                type="button"
                className="cx-run-go"
                onClick={() => onGo(s.demo)}
                disabled={auto}
                title="Open this page"
              >
                {s.id}
              </button>
              <span className="cx-run-title">{s.title}</span>
              <span className="cx-run-time">
                {done ? (
                  <>
                    {formatSplit(run.splits[i])}
                    {compare && (
                      <em className={delta > 0 ? "is-slower" : "is-faster"}>
                        {delta > 0 ? "+" : "−"}
                        {formatSplit(Math.abs(delta))}
                      </em>
                    )}
                  </>
                ) : (
                  <span className="cx-muted">{s.seconds}s</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="cx-run-actions">
        {auto ? (
          <>
            <button type="button" className="cx-btn cx-btn-primary" onClick={onTogglePause}>
              {paused ? "▶ Resume" : "❚❚ Pause"}
            </button>
            <button type="button" className="cx-btn" onClick={onStop}>
              ■ Stop
            </button>
          </>
        ) : run.running ? (
          <button type="button" className="cx-btn cx-btn-primary" onClick={manualNext}>
            Step {current + 1} done →
          </button>
        ) : (
          <>
            <button type="button" className="cx-btn cx-btn-primary" onClick={onAuto}>
              ▶ Auto-play
            </button>
            <button type="button" className="cx-btn" onClick={manualStart}>
              Manual run
            </button>
          </>
        )}
        {finished && !auto && compare && (
          <span className={`cx-small ${run.elapsed > baseline ? "cx-sev-text-severe" : "cx-sev-text-great"}`}>
            {formatSplit(Math.abs(run.elapsed - baseline))} {run.elapsed > baseline ? "slower" : "faster"} than audit
          </span>
        )}
      </div>
    </aside>
  );
}

function ArchitectureChapter() {
  const [active, setActive] = useState("api");
  const [health, setHealth] = useState({ state: "checking" });
  const [result, setResult] = useState(null);

  useEffect(() => {
    const t0 = performance.now();
    fetch(`${API_BASE}/api/groups`)
      .then((r) => r.json())
      .then(() => setHealth({ state: "up", ms: Math.round(performance.now() - t0) }))
      .catch(() => setHealth({ state: "down" }));
  }, []);

  async function run(endpoint) {
    const path = endpoint.path;
    setResult({ endpoint, path, loading: true });
    setResult({ endpoint, path, ...(await timedGet(path)) });
  }

  return (
    <div className="cx-arch">
      <div className="cx-arch-diagram">
        {ARCHITECTURE.map((n, i) => (
          <div className="cx-arch-cell" key={n.id}>
            <button
              type="button"
              className={`cx-arch-node ${active === n.id ? "is-active" : ""}`}
              onClick={() => setActive(n.id)}
            >
              <span className="cx-arch-label">{n.label}</span>
              <span className="cx-arch-tech">{n.tech}</span>
              <span className="cx-arch-port-row">
                {n.logos.map((key) => (
                  <svg
                    key={key}
                    className="cx-logo-icon"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label={LOGOS[key].title}
                  >
                    <path d={LOGOS[key].path} fill={LOGOS[key].color} />
                  </svg>
                ))}
                <span className="cx-arch-port">{n.port}</span>
              </span>
            </button>
            {i < ARCHITECTURE.length - 1 && (
              <span className="cx-arch-link" aria-hidden="true">
                <span className="cx-arch-flow" />
                <span className="cx-arch-proto">{i === 0 ? "HTTP" : "SQL"}</span>
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="cx-grid-2">
        <div className="cx-card">
          <p className="cx-kicker">Trade-offs</p>
          <ul className="cx-list">
            {TRADEOFFS.map((t) => (
              <li key={t.text} className={`cx-tradeoff-${t.tone}`}>
                {t.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="cx-card cx-console">
          <div className="cx-console-head">
            <p className="cx-kicker">Live API</p>
            <span className={`cx-health cx-health-${health.state}`}>
              {health.state === "up" && `API up · ${health.ms} ms`}
              {health.state === "down" && "API unreachable"}
              {health.state === "checking" && "Checking…"}
            </span>
          </div>
          <div className="cx-endpoints">
            {ENDPOINTS.map((e) => (
              <button
                key={e.path}
                type="button"
                className={`cx-endpoint ${result?.endpoint === e ? "is-active" : ""}`}
                onClick={() => run(e)}
              >
                <span className="cx-method">{e.method}</span>
                <code>{e.path}</code>
              </button>
            ))}
          </div>
          <pre className="cx-json">
            {!result && "Click an endpoint →"}
            {result?.loading && `${result.endpoint.method} ${result.path} …`}
            {result &&
              !result.loading &&
              `${result.endpoint.method} ${result.endpoint.path}  →  ${result.status}${result.ms ? ` · ${result.ms} ms` : ""}\n${
                result.body.length > 1600 ? `${result.body.slice(0, 1600)}\n…` : result.body
              }`}
          </pre>
        </div>
      </div>
    </div>
  );
}

function IterationChapter({ openFinding }) {
  const recs = FINDINGS.filter((f) => f.rec).sort((a, b) => a.rec - b.rec);
  return (
    <div className="cx-stack cx-iter">
      <div className="cx-card">
        <p className="cx-kicker">Recommendations</p>
        {recs.map((f) => (
          <button key={f.id} type="button" className="cx-rec" onClick={() => openFinding(f.id)}>
            <span className="cx-rec-num">{f.rec}</span>
            <span>
              <strong>{f.recommendation.split(".")[0]}.</strong>
              <span className="cx-muted cx-small cx-block">
                {f.title} <SeverityPill severity={f.severity} />
              </span>
            </span>
          </button>
        ))}
        <p className="cx-muted cx-small">Both open — top of next sprint.</p>
      </div>
    </div>
  );
}

function TeamChapter() {
  const [flipped, setFlipped] = useState({});
  return (
    <div className="cx-stack cx-team">
      <div>
        <p className="cx-kicker">A1 principles under sprint pressure · click to flip</p>
        <div className="cx-flip-grid">
          {REFLECTION.map((r) => (
            <button
              key={r.principle}
              type="button"
              className={`cx-flip ${flipped[r.principle] ? "is-flipped" : ""}`}
              onClick={() => setFlipped((f) => ({ ...f, [r.principle]: !f[r.principle] }))}
              aria-pressed={!!flipped[r.principle]}
            >
              <span className="cx-flip-inner">
                <span className="cx-flip-face">
                  <span className="cx-kicker">{r.principle}</span>
                  <span className="cx-flip-tag cx-sev-text-great">What held</span>
                  <span>{r.held}</span>
                </span>
                <span className="cx-flip-face cx-flip-back">
                  <span className="cx-kicker">{r.principle}</span>
                  <span className="cx-flip-tag cx-sev-text-moderate">Honestly…</span>
                  <span>{r.honest}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="cx-grid-2">
        <div className="cx-card">
          <p className="cx-kicker">Takeaways</p>
          <ul className="cx-list">
            {LESSONS.map((l) => (
              <li key={l.title}>
                <strong>{l.title}</strong> <span className="cx-muted">— {l.body}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="cx-card">
          <p className="cx-kicker">Pro tips · using the tool today</p>
          <ul className="cx-list">
            {PRO_TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ThanksChapter({ timer }) {
  const [appOpen, setAppOpen] = useState(false);
  return (
    <div className="cx-title">
      <h1 className="cx-hero">
        <span className="cx-hero-brand">Thank you for listening :)</span>
      </h1>
      <div className="cx-thanks-actions">
        {/* Restarts the presenter timer as a 3:00 Q&A countdown. */}
        <button type="button" className="cx-btn cx-btn-primary" onClick={timer.startQA}>
          Start Q&amp;A timer
        </button>
        <button type="button" className="cx-btn" onClick={() => setAppOpen(true)}>
          Try Randomizer
        </button>
      </div>
      {appOpen && (
        <Modal onClose={() => setAppOpen(false)} className="cx-modal-app">
          <div className="cx-app-head">
            <span className="cx-kicker">Try the Randomizer</span>
            <a className="cx-chip-btn" href="/groups" target="_blank" rel="noreferrer">
              Open in new tab ↗
            </a>
          </div>
          <iframe
            className="cx-app-frame"
            src="/groups"
            title="Kinetic Randomizer"
            onLoad={(e) => {
              // Esc inside the app also closes the pop-up.
              try {
                e.currentTarget.contentWindow.addEventListener("keydown", (ev) => {
                  if (ev.key === "Escape") setAppOpen(false);
                });
              } catch {
                // not same-origin
              }
            }}
          />
        </Modal>
      )}
      <p className="cx-hero-sub cx-thanks-q">Questions?</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
// Order follows the 7-minute presentation template. `hidden` chapters stay in
// the code but are skipped in the deck.
const ALL_CHAPTERS = [
  { id: "title", label: "Intro" },
  { id: "persona", label: "Why Use Our Randomizer - User Goal & Persona" },
  { id: "architecture", label: "Our MVP Architecture" },
  { id: "demo", label: "Live demo" },
  { id: "journey", label: "Happy → unhappy path" },
  { id: "audit", label: "CUJ audit", hidden: true },
  { id: "findings", label: "Lowlights & recommendations" },
  { id: "iteration", label: "Recommendations", hidden: true },
  { id: "team", label: "Team + takeaways", hidden: true },
  { id: "thanks", label: "Thank you" },
];
const CHAPTERS = ALL_CHAPTERS.filter((c) => !c.hidden);

function readHash() {
  const id = window.location.hash.replace("#", "");
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return i === -1 ? 0 : i;
}

export default function Explorer() {
  const [index, setIndex] = useState(readHash);
  const [selectedStep, setSelectedStep] = useState(2);
  const [findingId, setFindingId] = useState(null);
  const [demoTarget, setDemoTarget] = useState(null);
  const [journeyView, setJourneyView] = useState(null);
  const timer = usePresenterTimer();
  const chapter = CHAPTERS[index];

  const goIndex = useCallback((i) => {
    const next = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    setFindingId(null);
    setIndex(next);
    window.history.replaceState(null, "", `#${CHAPTERS[next].id}`);
  }, []);
  const go = useCallback(
    (id, view) => {
      setJourneyView(view || null);
      goIndex(CHAPTERS.findIndex((c) => c.id === id));
    },
    [goIndex]
  );

  const reproduce = useCallback(
    (key) => {
      setFindingId(null);
      setDemoTarget({ key, at: Date.now() });
      go("demo");
    },
    [go]
  );

  useEffect(() => {
    const onHash = () => {
      setFindingId(null);
      setIndex(readHash());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Slightly larger type for the projector; restored when leaving the page.
  useEffect(() => {
    const root = document.documentElement;
    const prevTitle = document.title;
    const prevSize = root.style.fontSize;
    document.title = "Kinetic · Randomizer MVP";
    root.style.fontSize = "112.5%";
    return () => {
      document.title = prevTitle;
      root.style.fontSize = prevSize;
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.("input, textarea, select")) return;
      if (document.querySelector(".cx-modal")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goIndex(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goIndex(index - 1);
      } else if (e.key === "t" || e.key === "T") {
        timer.toggle();
      } else if (/^[0-9]$/.test(e.key)) {
        goIndex(e.key === "0" ? CHAPTERS.length - 1 : Number(e.key) - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goIndex, timer]);

  const finding = findingId ? findingById(findingId) : null;
  const openFinding = setFindingId;

  const body = useMemo(() => {
    switch (chapter.id) {
      case "title":
        return <TitleChapter go={go} />;
      case "persona":
        return <PersonaChapter />;
      case "journey":
        return (
          <JourneyChapter
            selected={selectedStep}
            setSelected={setSelectedStep}
            openFinding={openFinding}
            initialView={journeyView}
          />
        );
      case "audit":
        return <AuditChapter openFinding={openFinding} />;
      case "findings":
        return (
          <div className="cx-combined">
            <FindingsChapter openFinding={openFinding} />
            <IterationChapter openFinding={openFinding} />
          </div>
        );
      case "demo":
        return <DemoChapter demoTarget={demoTarget} />;
      case "architecture":
        return <ArchitectureChapter />;
      case "iteration":
        return <IterationChapter openFinding={openFinding} />;
      case "team":
        return <TeamChapter />;
      default:
        return <ThanksChapter timer={timer} />;
    }
  }, [chapter.id, go, selectedStep, openFinding, demoTarget, timer, journeyView]);

  return (
    <div
      className={`cx-root ${chapter.id === "demo" ? "is-demo" : ""} ${
        ["architecture", "title"].includes(chapter.id) ? "is-fill" : ""
      }`}
    >
      <div className="cx-bg" aria-hidden="true">
        <span className="cx-grid" />
      </div>

      <header className="cx-top">
        <div className="cx-brand">
          <span>
            <strong>{TEAM.name}</strong>
            <span className="cx-muted"> · Randomizer MVP</span>
          </span>
        </div>
        <nav className="cx-chapters" aria-label="Chapters">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`cx-chapter-btn ${i === index ? "is-active" : ""} ${i < index ? "is-past" : ""}`}
              onClick={() => goIndex(i)}
              title={`${i + 1}. ${c.label}`}
            >
              <span className="cx-chapter-num">{i + 1}</span>
              <span className="cx-chapter-label">{c.label}</span>
            </button>
          ))}
        </nav>
        <PresenterTimer timer={timer} />
      </header>

      <main className="cx-stage">
        <div className="cx-chapter" key={chapter.id}>
          {!["title", "demo", "thanks"].includes(chapter.id) && (
            <h2 className="cx-chapter-title">
              {chapter.label}
            </h2>
          )}
          {body}
        </div>
      </main>

      <footer className="cx-bottom">
        <button
          type="button"
          className="cx-nav-btn"
          onClick={() => goIndex(index - 1)}
          disabled={index === 0}
          aria-label="Previous chapter"
        >
          ←
        </button>
        <div className="cx-progress" aria-hidden="true">
          <span style={{ width: `${((index + 1) / CHAPTERS.length) * 100}%` }} />
        </div>
        <span className="cx-muted cx-small">
          {index + 1} / {CHAPTERS.length}
        </span>
        <button
          type="button"
          className="cx-nav-btn"
          onClick={() => goIndex(index + 1)}
          disabled={index === CHAPTERS.length - 1}
          aria-label="Next chapter"
        >
          →
        </button>
      </footer>

      {finding && (
        <Modal onClose={() => setFindingId(null)}>
          <FindingModalBody
            finding={finding}
            onShowStep={(id) => {
              setSelectedStep(id);
              setFindingId(null);
              go("journey", "unhappy");
            }}
            onReproduce={reproduce}
          />
        </Modal>
      )}
    </div>
  );
}
