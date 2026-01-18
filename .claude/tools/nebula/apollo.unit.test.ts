/**
 * Unit tests for apollo - AWS access control graph analysis
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  getAllSecurityScenarios,
  testSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

import { apollo } from './apollo';
import * as mcpClient from '../config/lib/mcp-client';

describe('apollo - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema validation', () => {
    it('should accept valid input with no parameters', async () => {
      const mockResponse = JSON.stringify({
        graph: { nodes: 10, edges: 25 },
        analysis: { findings: [] }
      });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await apollo.execute({});
      expect(result).toBeDefined();
    });

    it('should accept valid input with neo4j config', async () => {
      const mockResponse = JSON.stringify({ graph: { nodes: 5 } });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await apollo.execute({
        'neo4j-uri': 'bolt://localhost:7687',
        'neo4j-username': 'neo4j',
        'neo4j-password': 'password'
      });
      expect(result).toBeDefined();
    });

    it('should handle multiple valid formats', async () => {
      const validInputs = [
        {},
        { profile: 'default' },
        { regions: 'us-east-1,us-west-2' },
        { 'resource-type': 'AWS::EC2::Instance' }
      ];

      for (const input of validInputs) {
        mcpMock.mockResolvedValue(JSON.stringify({ graph: {} }));
        const result = await apollo.execute(input);
        expect(result).toBeDefined();
      }
    });

    it('should reject invalid types', async () => {
      await expect(
        apollo.execute({ profile: 123 as any })
      ).rejects.toThrow();
    });
  });

  describe('Security testing', () => {
    it('should block all security attack vectors', async () => {
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        (input) => apollo.execute({ profile: input })
      );

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal', async () => {
      const attacks = ['../../../etc/passwd', '..\\..\\windows\\system32'];
      for (const attack of attacks) {
        await expect(apollo.execute({ profile: attack })).rejects.toThrow();
      }
    });

    it('should block command injection', async () => {
      const attacks = ['; rm -rf /', '| cat /etc/passwd', '$(whoami)'];
      for (const attack of attacks) {
        await expect(apollo.execute({ profile: attack })).rejects.toThrow();
      }
    });

    it('should block control characters', async () => {
      await expect(apollo.execute({ profile: 'test\x00null' })).rejects.toThrow(/control/i);
    });
  });

  describe('Response format', () => {
    it('should parse JSON string response', async () => {
      const mockData = {
        graph: { nodes: 100, edges: 250, clusters: 5 },
        analysis: {
          privilege_escalation_paths: 3,
          cross_account_access: 2
        }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await apollo.execute({});
      expect(result.graph).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      mcpMock.mockResolvedValue('invalid json {');
      await expect(apollo.execute({})).rejects.toThrow();
    });
  });

  describe('Token reduction', () => {
    it('should filter verbose metadata', async () => {
      const mockData = {
        graph: { nodes: 10 },
        _metadata: { scan_time: '2024-01-01' },
        raw_api_responses: [{ large: 'data' }]
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await apollo.execute({});
      expect(result._metadata).toBeUndefined();
      expect(result.raw_api_responses).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(apollo.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(apollo.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle empty response', async () => {
      mcpMock.mockResolvedValue('');
      await expect(apollo.execute({})).rejects.toThrow();
    });
  });

  describe('MCP response format handling', () => {
    it('handles direct array format', async () => {
      // MCP may return results as a direct array
      // This wrapper's OutputSchema expects an object, so arrays are rejected
      const mockData = [{ graph: { nodes: 10 } }];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects direct array format - must be wrapped in object
      await expect(apollo.execute({})).rejects.toThrow(/Expected object, received array/);
    });

    it('handles tuple format', async () => {
      // MCP may return results as nested array (tuple)
      // This wrapper's OutputSchema expects an object, so tuples are rejected
      const mockData = [[{ graph: { nodes: 10 } }]];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects tuple format - must be wrapped in object
      await expect(apollo.execute({})).rejects.toThrow(/Expected object, received array/);
    });

    it('handles object format', async () => {
      // MCP may return results wrapped in object - this is the expected format
      const mockData = {
        graph: { nodes: 100, edges: 250 },
        analysis: { privilege_escalation_paths: 3 }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await apollo.execute({});
      expect(result).toBeDefined();
      expect(result.graph?.nodes).toBe(100);
    });
  });

  describe('Edge case handling', () => {
    it('edge case: handles null values in optional fields', async () => {
      // Schema expects object type for graph, null is rejected
      const mockData = { graph: null, analysis: { findings: [] } };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Null is not a valid object - schema rejects it
      await expect(apollo.execute({})).rejects.toThrow(/Expected object, received null/);
    });

    it('edge case: handles undefined optional fields', async () => {
      const mockData = { analysis: { findings: [] } };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await apollo.execute({});
      expect(result).toBeDefined();
      expect(result.graph).toBeUndefined();
    });

    it('edge case: handles empty graph object', async () => {
      const mockData = { graph: {} };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await apollo.execute({});
      expect(result.graph).toEqual({});
    });

    it('edge case: handles large dataset', async () => {
      const mockData = {
        graph: { nodes: 10000, edges: 50000, clusters: 100 },
        analysis: {
          privilege_escalation_paths: 500,
          findings: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            severity: 'high',
            description: `Finding ${i}`
          }))
        }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await apollo.execute({});
      expect(result.graph?.nodes).toBe(10000);
      expect(result.analysis?.findings).toHaveLength(100);
    });
  });

  describe('Performance', () => {
    it('performance: wrapper overhead should be minimal', async () => {
      const mockData = { graph: { nodes: 10 } };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const start = performance.now();
      await apollo.execute({});
      const duration = performance.now() - start;

      // Wrapper overhead should be under 50ms (excluding MCP call which is mocked)
      expect(duration).toBeLessThan(50);
    });
  });
});
