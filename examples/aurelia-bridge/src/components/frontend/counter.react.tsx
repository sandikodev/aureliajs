import React, { useState, useRef, useEffect } from 'react';

export interface ReactCounterProps {
  value?: number;
  onChange?: (val: number) => void;
  onCounterChange?: (val: number) => void;
  onEvent?: (event: string, payload?: unknown) => void;
}

/**
 * Idiomatic React 19 Component
 *
 * Demonstrates:
 * 1. Shared State: Listens to `props.value` from Aurelia and emits changes via `props.onChange`.
 * 2. Isolated Internal State: `localStep` and `localClicks` remain strictly private to React.
 * 3. Direct DOM Manipulation: `useRef<HTMLDivElement>` directly updates DOM meter styling on effect.
 */
export const ReactCounter: React.FC<ReactCounterProps> = ({
  value = 0,
  onChange,
  onCounterChange,
  onEvent,
}) => {
  // 1. ISOLATED LOCAL STATE (Private to React component)
  const [localStep, setLocalStep] = useState<number>(1);
  const [localClicks, setLocalClicks] = useState<number>(0);

  // 2. ISOLATED DOM MANIPULATION (Direct React ref manipulation of local DOM nodes)
  const meterBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (meterBarRef.current) {
      const percentage = Math.min(Math.max(value * 2, 5), 100);
      meterBarRef.current.style.width = `${percentage}%`;
      meterBarRef.current.style.filter = `hue-rotate(${value * 10}deg)`;
    }
  }, [value]);

  const notifyChange = (next: number) => {
    setLocalClicks((prev) => prev + 1);
    if (onChange) {
      onChange(next);
    } else if (onCounterChange) {
      onCounterChange(next);
    } else {
      onEvent?.('change', next);
    }
  };

  const cycleLocalStep = () => {
    setLocalStep((prev) => (prev === 1 ? 5 : prev === 5 ? 10 : 1));
  };

  return (
    <div className="framework-card react-card">
      <div className="framework-header">
        <span className="framework-logo">⚛️</span>
        <div>
          <strong className="react-title">React 19 Component</strong>
          <p className="framework-sub">Idiomatic VDOM, Hooks &amp; Local DOM Ref Manipulation</p>
        </div>
      </div>

      {/* Scope Breakdown Badges */}
      <div className="scope-pills">
        <span className="pill pill-shared">Shared: {value}</span>
        <span className="pill pill-isolated">Isolated Clicks: {localClicks}</span>
        <span className="pill pill-step">Step: &plusmn;{localStep}</span>
      </div>

      {/* Local DOM Manipulation: Interactive Ref Meter */}
      <div className="meter-wrapper">
        <div className="meter-label">
          <span>React Local DOM Ref Meter:</span>
          <span>{Math.min(value * 2, 100)}%</span>
        </div>
        <div className="meter-track">
          <div ref={meterBarRef} className="meter-bar react-meter-bar" />
        </div>
      </div>

      {/* Controls: Shared State vs Isolated State Mutation */}
      <div className="framework-controls">
        <button
          type="button"
          className="btn-framework btn-react"
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
          title="Toggles local step size exclusively inside React without affecting Aurelia host"
        >
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
