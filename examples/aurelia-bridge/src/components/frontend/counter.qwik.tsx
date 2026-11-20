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
            <p class="framework-sub">Pure Qwik Component (.tsx JSX & Resumable) in Aurelia 2</p>
          </div>
        </div>
        <div class="framework-controls">
          <span class="framework-value qwik-val">{props.value}</span>
          <button
            class="btn-framework btn-qwik qwik-inc-btn"
            onClick$={inlinedQrl(() => {
              const host = typeof document !== 'undefined' ? document.querySelector('[data-bridge-framework="qwik"]') : null;
              host?.dispatchEvent(new CustomEvent('bridge-event', {
                bubbles: true,
                composed: true,
                detail: { framework: 'qwik', event: 'change', payload: props.value + 1 },
              }));
            }, 'qwik_inc')}
          >
            + Qwik Action
          </button>
          <button
            class="btn-framework btn-sub qwik-dec-btn"
            onClick$={inlinedQrl(() => {
              const host = typeof document !== 'undefined' ? document.querySelector('[data-bridge-framework="qwik"]') : null;
              host?.dispatchEvent(new CustomEvent('bridge-event', {
                bubbles: true,
                composed: true,
                detail: { framework: 'qwik', event: 'change', payload: props.value - 1 },
              }));
            }, 'qwik_dec')}
          >
            -
          </button>
          <button
            class="btn-framework btn-link-reset qwik-reset-btn"
            onClick$={inlinedQrl(() => {
              const host = typeof document !== 'undefined' ? document.querySelector('[data-bridge-framework="qwik"]') : null;
              host?.dispatchEvent(new CustomEvent('bridge-event', {
                bubbles: true,
                composed: true,
                detail: { framework: 'qwik', event: 'change', payload: 0 },
              }));
            }, 'qwik_reset')}
          >
            Reset
          </button>
        </div>
      </div>
    );
  }, 'QwikCounter_component')
);
