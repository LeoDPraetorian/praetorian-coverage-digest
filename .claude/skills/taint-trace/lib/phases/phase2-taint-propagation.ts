import { DetectedSource } from './phase1-source-detection';
import { TaintGraph, TaintNode } from '../taint-graph';
import {
  MockCrossReference,
  MockListCrossReferencesOutput,
  MockDecompileFunctionOutput,
} from '../mocks/pyghidra-mocks';

/**
 * Get callers (cross-references) for a source function
 */
export async function getCallers(
  binaryName: string,
  functionName: string,
  listXrefsFn: (binaryName: string, nameOrAddress: string) => Promise<MockListCrossReferencesOutput>
): Promise<MockCrossReference[]> {
  const result = await listXrefsFn(binaryName, functionName);

  // Filter for CALL type xrefs only
  return result.items.filter(xref => xref.xref_type === 'CALL');
}

/**
 * Add a source to the taint graph as a tainted node
 */
export function addSourceToGraph(graph: TaintGraph, source: DetectedSource): void {
  const node: TaintNode = {
    id: source.function,
    type: 'function',
    function: source.function,
    address: source.address,
    isTainted: true,
  };

  graph.addNode(node);
}

/**
 * Add a call edge between caller and callee in the taint graph
 */
export function addCallEdge(graph: TaintGraph, from: string, to: string): void {
  graph.addEdge({
    from,
    to,
    type: 'call',
  });
}

/**
 * Detect transformation type from code snippet
 */
export function detectTransformation(code: string): string | null {
  // Check for string operations first (most specific)
  if (/str(cpy|cat|ncpy|ncat|dup|chr|str|tok|cmp|len|coll|xfrm)/i.test(code)) {
    return 'string_operation';
  }

  // Check for pointer arithmetic (buffer/ptr + offset)
  if (/\w+\s*\+\s*\w+/.test(code) && /\bptr\b|\bbuffer\b|\bpointer\b/i.test(code)) {
    return 'pointer_arithmetic';
  }

  // Check for arithmetic with operators (in the RHS of assignment)
  // Must be on right side of = to avoid matching pointer declarations like char *
  if (/=\s*[^;]*[*/%]/.test(code) || /=\s*[^;]*[+\-]\s*\d/.test(code)) {
    return 'arithmetic';
  }

  // Check for simple assignment (variable = identifier; with variable on RHS)
  if (/\w+\s*=\s*\w+;/.test(code) && !/=\s*\d+;/.test(code)) {
    return 'assignment';
  }

  return null;
}

/**
 * Propagate taint through function calls
 */
export async function propagateTaint(
  graph: TaintGraph,
  functionName: string,
  sources: string[],
  decompileFn: (binaryName: string, functionName: string) => Promise<MockDecompileFunctionOutput>
): Promise<void> {
  // Decompile the function
  const result = await decompileFn('binary', functionName);
  const code = result.code;

  // Check if any source functions are called
  let foundSource = false;
  for (const source of sources) {
    if (code.includes(`${source}(`)) {
      foundSource = true;
      break;
    }
  }

  if (!foundSource) {
    return; // No source functions called, nothing to propagate
  }

  // Extract function calls using simple regex
  // Match: functionName(...)
  const callPattern = /(\w+)\s*\(/g;
  let match;
  while ((match = callPattern.exec(code)) !== null) {
    const calledFunction = match[1];

    // Skip if it's a source function itself
    if (sources.includes(calledFunction)) {
      continue;
    }

    // Add tainted node for called function
    const node: TaintNode = {
      id: calledFunction,
      type: 'function',
      function: calledFunction,
      isTainted: true,
    };
    graph.addNode(node);
  }
}

export interface Checkpoint {
  phase: number;
  functions_analyzed: number;
  queue: string[];
  graph: {
    tainted_nodes: Array<{ id: string; function: string; address?: string }>;
    edges: Array<{ from: string; to: string; type: string }>;
  };
}

export interface ResumeState {
  phase: number;
  functionsAnalyzed: number;
  nextFunction?: string;
  queue: string[];
}

/**
 * Create a checkpoint of the current analysis state
 */
export function createCheckpoint(
  phase: number,
  functionsAnalyzed: number,
  graph: TaintGraph,
  queue: string[]
): Checkpoint {
  // Serialize tainted nodes
  const taintedNodes = graph.getTaintedNodes().map(node => ({
    id: node.id,
    function: node.function,
    address: node.address,
  }));

  // Serialize edges from ALL nodes (not just tainted ones)
  const edges: Array<{ from: string; to: string; type: string }> = [];
  for (const node of graph.getAllNodes()) {
    const nodeEdges = graph.getEdgesFrom(node.id);
    for (const edge of nodeEdges) {
      edges.push({
        from: edge.from,
        to: edge.to,
        type: edge.type,
      });
    }
  }

  return {
    phase,
    functions_analyzed: functionsAnalyzed,
    queue,
    graph: {
      tainted_nodes: taintedNodes,
      edges,
    },
  };
}

/**
 * Load checkpoint and resume analysis
 */
export function loadCheckpoint(checkpoint: Checkpoint): ResumeState {
  return {
    phase: checkpoint.phase,
    functionsAnalyzed: checkpoint.functions_analyzed,
    nextFunction: checkpoint.queue.length > 0 ? checkpoint.queue[0] : undefined,
    queue: checkpoint.queue,
  };
}
