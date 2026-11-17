/**
 * @aureliajs/ssr-playground
 * Types & Contracts for Server-Side Rendering & Hydration Inspector
 */

import type { RenderContext, HydrationPayload } from '@aureliajs/ssr';

export type { RenderContext, HydrationPayload };

export interface InspectionOptions {
  component: unknown;
  componentName?: string;
  props?: Record<string, unknown>;
  context?: RenderContext;
  initialData?: Record<string, unknown>;
  registrations?: unknown[];
  timeout?: number;
  url?: string;
  clientSimulate?: boolean;
}

export interface ServerRenderMetrics {
  renderDurationMs: number;
  serializationDurationMs: number;
  totalServerMs: number;
  memoryDeltaBytes: number;
}

export interface NetworkMetrics {
  rawHtmlBytes: number;
  gzipHtmlBytes: number;
  stateBytes: number;
  gzipStateBytes: number;
  totalDocumentBytes: number;
  totalGzipBytes: number;
  compressionRatio: number;
  stateOverheadPercent: number;
}

export interface AuditFinding {
  level: 'info' | 'warn' | 'error';
  category: 'hydration' | 'security' | 'payload' | 'dom';
  message: string;
}

export interface HydrationAudit {
  score: number; // 0 - 100
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'NEEDS_ATTENTION' | 'CRITICAL';
  hasStartMarker: boolean;
  hasEndMarker: boolean;
  markerCount: number;
  elementCount: number;
  sensitiveFieldsLeaked: string[];
  xssSafe: boolean;
  findings: AuditFinding[];
}

export interface ClientHydrationSimulation {
  reconciledSuccessfully: boolean;
  adoptedWithoutThrashing: boolean;
  domNodeDiscrepancies: string[];
  attachedListenersEstimate: number;
  reactivityTested: boolean;
  reactivitySuccess: boolean;
  clientHydrationMs: number;
}

export interface LighthouseSimulation {
  estimatedFcpMs: number;
  estimatedLcpMs: number;
  estimatedTbtMs: number;
  clsRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'F';
  recommendations: string[];
}

export interface InspectionReport {
  timestamp: string;
  componentName: string;
  htmlOutput: string;
  fullDocumentHtml: string;
  hydrationPayload: HydrationPayload;
  serverMetrics: ServerRenderMetrics;
  networkMetrics: NetworkMetrics;
  audit: HydrationAudit;
  clientSimulation?: ClientHydrationSimulation;
  lighthouse: LighthouseSimulation;
}
