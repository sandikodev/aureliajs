/** @jsxImportSource @builder.io/qwik */
import { component$, useSignal, $ } from '@builder.io/qwik';

export interface QwikWidgetProps {
  count?: number;
  label?: string;
  onEvent?: (event: string, payload?: unknown) => void;
}

export default component$((props: QwikWidgetProps) => {
  const localClicks = useSignal(0);

  const handlePing = $(() => {
    localClicks.value += 1;
    props.onEvent?.('qwik:ping', {
      localClicks: localClicks.value,
      sharedCount: props.count ?? 0,
    });
  });

  return (
    <div class="fw-widget fw-qwik" data-testid="qwik-widget">
      <div class="fw-row">
        <span class="fw-pill">Qwik 1.20</span>
        <span class="fw-meta" data-testid="qwik-shared">
          Aurelia count: <strong>{props.count ?? 0}</strong> ({props.label ?? 'Qwik'})
        </span>
      </div>
      <div class="fw-actions">
        <button
          type="button"
          class="fw-btn"
          data-testid="qwik-btn"
          onClick$={handlePing}
        >
          Qwik Signal State: {localClicks.value}
        </button>
      </div>
    </div>
  );
});
