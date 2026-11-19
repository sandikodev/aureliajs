/** @jsxImportSource react */
import { useState } from 'react';

export interface BridgeWidgetProps {
  count?: number;
  label?: string;
  onEvent?: (event: string, payload?: unknown) => void;
}

export default function ReactWidget({
  count = 0,
  label = 'React 19',
  onEvent,
}: BridgeWidgetProps) {
  const [localClicks, setLocalClicks] = useState(0);

  return (
    <div className="fw-widget fw-react" data-testid="react-widget">
      <div className="fw-row">
        <span className="fw-pill">React 19.3</span>
        <span className="fw-meta" data-testid="react-shared">
          Aurelia count: <strong>{count}</strong> ({label})
        </span>
      </div>
      <div className="fw-actions">
        <button
          type="button"
          className="fw-btn"
          data-testid="react-btn"
          onClick={() => {
            const next = localClicks + 1;
            setLocalClicks(next);
            onEvent?.('react:increment', { localClicks: next, sharedCount: count });
          }}
        >
          React Local State: {localClicks}
        </button>
      </div>
    </div>
  );
}
