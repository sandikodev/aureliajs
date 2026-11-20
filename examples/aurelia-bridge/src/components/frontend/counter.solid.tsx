/** @jsxImportSource solid-js */
import { Component } from 'solid-js';

export interface SolidCounterProps {
  value: number | (() => number);
  onCounterChange?: (val: number) => void;
  onChange?: (val: number) => void;
}

export const SolidCounter: Component<SolidCounterProps> = (props) => {
  const currentVal = () => (typeof props.value === 'function' ? props.value() : (props.value ?? 0));
  const notifyChange = (next: number) => {
    props.onCounterChange?.(next);
    props.onChange?.(next);
  };

  return (
    <div class="framework-card solid-card">
      <div class="framework-header">
        <span class="framework-logo">🔵</span>
        <div>
          <strong class="solid-title">SolidJS Component</strong>
          <p class="framework-sub">Pure Solid Component (JSX & Fine-grained Signals) in Aurelia 2</p>
        </div>
      </div>
      <div class="framework-controls">
        <span class="framework-value solid-val">{currentVal()}</span>
        <button
          class="btn-framework btn-solid"
          onClick={() => notifyChange(currentVal() + 1)}
        >
          + Solid Signal
        </button>
        <button
          class="btn-framework btn-sub"
          onClick={() => notifyChange(currentVal() - 1)}
        >
          -
        </button>
        <button
          class="btn-framework btn-link-reset"
          onClick={() => notifyChange(0)}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
