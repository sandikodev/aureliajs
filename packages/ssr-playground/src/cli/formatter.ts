/**
 * @aureliajs/ssr-playground
 * Terminal UI (TUI) Formatter with colors, tables, and inspection cards
 */

import type { InspectionReport } from '../types.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

export function formatTerminalReport(report: InspectionReport): string {
  const lines: string[] = [];
  const width = 88;
  const hr = '─'.repeat(width);
  const doubleHr = '═'.repeat(width);

  lines.push('');
  lines.push(`${CYAN}${doubleHr}${RESET}`);
  lines.push(
    `${BOLD}${CYAN}  ⚡ AURELIA 2 + HONO SSR INSPECTOR & PLAYGROUND — INSPECTION REPORT${RESET}`
  );
  lines.push(`${CYAN}${doubleHr}${RESET}`);
  lines.push(
    `  Component : ${BOLD}${report.componentName}${RESET} | Timestamp: ${DIM}${report.timestamp}${RESET}`
  );
  lines.push(
    `  Lighthouse Grade : ${BOLD}${report.lighthouse.overallGrade === 'A+' ? GREEN : YELLOW}[${report.lighthouse.overallGrade}]${RESET} | Audit Score: ${BOLD}${report.audit.score}/100${RESET} (${report.audit.status})`
  );
  lines.push(`${CYAN}${hr}${RESET}`);

  // Panel 1: Server Performance & Timing
  lines.push(`${BOLD}  [PANEL 1: SERVER RENDERING & TIMING BREAKDOWN]${RESET}`);
  lines.push(`  ├─ Component SSR Render       : ${GREEN}${report.serverMetrics.renderDurationMs} ms${RESET}`);
  lines.push(`  ├─ State Whitelist Projection : ${GREEN}${report.serverMetrics.serializationDurationMs} ms${RESET}`);
  lines.push(`  ├─ Total Server Execution     : ${BOLD}${report.serverMetrics.totalServerMs} ms${RESET} (TTFB Budget: <50ms)`);
  lines.push(`  └─ Server Memory Delta        : ${DIM}${formatBytes(report.serverMetrics.memoryDeltaBytes)}${RESET}`);
  lines.push('');

  // Panel 2: Network Transfer & Compression
  lines.push(`${BOLD}  [PANEL 2: NETWORK PAYLOAD & COMPRESSION RATIO]${RESET}`);
  lines.push(
    `  ${pad('Resource', 24)} | ${pad('Raw Size', 12)} | ${pad('Gzip Wire', 12)} | Overhead %`
  );
  lines.push(`  ${'─'.repeat(24)}─┼─${'─'.repeat(12)}─┼─${'─'.repeat(12)}─┼─${'─'.repeat(12)}`);
  lines.push(
    `  ${pad('HTML Markup', 24)} | ${pad(formatBytes(report.networkMetrics.rawHtmlBytes), 12)} | ${pad(formatBytes(report.networkMetrics.gzipHtmlBytes), 12)} | -`
  );
  lines.push(
    `  ${pad('Hydration State JSON', 24)} | ${pad(formatBytes(report.networkMetrics.stateBytes), 12)} | ${pad(formatBytes(report.networkMetrics.gzipStateBytes), 12)} | ${report.networkMetrics.stateOverheadPercent}%`
  );
  lines.push(
    `  ${BOLD}${pad('Full Document Envelope', 24)} | ${pad(formatBytes(report.networkMetrics.totalDocumentBytes), 12)} | ${pad(formatBytes(report.networkMetrics.totalGzipBytes), 12)} | Savings: ${GREEN}${report.networkMetrics.compressionRatio}%${RESET}`
  );
  lines.push('');

  // Panel 3: Hydration Marker Integrity & Security Whitelist
  lines.push(`${BOLD}  [PANEL 3: HYDRATION MARKERS & SECURITY WHITELIST AUDIT]${RESET}`);
  lines.push(`  ├─ Pre-rendered DOM Elements : ${report.audit.elementCount}`);
  lines.push(
    `  ├─ Paired Hydration Markers  : ${report.audit.hasStartMarker && report.audit.hasEndMarker ? `${GREEN}PASS (au-start & au-end present)${RESET}` : `${YELLOW}STATIC (no dynamic loop markers)${RESET}`}`
  );
  lines.push(
    `  ├─ Secret / Token Leaks      : ${report.audit.sensitiveFieldsLeaked.length === 0 ? `${GREEN}CLEAN (0 secrets leaked)${RESET}` : `${RED}LEAK DETECTED: ${report.audit.sensitiveFieldsLeaked.join(', ')}${RESET}`}`
  );
  lines.push(
    `  └─ Script Context XSS Safety : ${report.audit.xssSafe ? `${GREEN}SECURE (escaped \\u003c, \\u003e, \\u0026)${RESET}` : `${RED}VULNERABLE${RESET}`}`
  );

  if (report.audit.findings.length > 0) {
    lines.push(`  ${DIM}Audit Findings:${RESET}`);
    for (const f of report.audit.findings) {
      const color = f.level === 'error' ? RED : f.level === 'warn' ? YELLOW : CYAN;
      lines.push(`    • [${color}${f.level.toUpperCase()}${RESET}] ${f.message}`);
    }
  }
  lines.push('');

  // Panel 4: Client Hydration Simulation (Browser JSDOM)
  if (report.clientSimulation) {
    lines.push(`${BOLD}  [PANEL 4: CLIENT HYDRATION & REACTIVITY SIMULATION]${RESET}`);
    lines.push(
      `  ├─ DOM Adoption Success      : ${report.clientSimulation.reconciledSuccessfully ? `${GREEN}YES (Zero AUR0757 mismatch errors)${RESET}` : `${RED}FAILED${RESET}`}`
    );
    lines.push(
      `  ├─ Zero-Thrash Adoption     : ${report.clientSimulation.adoptedWithoutThrashing ? `${GREEN}YES (Adopted server nodes directly)${RESET}` : `${YELLOW}NO${RESET}`}`
    );
    lines.push(`  ├─ Attached Event Listeners : ${report.clientSimulation.attachedListenersEstimate}`);
    lines.push(
      `  ├─ Two-Way Reactivity Test   : ${report.clientSimulation.reactivitySuccess ? `${GREEN}PASS (DOM updated on mutation)${RESET}` : `${RED}FAILED${RESET}`}`
    );
    lines.push(`  └─ Client Hydration Time     : ${CYAN}${report.clientSimulation.clientHydrationMs} ms${RESET}`);
    lines.push('');
  }

  // Panel 5: Simulated Core Web Vitals & Recommendations
  lines.push(`${BOLD}  [PANEL 5: ESTIMATED CORE WEB VITALS (LIGHTHOUSE READINESS)]${RESET}`);
  lines.push(`  ├─ Est. FCP (First Contentful Paint) : ${GREEN}${report.lighthouse.estimatedFcpMs} ms${RESET} (Good: <1800ms)`);
  lines.push(`  ├─ Est. LCP (Largest Contentful Paint): ${GREEN}${report.lighthouse.estimatedLcpMs} ms${RESET} (Good: <2500ms)`);
  lines.push(`  ├─ Est. TBT (Total Blocking Time)    : ${GREEN}${report.lighthouse.estimatedTbtMs} ms${RESET} (Good: <200ms)`);
  lines.push(`  └─ CLS (Layout Shift) Risk Rating    : ${GREEN}${report.lighthouse.clsRisk}${RESET}`);
  lines.push('');
  lines.push(`  ${DIM}Recommendations:${RESET}`);
  for (const rec of report.lighthouse.recommendations) {
    lines.push(`    ✓ ${rec}`);
  }

  lines.push(`${CYAN}${doubleHr}${RESET}`);
  lines.push('');

  return lines.join('\n');
}
