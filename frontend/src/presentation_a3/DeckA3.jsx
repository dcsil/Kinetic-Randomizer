import { useCallback, useEffect, useMemo, useState } from "react";
// Shares the shell styles with the A2 deck; A3-only pieces live in deck-a3.css.
import "../presentation/explorer.css";
import "./deck-a3.css";
import { LOGOS } from "./logos";
import {
  APP_SECURITY,
  AUDIT,
  EVOLUTION,
  FEEDBACK,
  GUARDRAILS,
  LIVE_HOST,
  LIVE_URL,
  NODES,
  PIPELINE,
  PROMO_SRC,
  ROADMAP,
  SECRETS,
  TEAM,
} from "./data";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

// 10 min talk (promo video included) + 5 min Q&A.
const TALK_SECONDS = 10 * 60;
const QA_SECONDS = 5 * 60;
const WARNING_SECONDS = 2 * 60;

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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

// Pings the deployed API so the deck itself proves the release is live.
function useHealth() {
  const [health, setHealth] = useState({ state: "checking" });
  const ping = useCallback(() => {
    const t0 = performance.now();
    fetch(`${API_BASE}/healthz`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(() => setHealth({ state: "up", ms: Math.round(performance.now() - t0) }))
      .catch(() => setHealth({ state: "down" }));
  }, []);
  useEffect(ping, [ping]);
  const recheck = useCallback(() => {
    setHealth({ state: "checking" });
    ping();
  }, [ping]);
  return [health, recheck];
}

function HealthBadge({ health, onRetry }) {
  return (
    <button
      type="button"
      className={`cx-health cx-health-${health.state} a3-health`}
      onClick={onRetry}
      title="Re-check GET /healthz"
    >
      {health.state === "up" && `API + DB up · ${health.ms} ms`}
      {health.state === "down" && "API asleep or unreachable · retry"}
      {health.state === "checking" && "Checking /healthz…"}
    </button>
  );
}

function Logo({ name }) {
  const logo = LOGOS[name];
  return (
    <svg className="cx-logo-icon" viewBox="0 0 24 24" role="img" aria-label={logo.title}>
      <path d={logo.path} fill={logo.color} />
    </svg>
  );
}

function StatusPill({ status }) {
  return status === "shipped" ? (
    <span className="cx-pill cx-sev-great">Shipped</span>
  ) : (
    <span className="cx-pill cx-pill-open">Open</span>
  );
}

/* ------------------------------------------------------------------ */
/* Chapters                                                            */
/* ------------------------------------------------------------------ */
function TitleChapter({ health, recheck }) {
  return (
    <div className="cx-title">
      <h1 className="cx-hero">
        <span className="cx-hero-brand">{TEAM.product}</span>
        <span className="cx-hero-sub">From localhost to live · Team {TEAM.name}</span>
      </h1>
      <div className="cx-members">
        {TEAM.members.map((m) => (
          <div className="cx-member" key={m.name}>
            <img className="cx-avatar cx-avatar-photo" src={m.photo} alt="" />
            <span>
              <strong>{m.name}</strong>
              <span className="cx-muted cx-small">{m.role}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="a3-live-row">
        <a className="a3-url" href={LIVE_URL} target="_blank" rel="noreferrer">
          <span className="cx-live-dot" aria-hidden="true" />
          {LIVE_HOST}
        </a>
        <HealthBadge health={health} onRetry={recheck} />
      </div>
    </div>
  );
}

function PromoChapter() {
  // Vercel and vite preview rewrite unknown paths to index.html, so check the
  // content type instead of waiting for the <video> to fail.
  const [state, setState] = useState("checking");
  useEffect(() => {
    fetch(PROMO_SRC, { method: "HEAD" })
      .then((r) => {
        const type = r.headers.get("content-type") || "";
        setState(r.ok && type.startsWith("video/") ? "ready" : "missing");
      })
      .catch(() => setState("missing"));
  }, []);
  if (state === "checking") return <div className="a3-promo" />;
  return (
    <div className="a3-promo">
      {state === "missing" ? (
        <div className="cx-card a3-promo-empty">
          <p className="cx-kicker">Promo video</p>
          <p className="cx-lead">
            Add the exported video at <code>frontend/public/presentation_a3/promo.mp4</code>.
          </p>
        </div>
      ) : (
        <video
          className="a3-video"
          src={PROMO_SRC}
          controls
          playsInline
          preload="metadata"
          onError={() => setState("missing")}
        />
      )}
    </div>
  );
}

function EvolutionChapter() {
  return (
    <div className="cx-stack">
      <div className="cx-card a3-table-card">
        <table className="a3-table a3-evo">
          <thead>
            <tr>
              <th />
              <th>A2 · local sandbox</th>
              <th aria-hidden="true" />
              <th>A3 · cloud release</th>
            </tr>
          </thead>
          <tbody>
            {EVOLUTION.map((r) => (
              <tr key={r.area}>
                <th scope="row">{r.area}</th>
                <td className="cx-muted">{r.before}</td>
                <td className="a3-arrow" aria-hidden="true">→</td>
                <td>
                  <strong>{r.after}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="a3-callout">
        Same core loop as A2: sign in, mark who's ready, randomize, run the timer. A3 makes that loop
        public, durable and repeatable.
      </p>
    </div>
  );
}

function TopoNode({ id, active, plane, onSelect }) {
  const n = NODES[id];
  const dim = plane !== "all" && n.plane !== plane;
  return (
    <button
      type="button"
      className={`a3-node a3-node-${n.plane} ${active === id ? "is-active" : ""} ${dim ? "is-dim" : ""}`}
      onClick={() => onSelect(id)}
    >
      <span className="a3-node-label">{n.label}</span>
      <span className="a3-node-tech">{n.tech}</span>
      {n.logos && (
        <span className="a3-node-logos">
          {n.logos.map((l) => (
            <Logo key={l} name={l} />
          ))}
        </span>
      )}
    </button>
  );
}

function Edge({ label, kind, plane, dir = "right" }) {
  const dim = plane !== "all" && plane !== kind;
  return (
    <span className={`a3-edge a3-edge-${kind} a3-edge-${dir} ${dim ? "is-dim" : ""}`}>
      <span className="a3-edge-line" />
      {label && <span className="a3-edge-label">{label}</span>}
    </span>
  );
}

function ArchitectureChapter({ health, recheck }) {
  const [active, setActive] = useState("api");
  const [plane, setPlane] = useState("all");
  const n = NODES[active];
  return (
    <div className="a3-arch">
      <div className="a3-arch-bar">
        <h2 className="cx-chapter-title a3-arch-title">Cloud architecture</h2>
        <div className="cx-segmented" role="group" aria-label="Highlight plane">
          {[
            ["all", "Both planes"],
            ["data", "Data plane"],
            ["control", "Control plane"],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={plane === k ? "is-active" : ""}
              onClick={() => setPlane(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <HealthBadge health={health} onRetry={recheck} />
      </div>

      <div className="a3-topo">
        <div className={`a3-zone a3-zone-data ${plane === "control" ? "is-dim" : ""}`}>
          <span className="a3-zone-tag">Data plane · runtime requests</span>
          <div className="a3-data-grid">
            <div className="a3-cell-user">
              <TopoNode id="user" active={active} plane={plane} onSelect={setActive} />
            </div>
            <div className="a3-data-row">
              <Edge label="HTTPS · static" kind="data" plane={plane} />
              <div className="a3-provider">
                <span className="a3-provider-tag">
                  <Logo name="vercel" /> Vercel edge
                </span>
                <TopoNode id="spa" active={active} plane={plane} onSelect={setActive} />
              </div>
            </div>
            <div className="a3-data-row">
              <Edge label="HTTPS · REST + JWT" kind="data" plane={plane} />
              <div className="a3-provider a3-provider-render">
                <span className="a3-provider-tag">
                  <Logo name="render" /> Render
                </span>
                <div className="a3-render-row">
                  <TopoNode id="api" active={active} plane={plane} onSelect={setActive} />
                  <Edge label="SQL · private" kind="data" plane={plane} />
                  <div className="a3-private">
                    <span className="a3-private-tag">no public access</span>
                    <TopoNode id="db" active={active} plane={plane} onSelect={setActive} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`a3-zone a3-zone-control ${plane === "data" ? "is-dim" : ""}`}>
          <span className="a3-zone-tag">Control plane · delivery</span>
          <div className="a3-control-row">
            <TopoNode id="repo" active={active} plane={plane} onSelect={setActive} />
            <Edge label="triggers" kind="control" plane={plane} />
            <TopoNode id="actions" active={active} plane={plane} onSelect={setActive} />
            <Edge label="injected" kind="control" plane={plane} dir="left" />
            <TopoNode id="secrets" active={active} plane={plane} onSelect={setActive} />
            <span className="a3-ship">
              ships to <strong>Render API</strong> then <strong>Vercel CLI</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="cx-card a3-detail" key={active}>
        <div className="a3-detail-head">
          <p className="cx-kicker">
            {n.plane === "data" ? "Data plane" : "Control plane"} · {n.label}
          </p>
          <span className="cx-muted cx-small">{n.tech}</span>
        </div>
        <div className="a3-detail-grid">
          <p>
            <strong>What</strong> {n.what}
          </p>
          <p>
            <strong>Why this</strong> {n.why}
          </p>
          <p>
            <strong>MVP boundary</strong> {n.limit}
          </p>
        </div>
      </div>
    </div>
  );
}

function PipelineChapter() {
  return (
    <div className="cx-stack">
      <ol className="a3-pipe">
        {PIPELINE.map((s, i) => (
          <li key={s.id} className={`a3-stage a3-stage-${s.id}`}>
            <span className="a3-stage-num">{i === 0 ? "v*" : i}</span>
            <strong className="a3-stage-title">{s.title}</strong>
            <span className="cx-muted cx-small">{s.sub}</span>
            <code className="a3-code">
              {s.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </code>
          </li>
        ))}
      </ol>
      <div className="a3-guard-grid">
        {GUARDRAILS.map((g) => (
          <div className="cx-card a3-guard" key={g.k}>
            <p className="cx-kicker">{g.k}</p>
            <p>{g.v}</p>
          </div>
        ))}
      </div>
      <p className="cx-muted cx-small">
        Source: <code>.github/workflows/deploy.yml</code> · Vercel Git auto-deploys are disabled so this
        workflow is the only path to production.
      </p>
    </div>
  );
}

function SecurityChapter() {
  return (
    <div className="a3-sec">
      <div className="cx-card a3-table-card">
        <p className="cx-kicker">Secret management · zero credentials in git</p>
        <table className="a3-table">
          <thead>
            <tr>
              <th>Secret</th>
              <th>Lives in</th>
              <th>Used for</th>
            </tr>
          </thead>
          <tbody>
            {SECRETS.map((s) => (
              <tr key={s.name}>
                <td>
                  <code>{s.name}</code>
                </td>
                <td>
                  <span className={`a3-store ${s.store.startsWith("GitHub") ? "is-gh" : "is-render"}`}>
                    {s.store}
                  </span>
                </td>
                <td className="cx-muted">{s.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="cx-muted cx-small a3-rule">
          Rule: if a string can open the database or ship the app, it's a secret. Only{" "}
          <code>.env.example</code> with localhost values is committed.
        </p>
      </div>
      <div className="cx-card">
        <p className="cx-kicker">Application security in the MVP</p>
        <ul className="a3-checks">
          {APP_SECURITY.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FeedbackChapter() {
  return (
    <div className="a3-feedback">
      <div className="cx-card a3-table-card">
        <table className="a3-table a3-fb">
          <thead>
            <tr>
              <th>A2 signal</th>
              <th>A3 response</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {FEEDBACK.map((f) => (
              <tr key={f.issue} className={f.status === "open" ? "is-open" : ""}>
                <td>
                  <span className="a3-from">{f.from}</span>
                  {f.issue}
                </td>
                <td>
                  <strong>{f.response}</strong>
                </td>
                <td className="a3-status">
                  <StatusPill status={f.status} />
                  {f.pr && <span className="cx-muted cx-small">PR {f.pr}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cx-card a3-audit">
        <p className="cx-kicker">Audit trail</p>
        <p className="a3-big">{AUDIT.prs}</p>
        <p className="cx-muted cx-small">merged pull requests</p>
        <p className="a3-audit-note">{AUDIT.note}</p>
        <ol className="a3-milestones">
          {AUDIT.milestones.map((m) => (
            <li key={m.pr}>
              <span className="a3-pr">{m.pr}</span> {m.title}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function RoadmapChapter() {
  return (
    <div className="cx-card a3-table-card">
      <table className="a3-table a3-road">
        <thead>
          <tr>
            <th />
            <th>Day One primitive</th>
            <th>We change it when…</th>
            <th>Future scalability vector</th>
          </tr>
        </thead>
        <tbody>
          {ROADMAP.map((r) => (
            <tr key={r.area}>
              <th scope="row">{r.area}</th>
              <td>
                <strong>{r.now}</strong>
              </td>
              <td className="cx-muted">{r.trigger}</td>
              <td>{r.next}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cx-muted cx-small a3-rule">
        Deliberately not built on Day One: multi-region failover, service mesh, object storage. Peak load
        today is one professor and a projector.
      </p>
    </div>
  );
}

function ThanksChapter({ timer }) {
  return (
    <div className="cx-title">
      <h1 className="cx-hero">
        <span className="cx-hero-brand">Thank you :)</span>
      </h1>
      <div className="cx-thanks-actions">
        <button type="button" className="cx-btn cx-btn-primary" onClick={timer.startQA}>
          Start Q&amp;A timer
        </button>
        <a className="cx-btn" href={LIVE_URL} target="_blank" rel="noreferrer">
          Open {LIVE_HOST} ↗
        </a>
      </div>
      <p className="cx-hero-sub cx-thanks-q">Questions?</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
const CHAPTERS = [
  { id: "title", label: "Intro" },
  { id: "promo", label: "Promo video" },
  { id: "evolution", label: "From localhost to live" },
  { id: "architecture", label: "Cloud architecture" },
  { id: "pipeline", label: "Deployment Zen" },
  { id: "security", label: "Security & secrets" },
  { id: "feedback", label: "Feedback → maturation" },
  { id: "roadmap", label: "MVP → future" },
  { id: "thanks", label: "Thank you" },
];

function readHash() {
  const id = window.location.hash.replace("#", "");
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return i === -1 ? 0 : i;
}

export default function DeckA3() {
  const [index, setIndex] = useState(readHash);
  const [health, recheck] = useHealth();
  const timer = usePresenterTimer();
  const chapter = CHAPTERS[index];

  const goIndex = useCallback((i) => {
    const next = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    setIndex(next);
    window.history.replaceState(null, "", `#${CHAPTERS[next].id}`);
  }, []);

  useEffect(() => {
    const onHash = () => setIndex(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Slightly larger type for the projector; restored when leaving the page.
  useEffect(() => {
    const root = document.documentElement;
    const prevTitle = document.title;
    const prevSize = root.style.fontSize;
    document.title = "Kinetic · A3 Cloud Release";
    root.style.fontSize = "112.5%";
    return () => {
      document.title = prevTitle;
      root.style.fontSize = prevSize;
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.("input, textarea, select, video")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goIndex(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goIndex(index - 1);
      } else if (e.key === "t" || e.key === "T") {
        timer.toggle();
      } else if (/^[1-9]$/.test(e.key)) {
        goIndex(Number(e.key) - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goIndex, timer]);

  const body = useMemo(() => {
    switch (chapter.id) {
      case "title":
        return <TitleChapter health={health} recheck={recheck} />;
      case "promo":
        return <PromoChapter />;
      case "evolution":
        return <EvolutionChapter />;
      case "architecture":
        return <ArchitectureChapter health={health} recheck={recheck} />;
      case "pipeline":
        return <PipelineChapter />;
      case "security":
        return <SecurityChapter />;
      case "feedback":
        return <FeedbackChapter />;
      case "roadmap":
        return <RoadmapChapter />;
      default:
        return <ThanksChapter timer={timer} />;
    }
  }, [chapter.id, health, recheck, timer]);

  return (
    <div className="cx-root a3-root">
      <div className="cx-bg" aria-hidden="true">
        <span className="cx-grid" />
      </div>

      <header className="cx-top">
        <div className="cx-brand">
          <span>
            <strong>{TEAM.name}</strong>
            <span className="cx-muted"> · A3 Cloud Release</span>
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
          {!["title", "promo", "architecture", "thanks"].includes(chapter.id) && (
            <h2 className="cx-chapter-title">{chapter.label}</h2>
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
    </div>
  );
}
