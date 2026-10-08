import { useEffect, useState } from "react";

// Root font-size steps (percent). All sizing is in rem, so scaling the root
// scales the whole site.
const STEPS = [87.5, 100, 112.5, 125, 137.5, 150];
const DEFAULT_STEP = 1;
const STORAGE_KEY = "kr_font_step";

function readStoredStep() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw === null ? NaN : Number(raw);
    return Number.isInteger(stored) && stored >= 0 && stored < STEPS.length
      ? stored
      : DEFAULT_STEP;
  } catch {
    return DEFAULT_STEP;
  }
}

export default function FontSizeControl() {
  const [step, setStep] = useState(readStoredStep);

  useEffect(() => {
    document.documentElement.style.fontSize = `${STEPS[step]}%`;
    try {
      localStorage.setItem(STORAGE_KEY, String(step));
    } catch {
      // Storage unavailable; the size still applies for this visit.
    }
  }, [step]);

  return (
    <div className="font-size-control" role="group" aria-label="Text size">
      <button
        type="button"
        className="font-size-btn"
        onClick={() => setStep((s) => Math.max(0, s - 1))}
        disabled={step === 0}
        aria-label="Decrease text size"
        title="Decrease text size"
      >
        −
      </button>
      <button
        type="button"
        className="font-size-btn"
        onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        disabled={step === STEPS.length - 1}
        aria-label="Increase text size"
        title="Increase text size"
      >
        +
      </button>
      <button
        type="button"
        className="font-size-btn"
        onClick={() => setStep(DEFAULT_STEP)}
        disabled={step === DEFAULT_STEP}
        aria-label="Reset text size to default"
        title="Reset text size to default"
      >
        ↺
      </button>
    </div>
  );
}
