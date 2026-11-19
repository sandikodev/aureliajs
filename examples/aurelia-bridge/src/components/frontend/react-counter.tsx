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
    <div className="island-card react-card">
      <div className="island-header">
        <span className="island-logo">⚛️</span>
        <div>
          <strong className="react-title">React 19 Island Component</strong>
          <p className="island-sub">Pure Component & VDOM Runtime di Aurelia</p>
        </div>
      </div>

      <div className="island-controls">
        <span className="island-value react-val">{value}</span>
        <button className="btn-island btn-react" onClick={inc}>
          + React State
        </button>
        <button className="btn-island btn-sub" onClick={dec}>
          -
        </button>
        <button className="btn-island btn-link-reset" onClick={res}>
          Reset
        </button>
      </div>
    </div>
  );
};
