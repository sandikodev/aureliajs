/**
 * @aureliajs/ssr-playground
 * Network payload, gzip compression and transfer metrics calculator
 */

import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';
import type { NetworkMetrics } from '../types.js';

export function calculateNetworkMetrics(
  htmlOutput: string,
  fullDocumentHtml: string,
  serializedStateJson: string
): NetworkMetrics {
  const docBuffer = Buffer.from(fullDocumentHtml, 'utf-8');
  const htmlBuffer = Buffer.from(htmlOutput, 'utf-8');
  const stateBuffer = Buffer.from(serializedStateJson, 'utf-8');

  const gzipDoc = zlib.gzipSync(docBuffer, { level: 9 });
  const gzipHtml = zlib.gzipSync(htmlBuffer, { level: 9 });
  const gzipState = zlib.gzipSync(stateBuffer, { level: 9 });

  const rawHtmlBytes = htmlBuffer.length;
  const gzipHtmlBytes = gzipHtml.length;
  const stateBytes = stateBuffer.length;
  const gzipStateBytes = gzipState.length;
  const totalDocumentBytes = docBuffer.length;
  const totalGzipBytes = gzipDoc.length;

  const compressionRatio =
    totalDocumentBytes > 0
      ? Number(((1 - totalGzipBytes / totalDocumentBytes) * 100).toFixed(1))
      : 0;

  const stateOverheadPercent =
    totalDocumentBytes > 0
      ? Number(((stateBytes / totalDocumentBytes) * 100).toFixed(1))
      : 0;

  return {
    rawHtmlBytes,
    gzipHtmlBytes,
    stateBytes,
    gzipStateBytes,
    totalDocumentBytes,
    totalGzipBytes,
    compressionRatio,
    stateOverheadPercent,
  };
}
