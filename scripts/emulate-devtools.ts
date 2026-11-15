import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { JSDOM } from '../node_modules/.pnpm/jsdom@23.2.0/node_modules/jsdom/lib/api.js';
import { BrowserPlatform } from '../node_modules/.pnpm/@aurelia+platform-browser@2.0.0-rc.2/node_modules/@aurelia/platform-browser/dist/esm/index.mjs';
import { DI, Registration } from '../apps/web/node_modules/@aurelia/kernel/dist/esm/index.mjs';
import { runTasks } from '../node_modules/.pnpm/@aurelia+runtime@2.0.0-rc.2/node_modules/@aurelia/runtime/dist/esm/index.mjs';
import {
  Aurelia,
  BindingMode,
  CustomElement,
  IPlatform,
  StandardConfiguration,
} from '../apps/web/node_modules/@aurelia/runtime-html/dist/esm/index.mjs';
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js';
import { auxPlugin } from '../packages/vite-plugin-aux/dist/index.js';

interface ModuleRow {
  url: string;
  kind: 'TS' | 'HTML' | 'AUX SFC';
  status: string;
  bytes: number;
  ms: number;
  pipeline: string;
}

interface ConsoleRecord {
  level: 'log' | 'warn' | 'error';
  message: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

async function runEmulation(): Promise<void> {
  const consoleRecords: ConsoleRecord[] = [];
  const origWarn = console.warn;
  const origError = console.error;

  console.warn = (...args: unknown[]) => {
    consoleRecords.push({ level: 'warn', message: args.map(String).join(' ') });
  };
  console.error = (...args: unknown[]) => {
    consoleRecords.push({ level: 'error', message: args.map(String).join(' ') });
  };

  console.log('==========================================================================================');
  console.log('  AURELIA 2 + AUX SFC — TERMINAL DEVTOOLS & RUNTIME EMULATOR');
  console.log('==========================================================================================\n');

  // -------------------------------------------------------------------------
  // PANEL 1: Vite Module Graph & Waterfall Inspector
  // -------------------------------------------------------------------------
  console.log('[PANEL 1: VITE MODULE GRAPH & WATERFALL INSPECTOR (DEV TRANSFORM PIPELINE)]');
  const webRoot = path.resolve(import.meta.dirname, '../apps/web');
  process.chdir(webRoot);
  const server = await createServer({
    root: webRoot,
    configFile: path.join(webRoot, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  const targetUrls = [
    '/src/main.ts',
    '/src/app.ts',
    '/src/app.html?import',
    '/src/config/routes.ts',
    '/src/pages/overview-page.ts',
    '/src/pages/overview-page.html?import',
    '/src/pages/projects-page.ts',
    '/src/pages/projects-page.html?import',
    '/src/pages/members-page.ts',
    '/src/pages/billing-page.ts',
    '/src/pages/settings-page.ts',
    '/src/ui/index.ts',
    ...fs
      .readdirSync(path.join(webRoot, 'src/ui'))
      .filter((f) => f.endsWith('.aux'))
      .sort()
      .map((f) => `/src/ui/${f}`),
  ];

  const rows: ModuleRow[] = [];
  for (const url of targetUrls) {
    const t0 = performance.now();
    const res = await server.transformRequest(url);
    const ms = performance.now() - t0;
    const code = res?.code ?? '';
    const kind: ModuleRow['kind'] = url.endsWith('.aux')
      ? 'AUX SFC'
      : url.includes('.html')
        ? 'HTML'
        : 'TS';
    const pipeline = code.includes('_apply_decs_2311')
      ? 'SWC 2023-11 + Oxc'
      : code.includes('CustomElement')
        ? 'Aurelia + Oxc'
        : 'Oxc Native';
    rows.push({
      url,
      kind,
      status: res ? '200 OK' : '500 ERR',
      bytes: Buffer.byteLength(code, 'utf-8'),
      ms,
      pipeline,
    });
  }
  await server.close();

  console.log(
    `${pad('Module URL', 38)} | ${pad('Type', 8)} | ${pad('Status', 7)} | ${pad('Size', 10)} | ${pad('Time', 8)} | Pipeline`,
  );
  console.log('-'.repeat(100));
  for (const r of rows) {
    console.log(
      `${pad(r.url, 38)} | ${pad(r.kind, 8)} | ${pad(r.status, 7)} | ${pad(formatBytes(r.bytes), 10)} | ${pad(`${r.ms.toFixed(1)}ms`, 8)} | ${r.pipeline}`,
    );
  }
  const totalBytes = rows.reduce((acc, r) => acc + r.bytes, 0);
  console.log('-'.repeat(100));
  console.log(`Total inspected modules: ${rows.length} | Combined transformed source size: ${formatBytes(totalBytes)}\n`);

  // -------------------------------------------------------------------------
  // PANEL 2: Aurelia 2 Runtime DI & CustomElement Registry Verifier
  // -------------------------------------------------------------------------
  console.log('[PANEL 2: AURELIA 2 RUNTIME DI & AUX CUSTOM ELEMENT REGISTRY]');
  const plugin = auxPlugin();
  const resolveId = plugin.resolveId as (id: string) => string | null;
  const transform = plugin.transform as (
    code: string,
    id: string,
  ) => Promise<{ code: string; map: unknown } | null>;

  const helperPath = resolveId.call({}, '@swc/helpers/_/_apply_decs_2311')!;
  const aureliaUrl = path.resolve(webRoot, 'node_modules/aurelia/dist/esm/index.mjs');
  const cvaUrl = path.resolve(
    import.meta.dirname,
    '../node_modules/.pnpm/class-variance-authority@0.7.1/node_modules/class-variance-authority/dist/index.mjs',
  );
  const utilsUrl = path.resolve(webRoot, 'src/lib/utils.ts');
  const iconsUrl = path.resolve(webRoot, 'src/lib/icons.ts');
  const toastUrl = path.resolve(webRoot, 'src/services/toast.ts');

  const uiDir = path.join(webRoot, 'src/ui');
  const auxFiles = fs
    .readdirSync(uiDir)
    .filter((f) => f.endsWith('.aux'))
    .sort();

  const compiledComponents: Record<string, unknown> = {};

  console.log(
    `${pad('Tag Name', 22)} | ${pad('Class Name', 18)} | ${pad('Mode', 13)} | Bindables (with BindingMode)`,
  );
  console.log('-'.repeat(100));

  for (const file of auxFiles) {
    const fullPath = path.join(uiDir, file);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const transformed = await transform.call({}, raw, fullPath);
    if (!transformed) throw new Error(`Failed to transform ${file}`);

    const rewritten = transformed.code
      .replaceAll('"@swc/helpers/_/_apply_decs_2311"', JSON.stringify(helperPath))
      .replaceAll('"aurelia"', JSON.stringify(aureliaUrl))
      .replaceAll('"class-variance-authority"', JSON.stringify(cvaUrl))
      .replaceAll('"@/lib/utils"', JSON.stringify(utilsUrl))
      .replaceAll('"@/lib/icons"', JSON.stringify(iconsUrl))
      .replaceAll('"@/services/toast"', JSON.stringify(toastUrl));

    const dataUrl = `data:text/javascript;base64,${Buffer.from(rewritten).toString('base64')}`;
    const mod = (await import(dataUrl)) as { default: new () => Record<string, unknown> };
    const Comp = mod.default;
    const def = CustomElement.getDefinition(Comp);
    compiledComponents[def.name] = Comp;

    const bindableDesc = Object.entries(def.bindables)
      .map(([k, v]) => {
        const mode = (v as { mode?: number }).mode;
        const modeLabel = mode === BindingMode.twoWay ? ':twoWay' : '';
        return `${k}${modeLabel}`;
      })
      .join(', ');

    console.log(
      `${pad(`<${def.name}>`, 22)} | ${pad(Comp.name, 18)} | ${pad(def.containerless ? 'containerless' : 'host-element', 13)} | ${bindableDesc || '(none)'}`,
    );
  }
  console.log('');

  // -------------------------------------------------------------------------
  // PANEL 3: JSDOM + Aurelia 2 Live DOM Rendering & Reactivity Emulation
  // -------------------------------------------------------------------------
  console.log('[PANEL 3: JSDOM + AURELIA 2 LIVE DOM HYDRATION & REACTIVITY TEST]');
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost:4600/overview',
    pretendToBeVisual: true,
  });
  const platform = new BrowserPlatform(dom.window as unknown as Window & typeof globalThis);

  class HarnessApp {
    alertTone: 'info' | 'destructive' = 'info';
    alertMessage = 'System operational';
    btnLoading = false;
    projectName = 'Aurelia Aux Compiler';
    selectedStatus = 'active';
    statusOptions = [
      { value: 'planning', label: 'Planning' },
      { value: 'active', label: 'Active' },
      { value: 'done', label: 'Done' },
    ];
  }

  const HarnessRoot = CustomElement.define(
    {
      name: 'harness-root',
      template: `
        <ui-card padded>
          <ui-card-header>
            <ui-card-title>AUX Runtime Verification</ui-card-title>
            <ui-card-description>Live JSDOM hydration of .aux components</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <ui-alert tone.bind="alertTone">\${alertMessage}</ui-alert>
            <ui-badge variant="success">Live</ui-badge>
            <ui-avatar name="Sandiko Dev" size="sm"></ui-avatar>
            <ui-icon name="sparkles" size="18"></ui-icon>
            <ui-label for="proj-input">Project Name</ui-label>
            <ui-input id="proj-input" value.bind="projectName" placeholder="Enter name"></ui-input>
            <ui-select id="proj-status" value.bind="selectedStatus" options.bind="statusOptions"></ui-select>
            <ui-separator></ui-separator>
            <ui-skeleton width="8rem" height="1rem"></ui-skeleton>
          </ui-card-content>
          <ui-card-footer>
            <ui-button loading.bind="btnLoading" variant="default">Save Project</ui-button>
          </ui-card-footer>
        </ui-card>
      `,
    },
    HarnessApp,
  );

  const host = dom.window.document.getElementById('app')!;
  const container = DI.createContainer();
  container.register(
    Registration.instance(IPlatform, platform),
    StandardConfiguration,
    ...Object.values(compiledComponents),
  );

  const au = new Aurelia(container);
  await au.app({ host, component: HarnessRoot }).start();

  const alertEl = host.querySelector('[role="status"]')!;
  const badgeEl = host.querySelector('span.inline-flex')!;
  const avatarEl = host.querySelectorAll('span[aria-hidden="true"]')[0]!;
  const svgEl = host.querySelector('svg')!;
  const inputEl = host.querySelector('input#proj-input') as HTMLInputElement;
  const selectEl = host.querySelector('select#proj-status') as HTMLSelectElement;
  const buttonEl = host.querySelector('button') as HTMLButtonElement;

  console.log('1. Initial Hydrated DOM Assertions:');
  console.log(`   - <ui-alert> role="status" class  : ${alertEl.className.slice(0, 72)}...`);
  console.log(`   - <ui-alert> textContent          : "${alertEl.textContent?.trim()}"`);
  console.log(`   - <ui-badge> textContent          : "${badgeEl.textContent?.trim()}"`);
  console.log(`   - <ui-avatar> computed initials   : "${avatarEl.textContent?.trim()}"`);
  console.log(`   - <ui-icon> rendered SVG children : ${svgEl.innerHTML.length} bytes of SVG path data`);
  console.log(`   - <ui-input> bound value          : "${inputEl.value}"`);
  console.log(`   - <ui-select> bound value         : "${selectEl.value}" (${selectEl.options.length} options)`);
  console.log(`   - <ui-button> disabled / busy     : disabled=${buttonEl.disabled}, aria-busy=${buttonEl.getAttribute('aria-busy')}`);

  // Mutate ViewModel and verify two-way binding + reactive DOM updates
  const vm = au.root.controller.viewModel as HarnessApp;
  vm.alertTone = 'destructive';
  vm.alertMessage = 'Critical alert triggered';
  vm.btnLoading = true;

  // Simulate user typing into <ui-input> to verify default two-way binding
  inputEl.value = 'Updated via Two-Way Binding';
  inputEl.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  runTasks();

  console.log('\n2. After Reactive State & Two-Way Input Mutation:');
  console.log(`   - <ui-alert> updated tone classes : ${alertEl.className.includes('text-destructive') ? '✓ text-destructive applied' : '✗ missing'}`);
  console.log(`   - <ui-alert> updated textContent  : "${alertEl.textContent?.trim()}"`);
  console.log(`   - <ui-input> -> VM two-way sync   : vm.projectName = "${vm.projectName}"`);
  console.log(`   - <ui-button> loading state       : disabled=${buttonEl.disabled}, aria-busy="${buttonEl.getAttribute('aria-busy')}", spinnerSvg=${Boolean(buttonEl.querySelector('svg.animate-spin'))}`);

  await au.stop();

  // -------------------------------------------------------------------------
  // PANEL 4: Console & Exception Monitor
  // -------------------------------------------------------------------------
  console.warn = origWarn;
  console.error = origError;

  console.log('\n[PANEL 4: CONSOLE & EXCEPTION MONITOR]');
  if (consoleRecords.length === 0) {
    console.log('✓ 0 console warnings | ✓ 0 console errors | ✓ 0 uncaught runtime exceptions');
  } else {
    for (const rec of consoleRecords) {
      console.log(`[${rec.level.toUpperCase()}] ${rec.message}`);
    }
  }
  console.log('==========================================================================================');
}

await runEmulation();
