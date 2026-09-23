# Kinetic Randomizer — Frontend

React + Vite MVP for the Classroom Presentation Randomizer. No backend yet —
all state (groups, presentation order) lives in local state / localStorage.
See [issue #1](https://github.com/dcsil/Kinetic-Randomizer/issues/1) for the
planned Express backend.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

## Pages

- `/` — login (local only, no real auth yet)
- `/dashboard` — groups list, add/edit/delete
- `/randomizer` — mark groups ready/not ready, generate presentation order
- `/live` — minimalist live view: current group + dual-phase timer (5 min
  presentation with a 2-minute warning, then a 3-minute Q&A countdown)
