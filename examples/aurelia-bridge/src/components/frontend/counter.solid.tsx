/** @jsxImportSource solid-js */
import { Component, createSignal, createEffect } from 'solid-js';

export interface SolidCounterProps {
  value: number | (() => number);
  onChange?: (val: number) => void;
  onCounterChange?: (val: number) => void;
}

/**
 * Idiomatic SolidJS Component
 *
 * Demonstrates:
 * 1. Shared State: Reacts to `props.value` via reactive getter, notifies host via `props.onChange`.
 * 2. Isolated Internal State: `localStep` and `localClicks` signals are purely local to Solid.
 * 3. Direct DOM Manipulation: Direct DOM element ref and fine-grained `createEffect` styling.
 */
export const SolidCounter: Component<SolidCounterProps> = (props) => {
  const currentVal = () => (typeof props.value === 'function' ? props.value() : (props.value ?? 0));

  // 1. ISOLATED LOCAL STATE (Solid Fine-Grained Signals)
  const [localStep, setLocalStep] = createSignal<number>(1);
  const [localClicks, setLocalClicks] = createSignal<number>(0);

  // 2. ISOLATED DOM MANIPULATION (Direct DOM Ref Callback)
  let meterBarEl: HTMLDivElement | null = null;

  createEffect(() => {
    const val = currentVal();
    if (meterBarEl) {
      const percentage = Math.min(Math.max(val * 2, 5), 100);
      meterBarEl.style.width = `${percentage}%`;
      meterBarEl.style.filter = `hue-rotate(${val * 8}deg)`;
    }
  });

  const notifyChange = (next: number) => {
    setLocalClicks((c) => c + 1);
    props.onChange?.(next);
    props.onCounterChange?.(next);
  };

  const cycleLocalStep = () => {
    setLocalStep((s) => (s === 1 ? 5 : s === 5 ? 10 : 1));
  };

  return (
    <div class="framework-card solid-card">
      <div class="framework-header">
        <span class="framework-logo">🔵</span>
        <div>
          <strong class="solid-title">SolidJS Component</strong>
          <p class="framework-sub">Fine-Grained Signals, createEffect &amp; Direct DOM Refs</p>
        </div>
      </div>

      {/* Scope Breakdown Badges */}
      <div class="scope-pills">
        <span class="pill pill-shared">Shared: {currentVal()}</span>
        <span class="pill pill-isolated">Isolated Clicks: {localClicks()}</span>
        <span class="pill pill-step">Step: &plusmn;{localStep()}</span>
      </div>

      {/* Local DOM Manipulation Indicator */}
      <div class="meter-wrapper">
        <div class="meter-label">
          <span>SolidJS Local Signal Meter:</span>
          <span>{Math.min(currentVal() * 2, 100)}%</span>
        </div>
        <div class="meter-track">
          <div ref={(el) => (meterBarEl = el)} class="meter-bar solid-meter-bar" />
        </div>
      </div>

      {/* Controls */}
      <div class="framework-controls">
        <button
          type="button"
          class="btn-framework btn-solid"
          onClick={() => notifyChange(currentVal() + localStep())}
        >
          +{localStep()} Shared
        </button>
        <button
          type="button"
          class="btn-framework btn-sub"
          onClick={() => notifyChange(currentVal() - localStep())}
        >
          -{localStep()}
        </button>
        <button 
          type="button"
          class="btn-framework btn-isolated" 
          onClick={cycleLocalStep}
          title="Toggles local step size exclusively inside SolidJS without affecting Aurelia host">
          Step: &plusmn;{localStep()} (Local)
        </button>
        <button type="button" class="btn-framework btn-link-reset" onClick={() => notifyChange(0)}>
          Reset
        </button>
      </div>
    </div>
  );
};
