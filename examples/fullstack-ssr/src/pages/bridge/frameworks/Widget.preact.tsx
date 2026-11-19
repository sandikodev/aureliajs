/** @jsxImportSource preact */
import { useState } from 'preact/hooks';

export interface PreactWidgetProps {
  count?: number;
  label?: string;
  onEvent?: (event: string, payload?: unknown) => void;
}

export default function PreactWidget({
  count = 0,
  label = 'Preact 11',
  onEvent,
}: PreactWidgetProps) {
  const [localClicks, setLocalClicks] = useState(0);

  return (
    <div class="fw-widget fw-preact" data-testid="preact-widget">
      <div class="fw-row">
        <span class="fw-pill">Preact 11</span>
        <span class="fw-meta" data-testid="preact-shared">
          Aurelia count: <strong>{count}</strong> ({label})
        </span>
      </div>
      <div class="fw-actions">
        <button
          type="button"
          class="fw-btn"
          data-testid="preact-btn"
          onClick={() => {
            const next = localClicks + 1;
            setLocalClicks(next);
            onEvent?.('preact:increment', { localClicks: next, sharedCount: count });
          }}
        >
          Preact Hook State: {localClicks}
        </button>
      </div>
    </div>
  );
}
