import { describe, it, expect, vi } from 'vitest';
import {
  getCallers,
  addSourceToGraph,
  addCallEdge,
  detectTransformation,
  propagateTaint,
  createCheckpoint,
  loadCheckpoint,
} from '../lib/phases/phase2-taint-propagation.js';
import { TaintGraph } from '../lib/taint-graph.js';
import { DetectedSource } from '../lib/phases/phase1-source-detection.js';
import {
  MockCrossReference,
  MockListCrossReferencesOutput,
  MockDecompileFunctionOutput,
} from '../lib/mocks/pyghidra-mocks.js';

describe('Phase 2 - List Cross-References', () => {
  it('should get callers of source function', async () => {
    const mockListXrefs = vi.fn().mockResolvedValue({
      items: [
        { from_function: 'main', to_address: '0x402000', xref_type: 'CALL' },
      ],
      summary: { total: 1, returned: 1 },
      estimatedTokens: 100,
    } as MockListCrossReferencesOutput);

    const xrefs = await getCallers('binary.exe', 'recv', mockListXrefs);
    expect(xrefs).toHaveLength(1);
    expect(xrefs[0].from_function).toBe('main');
  });

  it('should handle multiple callers', async () => {
    const mockListXrefs = vi.fn().mockResolvedValue({
      items: [
        { from_function: 'main', to_address: '0x402000', xref_type: 'CALL' },
        { from_function: 'processPacket', to_address: '0x402000', xref_type: 'CALL' },
      ],
      summary: { total: 2, returned: 2 },
      estimatedTokens: 200,
    } as MockListCrossReferencesOutput);

    const xrefs = await getCallers('binary.exe', 'recv', mockListXrefs);
    expect(xrefs).toHaveLength(2);
    expect(xrefs[0].from_function).toBe('main');
    expect(xrefs[1].from_function).toBe('processPacket');
  });

  it('should filter for CALL type xrefs only', async () => {
    const mockListXrefs = vi.fn().mockResolvedValue({
      items: [
        { from_function: 'main', to_address: '0x402000', xref_type: 'CALL' },
        { from_function: 'helper', to_address: '0x402000', xref_type: 'DATA' },
      ],
      summary: { total: 2, returned: 2 },
      estimatedTokens: 200,
    } as MockListCrossReferencesOutput);

    const xrefs = await getCallers('binary.exe', 'recv', mockListXrefs);
    expect(xrefs).toHaveLength(1);
    expect(xrefs[0].from_function).toBe('main');
  });
});

describe('Phase 2 - Build Taint Graph', () => {
  it('should add tainted nodes to graph', () => {
    const graph = new TaintGraph();
    const source: DetectedSource = { function: 'recv', address: '0x402000', paramIndex: 1 };

    addSourceToGraph(graph, source);

    expect(graph.hasNode('recv')).toBe(true);
    expect(graph.getNode('recv')?.isTainted).toBe(true);
  });

  it('should create node with correct properties', () => {
    const graph = new TaintGraph();
    const source: DetectedSource = { function: 'recv', address: '0x402000', paramIndex: 1 };

    addSourceToGraph(graph, source);

    const node = graph.getNode('recv');
    expect(node).toBeDefined();
    expect(node?.id).toBe('recv');
    expect(node?.type).toBe('function');
    expect(node?.function).toBe('recv');
    expect(node?.address).toBe('0x402000');
    expect(node?.isTainted).toBe(true);
  });

  it('should add edges for call relationships', () => {
    const graph = new TaintGraph();
    addSourceToGraph(graph, { function: 'recv', address: '0x402000', paramIndex: 1 });

    addCallEdge(graph, 'main', 'recv');

    const edges = graph.getEdgesFrom('main');
    expect(edges).toHaveLength(1);
    expect(edges[0].to).toBe('recv');
  });

  it('should create call edge with correct properties', () => {
    const graph = new TaintGraph();
    addSourceToGraph(graph, { function: 'recv', address: '0x402000', paramIndex: 1 });

    addCallEdge(graph, 'main', 'recv');

    const edges = graph.getEdgesFrom('main');
    expect(edges[0].from).toBe('main');
    expect(edges[0].to).toBe('recv');
    expect(edges[0].type).toBe('call');
  });
});

