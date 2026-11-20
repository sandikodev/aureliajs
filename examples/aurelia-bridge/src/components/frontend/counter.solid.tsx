/** @jsxImportSource solid-js */
import { Component } from 'solid-js';

export interface SolidCounterProps {
  value: () => number;
  onCounterChange?: (val: number) => void;
}

export const SolidCounter: Component<SolidCounterProps> = (props) => {
  return (
    <div class="framework-card solid-card">
      <div class="framework-header">
        <span class="framework-logo">🔵</span>
        <div>
          <strong class="solid-title">SolidJS Component</strong>
          <p class="framework-sub">Pure Solid Component (JSX & Fine-grained Signals) di Aurelia</p>
        </div>
      </div>
      <div class="framework-controls">
        <span class="framework-value solid-val">{props.value()}</span>
        <button
          class="btn-framework btn-solid"
          onClick={() => props.onCounterChange?.(props.value() + 1)}
        >
          + Solid Signal
        </button>
        <button
          class="btn-framework btn-sub"
          onClick={() => props.onCounterChange?.(props.value() - 1)}
        >
          -
        </button>
        <button
          class="btn-framework btn-link-reset"
          onClick={() => props.onCounterChange?.(0)}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
