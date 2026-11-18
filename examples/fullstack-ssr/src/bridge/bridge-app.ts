import { Aurelia } from 'aurelia';
import {
  BridgeConfiguration,
  type HtmxLike,
} from '@aureliajs/bridge';
import { IslandsConfiguration } from '@aureliajs/islands';
import { PricingIsland } from '@components/pricing-island.aux';
import { highlightCode } from './highlighter.js';
import template from './bridge-app.html';

export interface BridgeEventLogEntry {
  id: number;
  framework: string;
  event: string;
  payload: string;
  at: string;
}

export interface FrameworkRecord {
  id: string;
  name: string;
  trigger: string;
  sourceFile: string;
  compiler: string;
  chunkUrl: string;
  rawBytes: number;
  gzipBytes: number;
  sourceCode: string;
  compiledPreview: string;
  sourceHighlighted?: string;
  compiledHighlighted?: string;
}

export interface BridgeManifestData {
  generatedAt?: string;
  islandLoader?: { rawBytes: number; gzipBytes: number; chunkUrl: string };
  bridgeHost?: { rawBytes: number; gzipBytes: number; chunkUrl: string };
  frameworks: FrameworkRecord[];
}

export type BridgeTab = 'all' | 'above' | 'visible' | 'telemetry' | 'diffs';

function formatHtml(raw: string): string {
  if (!raw || raw.startsWith('(') || raw.startsWith('<!--')) return raw;
  let formatted = '';
  let indent = 0;
  const tab = '  ';
  const tokens = raw.replace(/>\s*</g, '><').split(/(?=<)|(?<=>)/);
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + trimmed + '\n';
    } else if (trimmed.startsWith('<') && !trimmed.startsWith('<!') && !trimmed.endsWith('/>')) {
      const isVoid = /^<(input|img|br|hr|meta|link)\b/i.test(trimmed);
      formatted += tab.repeat(indent) + trimmed + '\n';
      if (!isVoid) indent++;
    } else {
      formatted += tab.repeat(indent) + trimmed + '\n';
    }
  }
  return formatted.trim();
}

const importChunk = (url: string) => import(/* @vite-ignore */ url);

export class BridgeShowcaseApp {
  public static readonly $au = {
    type: 'custom-element',
    name: 'bridge-showcase-app',
    dependencies: [PricingIsland],
    template,
  } as const;

  public sharedCount = 3;
  public sharedLabel = 'Enterprise';
  public sharedProps: Record<string, unknown> = {
    count: 3,
    label: 'Enterprise',
  };

  // Idiomatic zero-glue lazy loaders: () => import(...) resolved natively by AuBridge
  public loadReact = () => importChunk('/public/bridge/chunks/react-widget.js');
  public loadVue = () => importChunk('/public/bridge/chunks/vue-widget.js');
  public loadSvelte = () => importChunk('/public/bridge/chunks/svelte-widget.js');
  public loadPreact = () => importChunk('/public/bridge/chunks/preact-widget.js');
  public loadSolid = () => importChunk('/public/bridge/chunks/solid-widget.js');
  public loadQwik = () => importChunk('/public/bridge/chunks/qwik-widget.js');
  public loadLit = () => importChunk('/public/bridge/chunks/lit-widget.js');

  public events: BridgeEventLogEntry[] = [];
  private nextEventId = 1;

  public selectedTab: BridgeTab = 'all';
  public selectedInspectorFw = 'react';
  public currentInspectorRecord?: FrameworkRecord;
  public currentLiveDomHtml = '';
  public currentLiveDomHighlighted = '';
  public isConsoleOpen = false;
  public manifest: BridgeManifestData | null = null;

