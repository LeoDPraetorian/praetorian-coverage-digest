/**
 * Unit tests for gen_callgraph wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from './gen-callgraph.js';

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';
const mockCallMCPTool = vi.mocked(callMCPTool);

describe('gen_callgraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('rejects empty binary_name', async () => {
      const result = await execute({ binary_name: '', function_name: 'main' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/binary_name/i);
      }
    });

    it('rejects empty function_name', async () => {
      const result = await execute({ binary_name: 'test.bin', function_name: '' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/function_name|symbol.*name.*required/i);
      }
    });
  });

  describe('token optimization', () => {
    it('returns URL only by default (99% reduction)', async () => {
      const largeGraph = 'graph TD\n' + Array.from({ length: 100 }, (_, i) =>
        `  node${i}[Func${i}] --> node${i+1}[Func${i+1}]`
      ).join('\n');

      mockCallMCPTool.mockResolvedValue({
        mermaid_url: 'https://mermaid.ink/img/abc123',
        graph: largeGraph,
      });

      const result = await execute({
        binary_name: 'test.bin',
        function_name: 'main',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.mermaid_url).toBeTruthy();
        expect(result.data.graph).toBeUndefined();
        expect(result.meta.estimatedTokens).toBeLessThan(500);
      }
    });

    it('includes full graph when requested', async () => {
      const graph = 'graph TD\n  A-->B\n  B-->C';

      mockCallMCPTool.mockResolvedValue({
        mermaid_url: 'https://mermaid.ink/img/abc123',
        graph,
      });

      const result = await execute({
        binary_name: 'test.bin',
        function_name: 'main',
        include_graph: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.graph).toBe(graph);
      }
    });

    it('calculates metrics from graph', async () => {
      mockCallMCPTool.mockResolvedValue({
        mermaid_url: 'https://mermaid.ink/img/abc123',
        graph: 'graph TD\n  A[main] --> B[func1]\n  A --> C[func2]\n  B --> D[func3]',
      });

      const result = await execute({
        binary_name: 'test.bin',
        function_name: 'main',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.metrics.node_count).toBeGreaterThan(0);
        expect(result.data.metrics.edge_count).toBeGreaterThan(0);
      }
    });
  });

  describe('successful operations', () => {
    it('generates callgraph with defaults', async () => {
      mockCallMCPTool.mockResolvedValue({
        mermaid_url: 'https://mermaid.ink/img/test',
        graph: 'graph TD\n  A-->B',
      });

      const result = await execute({
        binary_name: 'firmware.bin',
        function_name: 'parse_packet',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.function_name).toBe('parse_packet');
        expect(result.data.direction).toBe('calling');
        expect(result.data.mermaid_url).toBeTruthy();
      }
    });

    it('respects direction parameter', async () => {
      mockCallMCPTool.mockResolvedValue({
        mermaid_url: 'https://mermaid.ink/img/test',
        graph: 'graph TD\n  A-->B',
      });

      const result = await execute({
        binary_name: 'test.bin',
        function_name: 'main',
        direction: 'called',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.direction).toBe('called');
      }
    });
  });

  describe('error handling', () => {
    it('handles function not found', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Function not found'));

      const result = await execute({ binary_name: 'test.bin', function_name: 'missing' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toMatch(/NOT_FOUND|SYMBOL_NOT_FOUND/);
      }
    });

    it('handles timeout', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('timeout'));

      const result = await execute({ binary_name: 'test.bin', function_name: 'large' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TIMEOUT');
      }
    });
  });

  describe('edge cases', () => {
    it('handles orphan functions (single node)', async () => {
      mockCallMCPTool.mockResolvedValue({
        mermaid_url: 'https://mermaid.ink/img/orphan',
        graph: 'graph TD\n  A[orphan_func]',
      });

      const result = await execute({ binary_name: 'test.bin', function_name: 'orphan' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.metrics.node_count).toBeGreaterThanOrEqual(1);
        expect(result.data.metrics.edge_count).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
