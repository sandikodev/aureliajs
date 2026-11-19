/** @jsxImportSource @builder.io/qwik */
import { componentQrl, inlinedQrl } from '@builder.io/qwik';

export interface QwikCounterProps {
  value: number;
}

export const QwikCounter = componentQrl<QwikCounterProps>(
  inlinedQrl((props: QwikCounterProps) => {
    return (
      <div class="island-card qwik-card">
        <div class="island-header">
          <span class="island-logo">⚡</span>
          <div>
            <strong class="qwik-title">Qwik Island Component</strong>
            <p class="island-sub">Pure Qwik Component (.tsx JSX & Resumable) di Aurelia</p>
          </div>
        </div>
        <div class="island-controls">
          <span class="island-value qwik-val">{props.value}</span>
          <button class="btn-island btn-qwik qwik-inc-btn">+ Qwik Action</button>
          <button class="btn-island btn-sub qwik-dec-btn">-</button>
          <button class="btn-island btn-link-reset qwik-reset-btn">Reset</button>
        </div>
      </div>
    );
  }, 'QwikCounter_component')
);