  public binding(): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('bridge-manifest-data');
      if (el?.textContent) {
        try {
          this.manifest = JSON.parse(el.textContent) as BridgeManifestData;
          this.updateInspectorRecord();
        } catch {
          // ignore error
        }
      }
    }
  }

  public attached(): void {
    this.updateInspectorRecord();
    setTimeout(() => this.refreshLiveDomHtml(), 150);
  }

  public setTab(tab: BridgeTab): void {
    this.selectedTab = tab;
    if (tab === 'diffs') {
      this.updateInspectorRecord();
      setTimeout(() => this.refreshLiveDomHtml(), 50);
    }
  }

  public selectInspector(fwId: string): void {
    this.selectedInspectorFw = fwId;
    this.updateInspectorRecord();
    this.refreshLiveDomHtml();
    setTimeout(() => this.refreshLiveDomHtml(), 60);
  }

  private updateInspectorRecord(): void {
    const list = this.manifest?.frameworks ?? [];
    this.currentInspectorRecord = list.find((f) => f.id === this.selectedInspectorFw) ?? list[0];
  }

  public refreshLiveDomHtml(): void {
    if (typeof document === 'undefined') {
      this.currentLiveDomHtml = '(SSR: No live DOM)';
      this.currentLiveDomHighlighted = '(SSR: No live DOM)';
      return;
    }
    const html = this.getLiveDomHtml(this.selectedInspectorFw);
    this.currentLiveDomHtml = html;
    this.currentLiveDomHighlighted = highlightCode(html, 'markup');
  }

  public getLiveDomHtml(fwId: string): string {
    if (typeof document === 'undefined') return '(SSR: No live DOM)';

    if (fwId === 'aurelia-aux') {
      const auSlot = document.querySelector('[data-testid="aurelia-island-slot"]');
      return auSlot ? formatHtml(auSlot.innerHTML.trim()) : '(Aurelia slot not found)';
    }

    const card = document.querySelector(`[data-testid="card-${fwId}"]`);
    if (!card) return `(Card for ${fwId} not found in DOM)`;

    const mountSlot = card.querySelector('.bridge-mount-slot');
    if (!mountSlot) {
      const htmxOutput = card.querySelector('[data-testid="htmx-output"]');
      if (htmxOutput) return formatHtml(htmxOutput.outerHTML.trim());
      return formatHtml(card.innerHTML.trim());
    }

    const litEl = mountSlot.querySelector('lit-bridge-widget');
    if (litEl) {
      const shadowHtml = (litEl as HTMLElement & { shadowRoot?: ShadowRoot | null }).shadowRoot?.innerHTML?.trim() ?? '';
      const formattedShadow = formatHtml(shadowHtml);
      return `<!-- Host Web Component -->\n<lit-bridge-widget count="${litEl.getAttribute('count') || ''}">\n  #shadow-root (open)\n${formattedShadow.split('\n').map((l) => '    ' + l).join('\n')}\n</lit-bridge-widget>`;
    }

    const anchor = mountSlot.querySelector('[data-au-island-anchor]');
    if (anchor) {
      return `<!-- Standby Hydration Anchor (unhydrated) -->\n${anchor.outerHTML}`;
    }

    const raw = mountSlot.innerHTML.trim();
    return raw ? formatHtml(raw) : '(Empty mount slot)';
  }

  public toggleConsole(): void {
    this.isConsoleOpen = !this.isConsoleOpen;
  }

  public openConsole(): void {
    this.isConsoleOpen = true;
  }

  public clearEvents(): void {
    this.events = [];
  }

  public formatKb(bytes?: number): string {
    if (typeof bytes !== 'number' || isNaN(bytes)) return '0.00 KB';
    return (bytes / 1024).toFixed(2) + ' KB';
  }

  public syncProps(): void {
    this.sharedProps = {
      count: this.sharedCount,
      label: this.sharedLabel,
    };
    if (this.selectedTab === 'diffs') {
      setTimeout(() => this.refreshLiveDomHtml(), 50);
    }
  }

  public increment(): void {
    this.sharedCount += 1;
    this.syncProps();
  }

  public decrement(): void {
    this.sharedCount = Math.max(0, this.sharedCount - 1);
    this.syncProps();
  }

  public reset(): void {
    this.sharedCount = 3;
    this.sharedLabel = 'Enterprise';
    this.events = [];
    this.syncProps();
  }

  private pushEvent(framework: string, event: string, payload?: unknown): void {
    this.events = [
      {
        id: this.nextEventId++,
        framework,
        event,
        payload: JSON.stringify(payload ?? {}),
        at: new Date().toLocaleTimeString(),
      },
      ...this.events,
    ].slice(0, 20);
  }

  public onReactEvent = (event: string, payload?: unknown) => this.pushEvent('react', event, payload);
  public onVueEvent = (event: string, payload?: unknown) => this.pushEvent('vue', event, payload);
  public onSvelteEvent = (event: string, payload?: unknown) => this.pushEvent('svelte', event, payload);
  public onPreactEvent = (event: string, payload?: unknown) => this.pushEvent('preact', event, payload);
  public onSolidEvent = (event: string, payload?: unknown) => this.pushEvent('solid', event, payload);
  public onQwikEvent = (event: string, payload?: unknown) => this.pushEvent('qwik', event, payload);
  public onLitEvent = (event: string, payload?: unknown) => this.pushEvent('lit', event, payload);
}

async function bootstrapBridgeShowcase(): Promise<void> {
  if (typeof document === 'undefined') return;
  const host = document.getElementById('bridge-app-root');
  if (!host) return;

  // Lazy-load HTMX 2 runtime from its chunk for au-htmx DI injection
  const htmxUrl = '/public/bridge/chunks/htmx-runtime.js';
  const htmxMod = (await import(/* @vite-ignore */ htmxUrl)) as { default: HtmxLike };

  const au = new Aurelia();
  au.register(
    IslandsConfiguration,
    BridgeConfiguration.customize({
      htmx: htmxMod.default,
    }),
  );

  await au.app({ host, component: BridgeShowcaseApp }).start();
}

void bootstrapBridgeShowcase();
