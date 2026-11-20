/** @jsxImportSource preact */
import { FunctionalComponent } from 'preact';

export interface PreactCounterProps {
  value: number;
  onCounterChange?: (val: number) => void;
}

export const PreactCounter: FunctionalComponent<PreactCounterProps> = ({
  value,
  onCounterChange
}) => {
  return (
    <div class="framework-card preact-card">
      <div class="framework-header">
        <span class="framework-logo">🟣</span>
        <div>
          <strong class="preact-title">Preact Component</strong>
          <p class="framework-sub">Pure Preact 3kB Functional Component di Aurelia</p>
        </div>
      </div>
      <div class="framework-controls">
        <span class="framework-value preact-val">{value}</span>
        <button
          class="btn-framework btn-preact"
          onClick={() => onCounterChange?.(value + 1)}
        >
          + Preact State
        </button>
        <button
          class="btn-framework btn-sub"
          onClick={() => onCounterChange?.(value - 1)}
        >
          -
        </button>
        <button
          class="btn-framework btn-link-reset"
          onClick={() => onCounterChange?.(0)}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
