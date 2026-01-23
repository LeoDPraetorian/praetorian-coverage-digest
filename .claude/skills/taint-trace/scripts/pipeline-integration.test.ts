import { describe, it, expect } from 'vitest';
import { detectSources } from '../lib/phases/phase1-source-detection.js';
import {
  getCallers,
  addSourceToGraph,
  addCallEdge,
  createCheckpoint,
  loadCheckpoint
} from '../lib/phases/phase2-taint-propagation.js';
import { matchSinks } from '../lib/phases/phase3-sink-detection.js';
import { rankPaths } from '../lib/phases/phase4-path-ranking.js';
import { formatSummary } from '../lib/phases/phase5-output-generation.js';
import {
  createMockPyghidraClient,
  createBufferOverflowScenario
} from '../lib/mocks/mock-factory.js';
import { TaintGraph } from '../lib/taint-graph.js';

describe('Full Pipeline Integration', () => {
  it('should execute complete analysis pipeline', async () => {
    // Use buffer overflow scenario: main() -> recv() -> strcpy()
    const scenario = createBufferOverflowScenario();
    const client = createMockPyghidraClient(scenario);

    // Phase 1: Detect sources
    const sourcePatterns = ['recv'];
    const detected = await detectSources(
      'test.exe',
      sourcePatterns,
      (binaryName) => client.listExports(binaryName)
    );

    expect(detected).toHaveLength(1);
    expect(detected[0].function).toBe('recv');

    // Phase 2: Build taint graph
    const graph = new TaintGraph();

    // Add source to graph
    addSourceToGraph(graph, detected[0]);

    // Get cross-references (callers of recv)
    const xrefs = await client.listCrossReferences('test.exe', 'recv');
    expect(xrefs.items).toHaveLength(1);
    expect(xrefs.items[0].from_function).toBe('main');

    // Add caller to graph
    graph.addNode({
      id: 'main',
      type: 'function',
      function: 'main',
      isTainted: false
    });

    // Add call edge from main to recv
    addCallEdge(graph, 'main', 'recv');

    // Phase 3: Match sinks
    const sinks = ['strcpy'];

    // Add strcpy as a tainted node (simulating taint propagation)
    graph.addNode({
      id: 'strcpy',
      type: 'function',
      function: 'strcpy',
      isTainted: true
    });

    // Add edge from recv to strcpy (simulating call chain)
    addCallEdge(graph, 'recv', 'strcpy');

    const matches = matchSinks(graph, sinks);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].sink).toBe('strcpy');

    // Phase 4: Rank paths
    const paths = matches.map(m => ({
      source: 'recv',
      sink: m.sink,
      path: ['recv', m.sink]
    }));
    const ranked = rankPaths(paths);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].risk_level).toBeDefined();
    expect(ranked[0].source).toBe('recv');
    expect(ranked[0].sink).toBe('strcpy');

    // Phase 5: Format summary
    const summary = formatSummary(
      1,  // total sources
      1,  // total sinks
      ranked,
      3,  // total functions (main, recv, strcpy)
      5   // analysis time in ms
    );

    expect(summary.total_sources).toBe(1);
    expect(summary.total_sinks).toBe(1);
    expect(summary.total_functions).toBe(3);
    expect(summary.vulnerabilities).toBeDefined();
    expect(summary.vulnerabilities.high).toBeGreaterThan(0);
  });
});

describe('Checkpoint Resume Integration', () => {
  it('should save and resume from checkpoint', () => {
    // Create initial analysis state
    const graph = new TaintGraph();

    graph.addNode({
      id: 'recv',
      type: 'function',
      function: 'recv',
      address: '0x402000',
      isTainted: true
    });

    graph.addNode({
      id: 'main',
      type: 'function',
      function: 'main',
      address: '0x401000',
      isTainted: false
    });

    // Add edge from main to recv
    graph.addEdge({
      from: 'main',
      to: 'recv',
      type: 'call'
    });

    // Save checkpoint at 25 functions
    const checkpoint = createCheckpoint(
      2,                      // phase
      25,                     // functions_analyzed
      graph,
      ['func26', 'func27']   // queue
    );

    expect(checkpoint.phase).toBe(2);
    expect(checkpoint.functions_analyzed).toBe(25);
    expect(checkpoint.queue).toHaveLength(2);
    expect(checkpoint.graph.tainted_nodes).toHaveLength(1);
    expect(checkpoint.graph.tainted_nodes[0].function).toBe('recv');
    expect(checkpoint.graph.edges).toHaveLength(1);
    expect(checkpoint.graph.edges[0].from).toBe('main');
    expect(checkpoint.graph.edges[0].to).toBe('recv');

    // Simulate loading checkpoint
    const resumed = loadCheckpoint(checkpoint);

    expect(resumed.phase).toBe(2);
    expect(resumed.functionsAnalyzed).toBe(25);
    expect(resumed.queue).toHaveLength(2);
    expect(resumed.queue).toContain('func26');
    expect(resumed.queue).toContain('func27');
    expect(resumed.nextFunction).toBe('func26');
  });
});
