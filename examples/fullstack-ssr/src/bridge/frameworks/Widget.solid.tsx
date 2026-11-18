import { createSignal } from 'solid-js';

export interface SolidWidgetProps {
  count?: number;
  label?: string;
  onEvent?: (event: string, payload?: unknown) => void;
}

export default function SolidWidget(props: SolidWidgetProps) {
  const [localClicks, setLocalClicks] = createSignal(0);

  return (
    <div class="fw-widget fw-solid" data-testid="solid-widget">
      <div class="fw-row">
        <span class="fw-pill">SolidJS 1.9</span>
        <span class="fw-meta" data-testid="solid-shared">
          Aurelia count: <strong>{props.count ?? 0}</strong> ({props.label ?? 'SolidJS 1.9'})
        </span>
      </div>
      <div class="fw-actions">
        <button
          type="button"
          class="fw-btn"
          data-testid="solid-btn"
          onClick={() => {
            const next = localClicks() + 1;
            setLocalClicks(next);
            props.onEvent?.('solid:increment', { localClicks: next, sharedCount: props.count ?? 0 });
          }}
        >
          Solid Signal: {localClicks()}
        </button>
      </div>
    </div>
  );
}
