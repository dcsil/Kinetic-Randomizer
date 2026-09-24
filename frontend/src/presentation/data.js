// Content for the Interactive CUJ Explorer (/presentation).
// Source of truth: rapid-mvp/cuj/framework.md in the A2 release repo, plus the
// code repo's PR and issue history.

const IMG = "/presentation";

export const TEAM = {
  name: "Kinetic",
  product: "Presentation Randomizer",
  members: [
    { name: "Azaria Kelman", role: "Frontend", photo: `${IMG}/azaria.jpg` },
    { name: "Richard Xu", role: "Backend", photo: `${IMG}/richard.jpg` },
  ],
};

// From framework.md: persona and value-driven goal.
export const PERSONA = {
  title: "Professor running a presentation block",
  summary: "7 groups presenting in one class block, on a laptop at the front of the room.",
  goal: "Randomly order the teams, track presentation + Q&A time, and keep the session moving, without looking anything up.",
  stories: [
    "As a Professor, when I want to oversee course presentations, I want to randomly select groups so I can ensure a fair selection process.",
    "As a Student, when I'm presenting, I want to know when there are 2 minutes left so I can wrap up without being cut off.",
  ],
};

// severity: "smooth" (no friction) | "moderate" | "severe"
export const STEPS = [
  {
    id: 1,
    title: "Sign in",
    action: "Type a name, sign in.",
    seconds: 10,
    severity: "smooth",
    contextSwitch: null,
    evidence: [{ src: `${IMG}/01-login.jpg`, caption: "Login" }],
    demo: "login",
  },
  {
    id: 2,
    title: "Select classroom",
    action: "Open the class's classroom card.",
    // Not in the original audit (classrooms came later) — placeholder, re-time.
    seconds: 5,
    severity: "smooth",
    contextSwitch: null,
    evidence: [],
    demo: "classrooms",
  },
  {
    id: 3,
    title: "Switch to Randomizer",
    action: "Readiness badge isn't clickable — leave the dashboard to flip it.",
    seconds: 10,
    severity: "moderate",
    switchType: "page",
    contextSwitch: "Groups → Randomizer for one flag.",
    evidence: [{ src: `${IMG}/02-dashboard.jpg`, caption: "Badge is display-only" }],
    demo: "groups",
  },
  {
    id: 4,
    title: "Randomize",
    action: "Uncheck the not-ready group, click Randomize.",
    seconds: 10,
    severity: "smooth",
    contextSwitch: null,
    evidence: [{ src: `${IMG}/03-randomizer-order.jpg`, caption: "Not-ready groups go last" }],
    demo: "randomizer",
  },
  {
    id: 5,
    title: "Start presentations",
    action: "Click Start presentations.",
    seconds: 2,
    severity: "smooth",
    contextSwitch: null,
    evidence: [],
    demo: "live",
  },
  {
    id: 6,
    title: "Timer sits idle",
    action: "Live view loads, timer isn't running.",
    seconds: 5,
    severity: "moderate",
    findingId: "timer",
    switchType: "mental",
    contextSwitch: "Group is talking, clock isn't.",
    evidence: [{ src: `${IMG}/04-live-presenting.jpg`, caption: "Live view at audit time" }],
    demo: "live",
  },
  {
    id: 7,
    title: "Click Start",
    action: "Remember to click Start.",
    seconds: 2,
    severity: "moderate",
    findingId: "timer",
    contextSwitch: null,
    evidence: [],
    demo: "live",
  },
  {
    id: 8,
    title: "Accidental delete",
    action: "Misclick Delete — group gone instantly.",
    seconds: 2,
    severity: "severe",
    findingId: "delete",
    switchType: "recovery",
    contextSwitch: "Re-create the group and its members.",
    evidence: [
      { src: `${IMG}/05-dashboard-before-delete.jpg`, caption: "Before" },
      { src: `${IMG}/06-dashboard-after-delete.jpg`, caption: "After — no confirm" },
    ],
    demo: "groups",
  },
];

export const FINDINGS = [
  {
    id: "order",
    severity: "great",
    title: "Not-ready groups can be placed last",
    steps: [4],
  },
  {
    id: "textsize",
    severity: "great",
    title: "Text can be resized so it's easy for everyone to see",
    steps: [],
  },
  {
    id: "clicks",
    severity: "moderate",
    title: "Too many clicks before presentation",
    steps: [1, 2, 3, 4, 5, 7],
    timeLost: "Setup time before every session",
    rootCause: "Sign-in, classroom, Randomizer and live view are separate screens with no shortcut.",
    recommendation: "Have a quick start that auto-starts the presentations for CSC491.",
    rec: 1,
  },
  {
    id: "timer",
    severity: "moderate",
    title: "Timer doesn't auto-start",
    steps: [6, 7],
    timeLost: "First seconds of each talk",
    rootCause: "Live view starts with running = false.",
    recommendation: "Make Start impossible to miss (pulse, or start on any key).",
  },
  {
    id: "delete",
    severity: "severe",
    title: "Deleting groups & removing students is permanent",
    steps: [8],
    timeLost: "Re-entering the group mid-class",
    rootCause: "Delete calls DELETE /groups/:id directly, and Save PUTs the new member list — both hard writes, no undo.",
    recommendation: "Confirm before deleting groups or removing students. Stretch: undo toast.",
    rec: 2,
  },
];

export const PRO_TIPS = [
  "Set readiness on the Randomizer page.",
  "No undo on Delete.",
  "Press Start when the group begins.",
  "Use the Order panel to jump or reorder live.",
];

export const ARCHITECTURE = [
  {
    id: "fe",
    label: "Frontend",
    logos: ["react"],
    tech: "React · Vite",
    port: ":5173",
  },
  {
    id: "api",
    label: "REST API",
    logos: ["express"],
    tech: "Express",
    port: ":3000",
  },
  {
    id: "db",
    label: "Database",
    logos: ["sqlite"],
    tech: "SQLite",
    port: "data.sqlite",
  },
];

// Local-only trade-offs shown on the MVP slide: "pro" is tinted green, "con" red.
export const TRADEOFFS = [
  { tone: "pro", text: "Local: no dealing with the cloud." },
  { tone: "con", text: "Can't share work since it only runs on this machine." },
  { tone: "con", text: "Requires local setup to install and run both servers." },
  { tone: "con", text: "Local auth: name-only sign-in, no SSO." },
  { tone: "con", text: "No hosted database, so data isn't stored anywhere beyond this laptop." },
  { tone: "pro", text: "Makes for an easy development process to iterate quickly." },
];

export const ENDPOINTS = [
  { method: "GET", path: "/api/classrooms" },
  { method: "GET", path: "/api/students" },
  { method: "GET", path: "/api/classrooms/:id/groups" },
  { method: "GET", path: "/api/classrooms/:id/presentation/current" },
];

export const REFLECTION = [
  {
    principle: "Conflict",
    held: "Clean FE/BE split — little to disagree on.",
    honest: "Our conflict process was never tested.",
  },
  {
    principle: "Accountability",
    held: "Clear owners. Everything shipped on time.",
    honest: "Separate halves meant less cross-review.",
  },
  {
    principle: "Feedback",
    held: "Direct, kind, never defensive.",
    honest: "We worked better in person than on Slack. Next: in-person work blocks.",
  },
];

export const LESSONS = [
  { title: "Timing kills the happy path", body: "A stopwatch won't let you skip the awkward step." },
  { title: "In person > Slack", body: "We moved faster working side by side than async." },
];
