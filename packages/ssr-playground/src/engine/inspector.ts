/**
 * @aureliajs/ssr-playground
 * Main Inspection Engine orchestrating Server, Network, Audit, and Client phases
 */

import { performance } from 'node:perf_hooks';
import { renderAurelia, serializeState, stringifyPayload, createHtmlDocument } from '@aureliajs/ssr';
import { calculateNetworkMetrics } from './network';
import { auditSsrOutput } from './audit';
import { simulateClientHydration } from './client-simulator';
import type {
  InspectionOptions,
  InspectionReport,
  ServerRenderMetrics,
  LighthouseSimulation,
} from '../types';

export async function inspectAureliaSsr(
  options: InspectionOptions
): Promise<InspectionReport> {
  const {
    component,
    componentName = (component as { name?: string })?.name || 'AureliaComponent',
    props = {},
    context = {},
    initialData,
    registrations = [],
    timeout = 5000,
    url = 'http://localhost:4600/',
    clientSimulate = true,
  } = options;

  // 1. Measure Server Render Time
  const memBefore = process.memoryUsage().heapUsed;
  const t0Render = performance.now();

  const htmlOutput = await renderAurelia({
    component: component as object,
    context,
    props,
    timeout,
    registrations,
    preserveMarkers: false,
    url,
  });

  const renderDurationMs = Number((performance.now() - t0Render).toFixed(2));

  // 2. Measure Serialization Time
  const t0Serial = performance.now();
  const hydrationPayload = await serializeState(context, initialData, componentName);
  const serializedStateJson = stringifyPayload(hydrationPayload);
  const serializationDurationMs = Number((performance.now() - t0Serial).toFixed(2));

  const memAfter = process.memoryUsage().heapUsed;
  const totalServerMs = Number((renderDurationMs + serializationDurationMs).toFixed(2));
  const memoryDeltaBytes = Math.max(0, memAfter - memBefore);

  const serverMetrics: ServerRenderMetrics = {
    renderDurationMs,
    serializationDurationMs,
    totalServerMs,
    memoryDeltaBytes,
  };

  // 3. Assemble Full SSR Document
  const fullDocumentHtml = createHtmlDocument(htmlOutput, hydrationPayload, {
    title: `${componentName} — SSR Inspector`,
    basePath: '/',
  });

  // 4. Calculate Network Payload & Transfer Overhead
  const networkMetrics = calculateNetworkMetrics(
    htmlOutput,
    fullDocumentHtml,
    serializedStateJson
  );

  // 5. Audit Hydration Marker Integrity & Security Whitelist
  const audit = auditSsrOutput(
    htmlOutput,
    hydrationPayload,
    serializedStateJson,
    networkMetrics.totalGzipBytes
  );

  // 6. Simulate Client Hydration if requested
  const clientSimulation = clientSimulate
    ? await simulateClientHydration(fullDocumentHtml, hydrationPayload)
    : undefined;

  // 7. Calculate Simulated Lighthouse & Web Vitals Estimates
  const estimatedFcpMs = Math.round(totalServerMs + 25 + networkMetrics.totalGzipBytes / 1024 * 0.2);
  const estimatedLcpMs = Math.round(estimatedFcpMs + (clientSimulation?.clientHydrationMs || 10) * 0.5);
  const estimatedTbtMs = Math.round((clientSimulation?.clientHydrationMs || 5) * 0.3);

  let clsRisk: LighthouseSimulation['clsRisk'] = 'LOW';
  if (audit.hasStartMarker && audit.hasEndMarker) {
    clsRisk = 'LOW';
  } else if (!audit.hasStartMarker) {
    clsRisk = 'MEDIUM';
  }

  const recommendations: string[] = [];
  if (totalServerMs > 100) {
    recommendations.push('Server rendering took >100ms. Consider caching loader data or optimizing component bindings.');
  }
  if (networkMetrics.totalGzipBytes > 30 * 1024) {
    recommendations.push('Transfer size exceeds 30 kB. Use code splitting for non-critical sub-components.');
  }
  if (audit.findings.some((f) => f.level === 'error')) {
    recommendations.push('Resolve hydration or security audit errors before deploying to production.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Architecture meets production SSR standards. Ready for high-concurrency deployment.');
  }

  let overallGrade: LighthouseSimulation['overallGrade'] = 'A+';
  if (audit.score < 50 || estimatedFcpMs > 500) overallGrade = 'F';
  else if (audit.score < 75 || estimatedFcpMs > 300) overallGrade = 'C';
  else if (audit.score < 90 || estimatedFcpMs > 200) overallGrade = 'B';
  else if (audit.score < 98 || estimatedFcpMs > 100) overallGrade = 'A';

  const lighthouse: LighthouseSimulation = {
    estimatedFcpMs,
    estimatedLcpMs,
    estimatedTbtMs,
    clsRisk,
    overallGrade,
    recommendations,
  };

  return {
    timestamp: new Date().toISOString(),
    componentName,
    htmlOutput,
    fullDocumentHtml,
    hydrationPayload,
    serverMetrics,
    networkMetrics,
    audit,
    clientSimulation,
    lighthouse,
  };
}