describe('Phase 2 - Track Transformations', () => {
  it('should detect assignment transformations', () => {
    const code = 'char *buf = recv_data;';
    const transformation = detectTransformation(code);
    expect(transformation).toBe('assignment');
  });

  it('should detect arithmetic transformations', () => {
    const code = 'ptr = buffer + offset;';
    const transformation = detectTransformation(code);
    expect(transformation).toBe('pointer_arithmetic');
  });

  it('should detect string operations', () => {
    const code = 'strcpy(dest, source);';
    const transformation = detectTransformation(code);
    expect(transformation).toBe('string_operation');
  });

  it('should detect arithmetic operations', () => {
    const code = 'int result = x * 2 + y;';
    const transformation = detectTransformation(code);
    expect(transformation).toBe('arithmetic');
  });

  it('should return null for unrecognized patterns', () => {
    const code = 'int x = 5;';
    const transformation = detectTransformation(code);
    expect(transformation).toBeNull();
  });
});

describe('Phase 2 - Inter-Procedural Flow', () => {
  it('should propagate taint through function calls', async () => {
    const graph = new TaintGraph();
    const mockDecompile = vi.fn().mockResolvedValue({
      code: 'void main() { char buf[64]; recv(0, buf, 64, 0); process(buf); }',
      summary: {
        function_name: 'main',
        total_lines: 1,
        returned_lines: 1,
        was_truncated: false,
        truncated_lines: 0,
      },
      estimatedTokens: 100,
    } as MockDecompileFunctionOutput);

    await propagateTaint(graph, 'main', ['recv'], mockDecompile);

    // Should have called decompile
    expect(mockDecompile).toHaveBeenCalledWith(expect.anything(), 'main');

    // Should detect process() call with tainted buffer
    expect(graph.hasNode('process')).toBe(true);
    expect(graph.getNode('process')?.isTainted).toBe(true);
  });

  it('should not propagate taint for non-source functions', async () => {
    const graph = new TaintGraph();
    const mockDecompile = vi.fn().mockResolvedValue({
      code: 'void main() { char buf[64]; getInput(buf); process(buf); }',
      summary: {
        function_name: 'main',
        total_lines: 1,
        returned_lines: 1,
        was_truncated: false,
        truncated_lines: 0,
      },
      estimatedTokens: 100,
    } as MockDecompileFunctionOutput);

    await propagateTaint(graph, 'main', ['recv'], mockDecompile);

    // recv not called, so process should not be tainted
    expect(graph.hasNode('process')).toBe(false);
  });
});

describe('Phase 2 - Checkpoint System', () => {
  it('should save checkpoint every 25 functions', () => {
    const graph = new TaintGraph();
    addSourceToGraph(graph, { function: 'recv', address: '0x402000', paramIndex: 1 });

    const checkpoint = createCheckpoint(2, 50, graph, ['func26', 'func27']);

    expect(checkpoint.phase).toBe(2);
    expect(checkpoint.functions_analyzed).toBe(50);
    expect(checkpoint.queue).toHaveLength(2);
  });

  it('should include graph state in checkpoint', () => {
    const graph = new TaintGraph();
    addSourceToGraph(graph, { function: 'recv', address: '0x402000', paramIndex: 1 });
    addCallEdge(graph, 'main', 'recv');

    const checkpoint = createCheckpoint(2, 25, graph, ['func26']);

    expect(checkpoint.graph).toBeDefined();
    expect(checkpoint.graph.tainted_nodes).toHaveLength(1);
  });

  it('should load checkpoint and resume', () => {
    const checkpoint = {
      phase: 2,
      functions_analyzed: 50,
      queue: ['func26'],
      graph: { tainted_nodes: [], edges: [] },
    };

    const resumeState = loadCheckpoint(checkpoint);

    expect(resumeState.phase).toBe(2);
    expect(resumeState.nextFunction).toBe('func26');
  });

  it('should handle empty queue in checkpoint', () => {
    const checkpoint = {
      phase: 2,
      functions_analyzed: 100,
      queue: [],
      graph: { tainted_nodes: [], edges: [] },
    };

    const resumeState = loadCheckpoint(checkpoint);

    expect(resumeState.phase).toBe(2);
    expect(resumeState.nextFunction).toBeUndefined();
  });
});
