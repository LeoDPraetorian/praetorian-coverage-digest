/**
 * Interactive drill-down features for taint analysis results
 */

import { TaintGraph } from './taint-graph';
import { matchSinks, SinkMatch } from './phases/phase3-sink-detection';

export interface DrillDownQuery {
  type: 'show_chain' | 'show_code' | 'requery_sinks' | 'unknown';
  pathIndex?: number;
  functionName?: string;
  sinkPattern?: string;
}

/**
 * Parse natural language follow-up queries for interactive exploration
 */
export function parseFollowUpQuery(query: string): DrillDownQuery {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();

  // Pattern: "show full chain for path N" or "expand path N"
  if (normalized.includes('chain') || (normalized.includes('path') && normalized.includes('expand'))) {
    const match = trimmed.match(/path\s+(\d+)/i);
    const pathIndex = match ? parseInt(match[1], 10) : undefined;
    return { type: 'show_chain', pathIndex };
  }

  // Pattern: "show code at/for FUNCTION"
  if (normalized.includes('code') || normalized.includes('decompile')) {
    const atMatch = trimmed.match(/(?:at|for)\s+(\w+)/i);
    const functionName = atMatch ? atMatch[1] : undefined;
    return { type: 'show_code', functionName };
  }

  // Pattern: "paths to X" or "are there paths to X"
  if (normalized.includes('paths to')) {
    const match = trimmed.match(/paths to\s+(.+?)(?:\?|$)/i);
    const sinkPattern = match ? match[1].trim() : undefined;
    return { type: 'requery_sinks', sinkPattern };
  }

  return { type: 'unknown' };
}

export interface TaintPath {
  call_chain: string[];
  transformations: string[];
}

/**
 * Expand a taint path to show full detail including transformations
 */
export function expandPathWithTransformations(path: TaintPath): string {
  const { call_chain, transformations } = path;

  if (call_chain.length === 0) {
    return '';
  }

  // If no transformations, just join the call chain
  if (transformations.length === 0) {
    return call_chain.join(' → ');
  }

  // Interleave call chain with transformations
  const parts: string[] = [];

  for (let i = 0; i < call_chain.length; i++) {
    parts.push(call_chain[i]);

    // Add transformation if available
    if (i < transformations.length) {
      parts.push(`[${transformations[i]}]`);
    }
  }

  return parts.join(' → ');
}

export type DecompileFunction = (binaryPath: string, functionName: string) => Promise<{
  code: string;
  summary: Record<string, any>;
}>;

/**
 * Show decompiled code for a specific function
 */
export async function showFunctionCode(
  binaryPath: string,
  functionName: string,
  decompile: DecompileFunction
): Promise<string> {
  try {
    const result = await decompile(binaryPath, functionName);

    if (!result.code || result.code.trim() === '') {
      return `No code available for function: ${functionName}`;
    }

    return result.code;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Error decompiling function ${functionName}: ${message}`;
  }
}

/**
 * Re-query the graph with custom sink functions
 */
export function requeryWithSinks(graph: TaintGraph, sinks: string[]): SinkMatch[] {
  return matchSinks(graph, sinks);
}
