import { LitElement, css, html } from 'lit';

export class LitBridgeWidget extends LitElement {
  static override properties = {
    count: { type: Number },
    label: { type: String },
    localClicks: { type: Number, state: true },
  };

  static override styles = css`
    :host {
      display: block;
      font-family: inherit;
    }
    .lit-box {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .lit-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .lit-pill {
      display: inline-block;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      background: rgba(50, 79, 255, 0.14);
      color: #324fff;
    }
    .lit-btn {
      align-self: flex-start;
      padding: 0.42rem 0.85rem;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.06);
      color: #f1f5f9;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .lit-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.25);
    }
  `;

  declare count: number;
  declare label: string;
  declare localClicks: number;
  public onEvent?: (event: string, payload?: unknown) => void;

  constructor() {
    super();
    this.count = 0;
    this.label = 'Lit 3 Shadow DOM';
    this.localClicks = 0;
  }

  private handleBump() {
    this.localClicks += 1;
    this.onEvent?.('lit:increment', {
      localClicks: this.localClicks,
      sharedCount: this.count,
    });
  }

  override render() {
    return html`
      <div class="lit-box" data-testid="lit-widget">
        <div class="lit-row">
          <span class="lit-pill">Lit 3 Web Component</span>
          <span data-testid="lit-shared">
            Aurelia count: <strong>${this.count}</strong> (${this.label})
          </span>
        </div>
        <button
          type="button"
          class="lit-btn"
          data-testid="lit-btn"
          @click=${this.handleBump}
        >
          Lit Shadow State: ${this.localClicks}
        </button>
      </div>
    `;
  }
}

export const LIT_WIDGET_TAG = 'lit-bridge-widget';

if (typeof customElements !== 'undefined' && !customElements.get(LIT_WIDGET_TAG)) {
  customElements.define(LIT_WIDGET_TAG, LitBridgeWidget);
}

export default LitBridgeWidget;
