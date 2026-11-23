#!/usr/bin/env bun
/**
 * @aureliajs/ssr-playground
 * CLI & TUI Entrypoint
 */

import { FIXTURES } from '../fixtures/index';
import { inspectAureliaSsr } from '../engine/inspector';
import { formatTerminalReport } from './formatter';
import { createPlaygroundApp } from '../server/app';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Web GUI Mode
  if (args.includes('--serve') || args.includes('-s')) {
    const portIndex = args.indexOf('--port');
    const port = portIndex !== -1 ? Number(args[portIndex + 1]) : 4700;
    await startServer(port);
    return;
  }

  // JSON Output Mode
  const isJson = args.includes('--json');

  // Fixture filter
  const fixtureIndex = args.indexOf('--fixture');
  const targetFixture = fixtureIndex !== -1 ? args[fixtureIndex + 1] : undefined;

  const fixturesToRun = targetFixture
    ? { [targetFixture]: FIXTURES[targetFixture] }
    : FIXTURES;

  if (targetFixture && !FIXTURES[targetFixture]) {
    console.error(`Error: Unknown fixture "${targetFixture}". Available: ${Object.keys(FIXTURES).join(', ')}`);
    process.exit(1);
  }

  const reports = [];
  for (const [name, component] of Object.entries(fixturesToRun)) {
    if (!component) continue;
    const report = await inspectAureliaSsr({
      component,
      componentName: name,
    });
    reports.push(report);

    if (!isJson) {
      console.log(formatTerminalReport(report));
    }
  }

  if (isJson) {
    console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
  }
}

interface BunServerRuntime {
  serve: (options: {
    fetch: (req: Request) => Promise<Response> | Response;
    port: number;
    hostname?: string;
  }) => { url: { href: string } };
}

async function startServer(port: number) {
  const app = createPlaygroundApp();

  const bunGlobal = (globalThis as unknown as { Bun?: BunServerRuntime }).Bun;
  if (bunGlobal) {
    const server = bunGlobal.serve({
      fetch: (req: Request) => app.fetch(req),
      port,
      hostname: '0.0.0.0',
    });
    console.log('================================================================================');
    console.log('  ⚡ AURELIA 2 + HONO SSR PLAYGROUND & INSPECTOR WEB GUI');
    console.log('================================================================================');
    console.log(`  Listening at : ${server.url.href}`);
    console.log(`  Local URL    : http://localhost:${port}`);
    console.log(`  API Routes   : http://localhost:${port}/api/inspect`);
    console.log(`  Preview      : http://localhost:${port}/preview/counter-card`);
    console.log('================================================================================\n');

    // Keep Bun event loop open
    await new Promise(() => {});
  } else {
    // Node.js fallback using @hono/node-server if in Node
    const { serve } = await import('@hono/node-server');
    serve({ fetch: (req: Request) => app.fetch(req), port });
    console.log('================================================================================');
    console.log('  ⚡ AURELIA 2 + HONO SSR PLAYGROUND & INSPECTOR WEB GUI (Node.js)');
    console.log('================================================================================');
    console.log(`  Local URL    : http://localhost:${port}`);
    console.log(`  API Routes   : http://localhost:${port}/api/inspect`);
    console.log(`  Preview      : http://localhost:${port}/preview/counter-card`);
    console.log('================================================================================\n');

    await new Promise(() => {});
  }
}

function printHelp() {
  console.log(`
Aurelia 2 + Hono SSR Inspector & Playground

USAGE:
  bun run --cwd packages/ssr-playground inspect [options]
  bun run --cwd packages/ssr-playground serve [--port 4700]

OPTIONS:
  --serve, -s        Start the interactive Web GUI server
  --port <num>       Specify port for Web GUI (default: 4700)
  --fixture <name>   Inspect specific fixture (counter-card, user-profile, data-table)
  --json             Output raw JSON report for CI/CD assertions
  --help, -h         Show this help message

EXAMPLES:
  # Run TUI terminal inspection on all fixtures
  bun src/cli/index.ts

  # Run TUI inspection on a specific component
  bun src/cli/index.ts --fixture counter-card

  # Launch Web GUI Playground
  bun src/cli/index.ts --serve --port 4700

  # Output JSON for automated CI assertions
  bun src/cli/index.ts --fixture data-table --json
`);
}

main().catch((err) => {
  console.error('[ssr-inspect] Fatal error:', err);
  process.exit(1);
});
