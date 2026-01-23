import { describe, it, expect } from 'vitest';
import { TaintGraph } from '../lib/taint-graph';
import { matchSinks, calculateConfidence } from '../lib/phases/phase3-sink-detection';

describe('Phase 3 - Sink Detection', () => {
  describe('matchSinks', () => {
    it('should match tainted functions to sinks', () => {
      const graph = new TaintGraph();
      graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });
      graph.addNode({ id: 'strcpy', type: 'function', function: 'strcpy', isTainted: true });
      graph.addEdge({ from: 'recv', to: 'strcpy', type: 'dataflow' });

      const sinks = ['strcpy', 'system'];
      const matches = matchSinks(graph, sinks);

      expect(matches).toHaveLength(1);
      expect(matches[0].sink).toBe('strcpy');
    });

    it('should return empty array when no sinks match', () => {
      const graph = new TaintGraph();
      graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });
      graph.addNode({ id: 'printf', type: 'function', function: 'printf', isTainted: true });

      const sinks = ['strcpy', 'system'];
      const matches = matchSinks(graph, sinks);

      expect(matches).toHaveLength(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should assign high confidence for direct calls', () => {
      const path = ['recv', 'strcpy']; // Direct call
      const confidence = calculateConfidence(path);
      expect(confidence).toBe('high');
    });

    it('should assign medium confidence for indirect calls', () => {
      const longPath = ['recv', 'process', 'handle', 'strcpy']; // Indirect
      const confidence = calculateConfidence(longPath);
      expect(confidence).toBe('medium');
    });

    it('should assign low confidence for very long paths', () => {
      const veryLongPath = ['recv', 'a', 'b', 'c', 'd', 'e', 'strcpy'];
      const confidence = calculateConfidence(veryLongPath);
      expect(confidence).toBe('low');
    });
  });
});
