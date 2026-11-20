/** @jsxImportSource @builder.io/qwik */
import { componentQrl, inlinedQrl } from '@builder.io/qwik';

export interface QwikCounterProps {
  value: number;
}

export const QwikCounter = componentQrl<QwikCounterProps>(
  inlinedQrl((props: QwikCounterProps) => {
    return (
      <div class="framework-card qwik-card">
        <div class="framework-header">
          <span class="framework-logo">⚡</span>
          <div>
            <strong class="qwik-title">Qwik Component</strong>
            <p class="framework-sub">Pure Qwik Component (.tsx JSX & Resumable) di Aurelia</p>
          </div>
        </div>
        <div class="framework-controls">
          <span class="framework-value qwik-val">{props.value}</span>
          <button class="btn-framework btn-qwik qwik-inc-btn">+ Qwik Action</button>
          <button class="btn-framework btn-sub qwik-dec-btn">-</button>
          <button class="btn-framework btn-link-reset qwik-reset-btn">Reset</button>
        </div>
      </div>
    );
  }, 'QwikCounter_component')
);
