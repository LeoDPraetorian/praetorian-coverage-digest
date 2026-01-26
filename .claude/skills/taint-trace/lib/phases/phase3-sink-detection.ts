import { TaintGraph, TaintNode } from '../taint-graph';

export interface SinkMatch {
  sink: string;
  node: TaintNode;
}

export type Confidence = 'high' | 'medium' | 'low';

/**
 * matchSinks - Filters graph for tainted nodes that match sink functions
 * @param graph The taint graph
 * @param sinks Array of sink function names
 * @returns Array of matches
 */
export function matchSinks(graph: TaintGraph, sinks: string[]): SinkMatch[] {
  const taintedNodes = graph.getTaintedNodes();
  const matches: SinkMatch[] = [];

  for (const node of taintedNodes) {
    if (sinks.includes(node.function)) {
      matches.push({
        sink: node.function,
        node
      });
    }
  }

  return matches;
}

/**
 * calculateConfidence - Assigns confidence based on path length
 * @param path Array of node IDs in the path
 * @returns Confidence level
 */
export function calculateConfidence(path: string[]): Confidence {
  const length = path.length;

  if (length <= 2) {
    return 'high';
  } else if (length <= 4) {
    return 'medium';
  } else {
    return 'low';
  }
}
