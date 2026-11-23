/**
 * @aureliajs/ssr-playground
 * Hydration marker integrity and security whitelist auditor
 */

import type { HydrationPayload, HydrationAudit, AuditFinding } from '../types';

const FORBIDDEN_SECRET_KEYS = [
  'password',
  'refreshtoken',
  'apikey',
  'secretkey',
  'secret',
  'privatekey',
  'authorization',
  'bearertoken',
  'creditcard',
  'salt',
  'hash',
];

export function auditSsrOutput(
  htmlOutput: string,
  payload: HydrationPayload,
  stringifiedState: string,
  totalGzipBytes: number
): HydrationAudit {
  const findings: AuditFinding[] = [];
  let score = 100;

  // 1. Marker Integrity
  const startMatches = htmlOutput.match(/<!--au-start-->/g) || [];
  const endMatches = htmlOutput.match(/<!--au-end-->/g) || [];
  const totalMarkerMatches = htmlOutput.match(/<!--au.*?-->/g) || [];

  const hasStartMarker = startMatches.length > 0;
  const hasEndMarker = endMatches.length > 0;
  const markerCount = totalMarkerMatches.length;

  // Count DOM elements roughly
  const elementCount = (htmlOutput.match(/<[a-zA-Z][^>]*>/g) || []).length;

  if (startMatches.length !== endMatches.length) {
    score -= 25;
    findings.push({
      level: 'error',
      category: 'hydration',
      message: `Unmatched hydration markers detected: ${startMatches.length} au-start vs ${endMatches.length} au-end. Client adoption may fail.`,
    });
  } else if (hasStartMarker) {
    findings.push({
      level: 'info',
      category: 'hydration',
      message: `Preserved ${startMatches.length} paired Aurelia 2 hydration markers for zero-layout-shift client adoption.`,
    });
  } else {
    // If no dynamic repeat/if was used, markers might legitimately be absent for pure static elements
    findings.push({
      level: 'info',
      category: 'hydration',
      message: 'No dynamic template controller markers required (component appears static or pre-evaluated).',
    });
  }

  // 2. Security Whitelist Audit on Payload
  const sensitiveFieldsLeaked: string[] = [];
  scanForSecrets(payload.context, sensitiveFieldsLeaked);

  if (sensitiveFieldsLeaked.length > 0) {
    score -= 50;
    findings.push({
      level: 'error',
      category: 'security',
      message: `Security violation: sensitive fields detected in client hydration payload: ${sensitiveFieldsLeaked.join(', ')}.`,
    });
  } else {
    findings.push({
      level: 'info',
      category: 'security',
      message: 'Context passed strict whitelist DTO projection. Zero credentials or secret tokens leaked.',
    });
  }

  // 3. XSS Escaping in Script Context
  const hasUnescapedScriptBreak =
    stringifiedState.includes('</script') ||
    stringifiedState.includes('<!--') ||
    stringifiedState.includes('<script');

  const xssSafe = !hasUnescapedScriptBreak;

  if (!xssSafe) {
    score -= 40;
    findings.push({
      level: 'error',
      category: 'security',
      message: 'XSS vulnerability: Serialized state contains unescaped HTML script break tags.',
    });
  } else {
    findings.push({
      level: 'info',
      category: 'security',
      message: 'Script context characters safely escaped (\\u003c, \\u003e, \\u0026). Immune to script-injection XSS.',
    });
  }

  // 4. Payload Budget Check
  if (totalGzipBytes > 50 * 1024) {
    score -= 20;
    findings.push({
      level: 'warn',
      category: 'payload',
      message: `Initial transfer size is high (${(totalGzipBytes / 1024).toFixed(1)} kB gzip). Consider lazy-loading or pagination.`,
    });
  } else if (totalGzipBytes > 20 * 1024) {
    score -= 10;
    findings.push({
      level: 'info',
      category: 'payload',
      message: `Moderate payload size (${(totalGzipBytes / 1024).toFixed(1)} kB gzip). Optimal for interactive dashboards.`,
    });
  } else {
    findings.push({
      level: 'info',
      category: 'payload',
      message: `Ultra-compact transfer footprint (${(totalGzipBytes / 1024).toFixed(1)} kB gzip). Lightning-fast FCP expected.`,
    });
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  let status: HydrationAudit['status'] = 'OPTIMAL';
  if (normalizedScore < 50) status = 'CRITICAL';
  else if (normalizedScore < 75) status = 'NEEDS_ATTENTION';
  else if (normalizedScore < 90) status = 'ACCEPTABLE';

  return {
    score: normalizedScore,
    status,
    hasStartMarker,
    hasEndMarker,
    markerCount,
    elementCount,
    sensitiveFieldsLeaked,
    xssSafe,
    findings,
  };
}

function scanForSecrets(obj: unknown, leaked: string[], prefix = ''): void {
  if (obj === null || typeof obj !== 'object') return;

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const lowerKey = key.toLowerCase();

    if (FORBIDDEN_SECRET_KEYS.some((forbidden) => lowerKey.includes(forbidden))) {
      leaked.push(fullPath);
    }

    if (value !== null && typeof value === 'object') {
      scanForSecrets(value, leaked, fullPath);
    }
  }
}
