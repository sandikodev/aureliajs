import { useState, useRef, useEffect } from 'preact/hooks';

export interface PreactCounterProps {
  value?: number;
  onChange?: (val: number) => void;
  onCounterChange?: (val: number) => void;
}

/**
 * Idiomatic Preact Component
 *
 * Demonstrates:
 * 1. Shared State: Reacts to `props.value`, forwards mutations via `onChange`.
 * 2. Isolated Internal State: `localStep` and `localClicks` in Preact `useState`.
 * 3. Direct DOM Manipulation: `useRef` directly controls local progress bar styles.
 */
export const PreactCounter = ({
  value = 0,
  onChange,
  onCounterChange,
}: PreactCounterProps) => {
  // 1. ISOLATED LOCAL STATE (Preact Hooks)
  const [localStep, setLocalStep] = useState<number>(1);
  const [localClicks, setLocalClicks] = useState<number>(0);

  // 2. ISOLATED DOM MANIPULATION (Preact DOM Ref)
  const meterBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (meterBarRef.current) {
      const percentage = Math.min(Math.max(value * 2, 5), 100);
      meterBarRef.current.style.width = `${percentage}%`;
      meterBarRef.current.style.filter = `hue-rotate(${value * 20}deg)`;
    }
  }, [value]);

  const notifyChange = (next: number) => {
    setLocalClicks((c) => c + 1);
    if (onChange) {
      onChange(next);
    } else {
      onCounterChange?.(next);
    }
  };

  const cycleLocalStep = () => {
    setLocalStep((s) => (s === 1 ? 5 : s === 5 ? 10 : 1));
  };

  return (
    <div className="framework-card preact-card">
      <div className="framework-header">
        <span className="framework-logo">🟣</span>
        <div>
          <strong className="preact-title">Preact 3kB Component</strong>
          <p className="framework-sub">Lightweight Virtual DOM, Hooks &amp; Direct DOM Refs</p>
        </div>
      </div>

      {/* Scope Breakdown Badges */}
      <div className="scope-pills">
        <span className="pill pill-shared">Shared: {value}</span>
        <span className="pill pill-isolated">Isolated Clicks: {localClicks}</span>
        <span className="pill pill-step">Step: &plusmn;{localStep}</span>
      </div>

      {/* Local DOM Manipulation Indicator */}
      <div className="meter-wrapper">
        <div className="meter-label">
          <span>Preact Local DOM Ref Meter:</span>
          <span>{Math.min(value * 2, 100)}%</span>
        </div>
        <div className="meter-track">
          <div ref={meterBarRef} className="meter-bar preact-meter-bar" />
        </div>
      </div>

      {/* Controls */}
      <div className="framework-controls">
        <button
          type="button"
          className="btn-framework btn-preact"
          onClick={() => notifyChange(value + localStep)}
        >
          +{localStep} Shared
        </button>
        <button
          type="button"
          className="btn-framework btn-sub"
          onClick={() => notifyChange(value - localStep)}
        >
          -{localStep}
        </button>
        <button 
          type="button"
          className="btn-framework btn-isolated" 
          onClick={cycleLocalStep}
          title="Toggles local step size exclusively inside Preact without affecting Aurelia host">
          Step: &plusmn;{localStep} (Local)
        </button>
        <button
          type="button"
          className="btn-framework btn-link-reset"
          onClick={() => notifyChange(0)}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
