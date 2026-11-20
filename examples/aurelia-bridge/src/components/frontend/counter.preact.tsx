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
    <div class="island-card preact-card">
      <div class="island-header">
        <span class="island-logo">🟣</span>
        <div>
          <strong class="preact-title">Preact Island Component</strong>
          <p class="island-sub">Pure Preact 3kB Functional Component di Aurelia</p>
        </div>
      </div>
      <div class="island-controls">
        <span class="island-value preact-val">{value}</span>
        <button
          class="btn-island btn-preact"
          onClick={() => onCounterChange?.(value + 1)}
        >
          + Preact State
        </button>
        <button
          class="btn-island btn-sub"
          onClick={() => onCounterChange?.(value - 1)}
        >
          -
        </button>
        <button
          class="btn-island btn-link-reset"
          onClick={() => onCounterChange?.(0)}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
