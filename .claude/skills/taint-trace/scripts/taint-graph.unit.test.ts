import { describe, it, expect } from 'vitest';
import { TaintNode, TaintEdge, TaintGraph } from '../lib/taint-graph.js';

describe('Taint Graph - Node Definition', () => {
  it('should create function node', () => {
    const node: TaintNode = {
      id: 'recv_0x402000',
      type: 'function',
      function: 'recv',
      address: '0x402000',
      isTainted: true
    };

    expect(node.id).toBe('recv_0x402000');
    expect(node.type).toBe('function');
    expect(node.isTainted).toBe(true);
  });

  it('should create parameter node', () => {
    const node: TaintNode = {
      id: 'recv_0x402000_param1',
      type: 'parameter',
      function: 'recv',
      address: '0x402000',
      paramIndex: 1,
      isTainted: true
    };

    expect(node.type).toBe('parameter');
    expect(node.paramIndex).toBe(1);
  });

  it('should create variable node', () => {
    const node: TaintNode = {
      id: 'main_buffer',
      type: 'variable',
      function: 'main',
      varName: 'buffer',
      isTainted: true
    };

    expect(node.type).toBe('variable');
    expect(node.varName).toBe('buffer');
  });
});

describe('Taint Graph - Edge Definition', () => {
  it('should create data flow edge', () => {
    const edge: TaintEdge = {
      from: 'recv_0x402000_param1',
      to: 'main_buffer',
      type: 'dataflow',
      transformation: 'assignment'
    };

    expect(edge.type).toBe('dataflow');
    expect(edge.transformation).toBe('assignment');
  });

  it('should create call edge', () => {
    const edge: TaintEdge = {
      from: 'main',
      to: 'recv',
      type: 'call'
    };

    expect(edge.type).toBe('call');
  });

  it('should create edge with metadata', () => {
    const edge: TaintEdge = {
      from: 'buffer',
      to: 'strcpy_param1',
      type: 'dataflow',
      transformation: 'pointer_arithmetic',
      metadata: {
        operation: 'buffer + offset',
        sanitized: false
      }
    };

    expect(edge.metadata).toBeDefined();
    expect(edge.metadata?.sanitized).toBe(false);
  });
});

describe('Taint Graph - Add/Query Methods', () => {
  it('should add nodes to graph', () => {
    const graph = new TaintGraph();
    const node: TaintNode = {
      id: 'recv',
      type: 'function',
      function: 'recv',
      address: '0x402000',
      isTainted: true
    };

    graph.addNode(node);
    expect(graph.hasNode('recv')).toBe(true);
    expect(graph.getNode('recv')).toEqual(node);
  });

  it('should add edges to graph', () => {
    const graph = new TaintGraph();

    graph.addNode({ id: 'main', type: 'function', function: 'main', isTainted: false });
    graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });

    graph.addEdge({
      from: 'main',
      to: 'recv',
      type: 'call'
    });

    const edges = graph.getEdgesFrom('main');
    expect(edges.length).toBe(1);
    expect(edges[0].to).toBe('recv');
  });

  it('should find all paths from source to sink', () => {
    const graph = new TaintGraph();

    // Build graph: main -> recv -> processPacket -> strcpy
    graph.addNode({ id: 'main', type: 'function', function: 'main', isTainted: false });
    graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });
    graph.addNode({ id: 'processPacket', type: 'function', function: 'processPacket', isTainted: true });
    graph.addNode({ id: 'strcpy', type: 'function', function: 'strcpy', isTainted: true });

    graph.addEdge({ from: 'main', to: 'recv', type: 'call' });
    graph.addEdge({ from: 'recv', to: 'processPacket', type: 'dataflow' });
    graph.addEdge({ from: 'processPacket', to: 'strcpy', type: 'call' });

    const paths = graph.findPaths('recv', 'strcpy');
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]).toContain('recv');
    expect(paths[0]).toContain('strcpy');
  });

  it('should find all tainted nodes', () => {
    const graph = new TaintGraph();

    graph.addNode({ id: 'main', type: 'function', function: 'main', isTainted: false });
    graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });
    graph.addNode({ id: 'strcpy', type: 'function', function: 'strcpy', isTainted: true });

    const tainted = graph.getTaintedNodes();
    expect(tainted.length).toBe(2);
    expect(tainted.map(n => n.id)).toContain('recv');
    expect(tainted.map(n => n.id)).toContain('strcpy');
  });
});
