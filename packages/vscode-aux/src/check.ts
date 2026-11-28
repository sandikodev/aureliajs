import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeAuxDocument } from './analyzer';
import { collectAuxDiagnostics, type AuxDiagnosticSeverity } from './diagnostics';

export type { AuxDiagnosticSeverity } from './diagnostics';

export interface AuxDiagnosticLocation {
  /** 1-based line number */
  line: number;
  /** 1-based column number */
  column: number;
  /** 0-based character offset in the document */
  offset: number;
}

export interface AuxDiagnostic {
  filename: string;
  severity: AuxDiagnosticSeverity;
  code: string;
  message: string;
  source: 'Aurelia AUX';
  start: AuxDiagnosticLocation;
  end: AuxDiagnosticLocation;
}

export interface AuxCheckDocumentResult {
  filename: string;
  diagnostics: AuxDiagnostic[];
  errorCount: number;
  warningCount: number;
}

export interface AuxCheckSummary {
  files: AuxCheckDocumentResult[];
  totalFiles: number;
  errorCount: number;
  warningCount: number;
  ok: boolean;
}

function computeLineStarts(content: string): number[] {
  const starts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
}

function offsetToLocation(lineStarts: number[], offset: number): AuxDiagnosticLocation {
  const clamped = Math.max(0, offset);
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const start = lineStarts[mid]!;
    if (start <= clamped) {
      if (mid === lineStarts.length - 1 || lineStarts[mid + 1]! > clamped) {
        return {
          line: mid + 1,
          column: clamped - start + 1,
          offset: clamped,
        };
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return { line: 1, column: clamped + 1, offset: clamped };
}

/**
 * Checks a single `.aux` SFC source string and returns structured errors and warnings
 * for template bindings and interpolations against `<script>`, `<script setup>`, and `<script server>`.
 */
export function checkAuxDocument(
  content: string,
  filename = '<anonymous>.aux',
): AuxCheckDocumentResult {
  const analysis = analyzeAuxDocument(content);
  const rawDiagnostics = collectAuxDiagnostics(analysis);
  const lineStarts = computeLineStarts(content);

  let errorCount = 0;
  let warningCount = 0;

  const diagnostics: AuxDiagnostic[] = rawDiagnostics.map((raw) => {
    if (raw.severity === 'warning') warningCount++;
    else errorCount++;

    return {
      filename,
      severity: raw.severity,
      code: raw.code,
      message: raw.message,
      source: 'Aurelia AUX',
      start: offsetToLocation(lineStarts, raw.startOffset),
      end: offsetToLocation(lineStarts, raw.endOffset),
    };
  });

  return {
    filename,
    diagnostics,
    errorCount,
    warningCount,
  };
}

async function expandAuxTargets(targets: readonly string[]): Promise<string[]> {
  const resolved: string[] = [];

  const walk = async (targetPath: string) => {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
          continue;
        }
        await walk(path.join(targetPath, entry.name));
      }
    } else if (stat.isFile() && targetPath.endsWith('.aux')) {
      resolved.push(targetPath);
    }
  };

  for (const target of targets) {
    await walk(target);
  }

  return resolved;
}

/**
 * Reads and checks a list of `.aux` files (or directories containing `.aux` files)
 * and returns aggregated diagnostics and counts.
 */
export async function checkAuxFiles(filePaths: readonly string[]): Promise<AuxCheckSummary> {
  const expanded = await expandAuxTargets(filePaths);
  const files: AuxCheckDocumentResult[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const filePath of expanded) {
    const content = await fs.readFile(filePath, 'utf8');
    const result = checkAuxDocument(content, filePath);
    files.push(result);
    errorCount += result.errorCount;
    warningCount += result.warningCount;
  }

  return {
    files,
    totalFiles: files.length,
    errorCount,
    warningCount,
    ok: errorCount === 0,
  };
}

/**
 * Formats an `AuxCheckSummary` into a human-readable CLI report similar to `svelte-check`.
 */
export function formatAuxCheckReport(summary: AuxCheckSummary): string {
  const lines: string[] = [];

  for (const file of summary.files) {
    for (const diag of file.diagnostics) {
      const tag = diag.severity === 'error' ? 'Error' : 'Warning';
      lines.push(
        `${diag.filename}:${diag.start.line}:${diag.start.column} ${tag} [${diag.code}]: ${diag.message}`,
      );
    }
  }

  lines.push(
    `aux-check found ${summary.errorCount} error(s) and ${summary.warningCount} warning(s) across ${summary.totalFiles} file(s).`,
  );

  return lines.join('\n');
}

export async function runAuxCheckCli(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const targets = argv.filter((arg) => !arg.startsWith('-'));
  const jsonMode = argv.includes('--json');
  const resolvedTargets = targets.length > 0 ? targets : [process.cwd()];

  const summary = await checkAuxFiles(resolvedTargets);
  if (jsonMode) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(formatAuxCheckReport(summary));
  }

  return summary.ok ? 0 : 1;
}

// Execute CLI only when invoked directly as a script
const isDirectCli =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  (process.argv[1]!.endsWith('/check.ts') || process.argv[1]!.endsWith('/check.js'));

if (isDirectCli) {
  runAuxCheckCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    });
}
