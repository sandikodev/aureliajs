/** @jsxImportSource @builder.io/qwik */
import { component$, useSignal, $, type PropFunction } from '@builder.io/qwik';

export interface QwikCounterProps {
  value?: number;
  onChange$?: PropFunction<(val: number) => void>;
  onCounterChange$?: PropFunction<(val: number) => void>;
  onChange?: (val: number) => void;
  onCounterChange?: (val: number) => void;
}

let savedStep = 1;
let savedClicks = 0;

/**
 * Idiomatic Qwik Component (Official Community Best Practice)
 *
 * Demonstrates:
 * 1. Resumable Component: Standard `component$` function boundary.
 * 2. Fine-grained Reactivity: `useSignal()` for localized isolated state (`localStep`, `localClicks`).
 * 3. Lazy Event Listeners: Idiomatic `$(() => ...)` QRL closures passed to `onClick$`.
 * 4. Resumable Meter: Pure signal-driven style reactivity with zero manual DOM querying.
 * 5. Bounded Context: Bi-directional sync with Aurelia host via typed `onChange$` / `onChange`.
 */
export const QwikCounter = component$<QwikCounterProps>((props) => {
  // 1. ISOLATED LOCAL STATE (Qwik Signals)
  const localStep = useSignal(savedStep);
  const localClicks = useSignal(savedClicks);

  const val = props.value ?? 0;
  const percentage = Math.min(Math.max(val * 2, 5), 100);

  const handleIncrement = $(() => {
    localClicks.value++;
    savedClicks = localClicks.value;
    const next = (props.value ?? 0) + localStep.value;
    (props.onChange$ ?? props.onChange ?? props.onCounterChange)?.(next);
  });

  const handleDecrement = $(() => {
    localClicks.value++;
    savedClicks = localClicks.value;
    const next = (props.value ?? 0) - localStep.value;
    (props.onChange$ ?? props.onChange ?? props.onCounterChange)?.(next);
  });

  const handleStepToggle = $(() => {
    localStep.value = localStep.value === 1 ? 5 : localStep.value === 5 ? 10 : 1;
    savedStep = localStep.value;
  });

  const handleReset = $(() => {
    localClicks.value++;
    savedClicks = localClicks.value;
    (props.onChange$ ?? props.onChange ?? props.onCounterChange)?.(0);
  });

  return (
    <div class="framework-card qwik-card">
      <div class="framework-header">
        <span class="framework-logo">⚡</span>
        <div>
          <strong class="qwik-title">Qwik Resumable Component</strong>
          <p class="framework-sub">Official component$(), useSignal() &amp; $(...) QRL Boundaries</p>
        </div>
      </div>

      {/* Scope Breakdown Badges */}
      <div class="scope-pills">
        <span class="pill pill-shared">Shared: {val}</span>
        <span class="pill pill-isolated">Isolated Clicks: {localClicks.value}</span>
        <span class="pill pill-step">Step: &plusmn;{localStep.value}</span>
      </div>

      {/* Local DOM Manipulation: Reactive Qwik Meter */}
      <div class="meter-wrapper">
        <div class="meter-label">
          <span>Qwik Resumable Meter:</span>
          <span>{percentage}%</span>
        </div>
        <div class="meter-track">
          <div
            class="meter-bar qwik-meter-bar"
            style={{
              width: `${percentage}%`,
              filter: `hue-rotate(${val * 16}deg)`,
            }}
          />
        </div>
      </div>

      {/* Controls: Canonical onClick$ closures */}
      <div class="framework-controls">
        <button
          type="button"
          class="btn-framework btn-qwik qwik-inc-btn"
          onClick$={handleIncrement}
        >
          +{localStep.value} Shared
        </button>
        <button
          type="button"
          class="btn-framework btn-sub qwik-dec-btn"
          onClick$={handleDecrement}
        >
          -{localStep.value}
        </button>
        <button
          type="button"
          class="btn-framework btn-isolated"
          onClick$={handleStepToggle}
          title="Toggles local step size exclusively inside Qwik without affecting Aurelia host"
        >
          Step: &plusmn;{localStep.value} (Local)
        </button>
        <button
          type="button"
          class="btn-framework btn-link-reset qwik-reset-btn"
          onClick$={handleReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
});
