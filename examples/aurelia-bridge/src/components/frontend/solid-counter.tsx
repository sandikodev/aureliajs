/** @jsxImportSource solid-js */
import { Component } from 'solid-js';

export interface SolidCounterProps {
  value: () => number;
  onCounterChange?: (val: number) => void;
}

export const SolidCounter: Component<SolidCounterProps> = (props) => {
  return (
    <div class="island-card solid-card">
      <div class="island-header">
        <span class="island-logo">🔵</span>
        <div>
          <strong class="solid-title">SolidJS Island Component</strong>
          <p class="island-sub">Pure Solid Component (JSX & Fine-grained Signals) di Aurelia</p>
        </div>
      </div>
      <div class="island-controls">
        <span class="island-value solid-val">{props.value()}</span>
        <button
          class="btn-island btn-solid"
          onClick={() => props.onCounterChange?.(props.value() + 1)}
        >
          + Solid Signal
        </button>
        <button
          class="btn-island btn-sub"
          onClick={() => props.onCounterChange?.(props.value() - 1)}
        >
          -
        </button>
        <button
          class="btn-island btn-link-reset"
          onClick={() => props.onCounterChange?.(0)}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
