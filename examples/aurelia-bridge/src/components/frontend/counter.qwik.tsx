/** @jsxImportSource @builder.io/qwik */
import { componentQrl, inlinedQrl, useSignal } from '@builder.io/qwik';

export interface QwikCounterProps {
  value?: number;
  onChange?: (val: number) => void;
  onCounterChange?: (val: number) => void;
  onChange$?: (val: number) => void;
}

let savedStep = 1;
let savedClicks = 0;

/**
 * Idiomatic Qwik Component
 *
 * Demonstrates:
 * 1. Shared State: Reacts to `props.value`, forwards mutations via `onChange$`.
 * 2. Isolated Internal State: `localStep` and `localClicks` via Qwik `useSignal()`.
 * 3. Direct DOM Manipulation: Resumable signal-driven meter bar styling without global DOM querying.
 */
export const QwikCounter = componentQrl<QwikCounterProps>(
  inlinedQrl((props: QwikCounterProps) => {
    // 1. ISOLATED LOCAL STATE (Qwik Signals)
    const localStep = useSignal(savedStep);
    const localClicks = useSignal(savedClicks);

    const val = props.value ?? 0;
    const percentage = Math.min(Math.max(val * 2, 5), 100);

    return (
      <div class="framework-card qwik-card">
        <div class="framework-header">
          <span class="framework-logo">⚡</span>
          <div>
            <strong class="qwik-title">Qwik Resumable Component</strong>
            <p class="framework-sub">Serializable QRL Boundaries, useSignal &amp; Zero Manual DOM Querying</p>
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

        {/* Controls */}
        <div class="framework-controls">
          <button
            type="button"
            class="btn-framework btn-qwik qwik-inc-btn"
            onClick$={inlinedQrl(() => {
              localClicks.value++;
              savedClicks = localClicks.value;
              const next = (props.value ?? 0) + localStep.value;
              (props.onChange$ ?? props.onChange ?? props.onCounterChange)?.(next);
            }, 'qwik_inc')}
          >
            +{localStep.value} Shared
          </button>
          <button
            type="button"
            class="btn-framework btn-sub qwik-dec-btn"
            onClick$={inlinedQrl(() => {
              localClicks.value++;
              savedClicks = localClicks.value;
              const next = (props.value ?? 0) - localStep.value;
              (props.onChange$ ?? props.onChange ?? props.onCounterChange)?.(next);
            }, 'qwik_dec')}
          >
            -{localStep.value}
          </button>
          <button
            type="button"
            class="btn-framework btn-isolated"
            onClick$={inlinedQrl(() => {
              localStep.value = localStep.value === 1 ? 5 : localStep.value === 5 ? 10 : 1;
              savedStep = localStep.value;
            }, 'qwik_step')}
            title="Toggles local step size exclusively inside Qwik without affecting Aurelia host"
          >
            Step: &plusmn;{localStep.value} (Local)
          </button>
          <button
            type="button"
            class="btn-framework btn-link-reset qwik-reset-btn"
            onClick$={inlinedQrl(() => {
              localClicks.value++;
              savedClicks = localClicks.value;
              (props.onChange$ ?? props.onChange ?? props.onCounterChange)?.(0);
            }, 'qwik_reset')}
          >
            Reset
          </button>
        </div>
      </div>
    );
  }, 'QwikCounter_component')
);
