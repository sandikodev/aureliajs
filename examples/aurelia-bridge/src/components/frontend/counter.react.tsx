import type React from 'react';

export interface ReactCounterProps {
  value: number;
  onCounterChange?: (val: number) => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onReset?: () => void;
}

export const ReactCounter: React.FC<ReactCounterProps> = ({
  value,
  onCounterChange,
  onIncrement,
  onDecrement,
  onReset
}) => {
  const inc = () => (onCounterChange ? onCounterChange(value + 1) : onIncrement?.());
  const dec = () => (onCounterChange ? onCounterChange(value - 1) : onDecrement?.());
  const res = () => (onCounterChange ? onCounterChange(0) : onReset?.());

  return (
    <div className="framework-card react-card">
      <div className="framework-header">
        <span className="framework-logo">⚛️</span>
        <div>
          <strong className="react-title">React 19 Component</strong>
          <p className="framework-sub">Pure Component & VDOM Runtime di Aurelia</p>
        </div>
      </div>

      <div className="framework-controls">
        <span className="framework-value react-val">{value}</span>
        <button className="btn-framework btn-react" onClick={inc}>
          + React State
        </button>
        <button className="btn-framework btn-sub" onClick={dec}>
          -
        </button>
        <button className="btn-framework btn-link-reset" onClick={res}>
          Reset
        </button>
      </div>
    </div>
  );
};
