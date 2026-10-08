// Content for the A3 deck (/presentation_a3): Cloud Architecture & Deployment.
// Source of truth: .github/workflows/deploy.yml, render.yaml, frontend/vercel.json,
// backend/src (auth, db, index) and the PR history of this repo.

export const LIVE_URL = "https://kinetic-randomizer.vercel.app";
export const LIVE_HOST = "kinetic-randomizer.vercel.app";

export const TEAM = {
  name: "Kinetic",
  product: "Hosted Randomizer",
  members: [
    { name: "Azaria Kelman", role: "Frontend", photo: "/presentation/azaria.jpg" },
    { name: "Richard Xu", role: "Backend", photo: "/presentation/richard.jpg" },
  ],
};

// Promo video: drop the exported file at frontend/public/presentation_a3/promo.mp4.
export const PROMO_SRC = "/presentation_a3/promo.mp4";
export const PROMO_POSTER = "/presentation_a3/promo-poster.jpg";

// Slide 3: what changed between the A2 local sandbox and the A3 cloud release.
export const EVOLUTION = [
  { area: "Runs on", before: "Our laptop", after: "Vercel + Render" },
  { area: "Access", before: "One machine", after: "Public URL" },
  { area: "Data", before: "SQLite file", after: "Managed Postgres" },
  { area: "Sign-in", before: "Any name", after: "Password + JWT" },
  { area: "Shipping", before: "npm run dev", after: "Tag → auto‑deploy" },
  { area: "Secrets", before: "Local .env", after: "Cloud env vars" },
];

// Critical user journey the architecture serves (unchanged from A2, now live).

// Slide 4: clickable topology. `plane` drives the data / control highlight.
export const NODES = {
  user: {
    plane: "data",
    label: "Instructor",
    tech: "Browser",
    what: "HTTPS + JWT per request",
    why: "No install, just a URL",
    limit: "Token in localStorage",
  },
  spa: {
    plane: "data",
    label: "Web app",
    tech: "React · Vite on Vercel",
    logos: ["vercel", "react"],
    what: "Static build on CDN",
    why: "No server to run",
    limit: "Ships only on tags",
  },
  api: {
    plane: "data",
    label: "REST API",
    tech: "Express 5 · Node 22 on Render",
    logos: ["render", "express"],
    what: "Auth-guarded Express routes",
    why: "Persistent Node beside Postgres",
    limit: "Sleeps when idle",
  },
  db: {
    plane: "data",
    label: "Database",
    tech: "PostgreSQL on Render",
    logos: ["postgresql"],
    what: "Rows scoped per instructor",
    why: "Survives refresh and redeploy",
    limit: "Private, no backups yet",
  },
  repo: {
    plane: "control",
    label: "Release tag",
    tech: "git tag v*",
    logos: ["github"],
    what: "Tag ships to production",
    why: "One auditable release event",
    limit: "Manual re-run available",
  },
  actions: {
    plane: "control",
    label: "Deploy workflow",
    tech: "GitHub Actions",
    logos: ["githubactions"],
    what: "Verify → backend → frontend",
    why: "Failed step stops release",
    limit: "No staging yet",
  },
  secrets: {
    plane: "control",
    label: "Secrets",
    tech: "GitHub env + Render env",
    what: "GitHub + Render env vars",
    why: "Deploy can't read data",
    limit: "Nothing secret in git",
  },
};

// Slide 5: why this environment. `x` is the spelled-out acronym, shown small
// so the presenter knows what to say.
export const CLOUD_CHOICE = [
  {
    provider: "Vercel",
    logo: "vercel",
    hosts: "Web app",
    points: [
      { t: "Global CDN", x: "Content Delivery Network" },
      { t: "Free TLS", x: "Transport Layer Security, the S in HTTPS" },
      { t: "Zero-config Vite builds" },
      { t: "Generous free tier" },
    ],
  },
  {
    provider: "Render",
    logo: "render",
    hosts: "API + Postgres",
    hostsX: "Application Programming Interface + PostgreSQL database",
    points: [
      { t: "Long-running Node process" },
      { t: "Private network to the database" },
      { t: "Infra as code: render.yaml" },
    ],
  },
];

export const CLOUD_NOTES = [
  { k: "Trade-off", v: "Free tier sleeps when idle" },
  { k: "Trade-off at scale", v: "Vercel costs more than AWS or Cloudflare once traffic grows" },
  {
    k: "vs. AWS / GCP",
    x: "Amazon Web Services / Google Cloud Platform",
    v: "Same building blocks, far less setup for a two-person sprint",
  },
];

// Slide 6: the real deploy.yml, stage by stage.
export const PIPELINE = [
  { id: "trigger", title: "Tag", line: "git tag v1.0.0" },
  { id: "verify", title: "Verify", line: "lint · build" },
  { id: "backend", title: "Backend", line: "Render · /healthz" },
  { id: "frontend", title: "Frontend", line: "Vercel · prod" },
];

export const GUARDRAILS = [
  "Fails closed",
  "One deploy at a time",
  "Read-only repo token",
  "Backend ships before UI",
];

// Slide 7: where each credential lives.
export const SECRET_STORES = [
  {
    store: "GitHub · production env",
    kind: "gh",
    role: "Can deploy, can't read data",
    items: [
      { name: "RENDER_API_KEY" },
      { name: "RENDER_SERVICE_ID" },
      { name: "VERCEL_TOKEN" },
      { name: "VERCEL_ORG_ID" },
      { name: "VERCEL_PROJECT_ID" },
    ],
  },
  {
    store: "Render runtime",
    kind: "render",
    role: "Can read data, can't deploy",
    items: [
      { name: "DATABASE_URL", note: "auto-wired" },
      { name: "JWT_SECRET", note: "auto-generated" },
    ],
  },
];

export const SECRET_FACTS = [
  { k: "In git", v: ".env.example only" },
  { k: "If leaked", v: "Revoke → regenerate → re-tag" },
];

// Slide 8: A2 feedback → what A3 did about it. status: shipped | open
export const FEEDBACK = [
  { issue: "Demo only ran on our laptop", response: "Public URL", status: "shipped" },
  { issue: "Data didn't survive a new machine", response: "Managed Postgres", status: "shipped" },
  { issue: "Anyone could sign in as anyone", response: "Real accounts", status: "shipped" },
  { issue: "Scope creep", response: "Cut to the core loop", status: "shipped" },
  { issue: "Delete is instant", response: "Confirm dialog", status: "open" },
  { issue: "Timer waits for Start", response: "Auto-start", status: "open" },
];

export const AUDIT = { prs: 19 };

// Slide 9: Day One primitive → what would make us change it → the future vector.
// `why` is the one-line justification shown under the future vector.
export const ROADMAP = [
  { area: "Compute", now: "Free tier", trigger: "Cold starts", next: "Always-on", why: "No wake-up delay when class starts" },
  { area: "Data", now: "Free Postgres", trigger: "Semester of data", next: "Backups", why: "Can't lose a term's groups" },
  { area: "Identity", now: "JWT login", trigger: "Dept. adoption", next: "UofT SSO", why: "Profs already have a UTORid" },
  { area: "Real-time", now: "One browser", trigger: "Many screens", next: "WebSockets", why: "Timer stays in sync everywhere" },
];
