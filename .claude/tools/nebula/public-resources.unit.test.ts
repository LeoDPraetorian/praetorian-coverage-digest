/**
 * Unit tests for public-resources - AWS/Azure public exposure detection
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

import { publicResources } from './public-resources';
import * as mcpClient from '../config/lib/mcp-client';

describe('public-resources - Unit Tests', () => {
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
        resources: [{ type: 's3', name: 'public-bucket', public: true }],
        summary: { total: 1, public: 1 }
      });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await publicResources.execute({});
      expect(result).toBeDefined();
    });

    it('should accept valid input with profile', async () => {
      const mockResponse = JSON.stringify({ resources: [], summary: { total: 0 } });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await publicResources.execute({ profile: 'prod' });
      expect(result).toBeDefined();
    });

    it('should handle multiple valid formats', async () => {
      const validInputs = [
        {},
        { profile: 'default' },
        { regions: 'us-east-1,us-west-2' },
        { opsec_level: 'safe' }
      ];

      for (const input of validInputs) {
        mcpMock.mockResolvedValue(JSON.stringify({ resources: [] }));
        const result = await publicResources.execute(input);
        expect(result).toBeDefined();
      }
    });

    it('should reject invalid types', async () => {
      await expect(
        publicResources.execute({ profile: 123 as any })
      ).rejects.toThrow();
    });
  });

  describe('Security testing', () => {
    it('should block all security attack vectors', async () => {
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        (input) => publicResources.execute({ profile: input })
      );

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal', async () => {
      const attacks = ['../../../etc/passwd', '..\\..\\windows\\system32'];
      for (const attack of attacks) {
        await expect(publicResources.execute({ profile: attack })).rejects.toThrow();
      }
    });

    it('should block command injection', async () => {
      const attacks = ['; rm -rf /', '| cat /etc/passwd', '$(whoami)'];
      for (const attack of attacks) {
        await expect(publicResources.execute({ profile: attack })).rejects.toThrow();
      }
    });

    it('should block control characters', async () => {
      await expect(publicResources.execute({ profile: 'test\x00null' })).rejects.toThrow(/control/i);
    });
  });

  describe('Response format', () => {
    it('should parse JSON string response with resources', async () => {
      const mockData = {
        resources: [
          { type: 's3', name: 'public-bucket', public: true, region: 'us-east-1' },
          { type: 'ec2', name: 'web-server', public: true, ip: '1.2.3.4' }
        ],
        summary: { total: 2, by_type: { s3: 1, ec2: 1 } }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await publicResources.execute({});
      expect(result.resources).toHaveLength(2);
    });

    it('should handle malformed JSON', async () => {
      mcpMock.mockResolvedValue('invalid json {');
      await expect(publicResources.execute({})).rejects.toThrow();
    });
  });

  describe('Token reduction', () => {
    it('should filter verbose metadata', async () => {
      const mockData = {
        resources: [{ type: 's3', name: 'bucket' }],
        _metadata: { scan_time: '2024-01-01' },
        raw_api_responses: [{ large: 'data' }]
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await publicResources.execute({});
      expect(result._metadata).toBeUndefined();
      expect(result.raw_api_responses).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(publicResources.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(publicResources.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle empty response', async () => {
      mcpMock.mockResolvedValue('');
      await expect(publicResources.execute({})).rejects.toThrow();
    });
  });

  describe('MCP response format handling', () => {
    it('handles direct array format', async () => {
      // MCP may return results as a direct array
      // This wrapper's OutputSchema expects an object, so arrays are rejected
      const mockData = [{ type: 's3', name: 'bucket', public: true }];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects direct array format - must be wrapped in object
      await expect(publicResources.execute({})).rejects.toThrow(/Expected object, received array/);
    });

    it('handles tuple format', async () => {
      // MCP may return results as nested array (tuple)
      // This wrapper's OutputSchema expects an object, so tuples are rejected
      const mockData = [[{ type: 's3', name: 'bucket' }]];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects tuple format - must be wrapped in object
      await expect(publicResources.execute({})).rejects.toThrow(/Expected object, received array/);
    });

    it('handles object format', async () => {
      // MCP may return results wrapped in object - this is the expected format
      const mockData = {
        resources: [{ type: 's3', name: 'bucket', public: true }],
        summary: { total: 1, public: 1 }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await publicResources.execute({});
      expect(result).toBeDefined();
      expect(result.resources).toHaveLength(1);
    });
  });

  describe('Edge case handling', () => {
    it('edge case: handles null values in optional fields', async () => {
      // Schema expects object/array types, null is rejected
      const mockData = { resources: null };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      await expect(publicResources.execute({})).rejects.toThrow();
    });

    it('edge case: handles undefined optional fields', async () => {
      const mockData = { summary: { total: 0 } };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await publicResources.execute({});
      expect(result).toBeDefined();
      expect(result.resources).toBeUndefined();
    });

    it('edge case: handles empty resources array', async () => {
      const mockData = { resources: [] };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await publicResources.execute({});
      expect(result.resources).toEqual([]);
    });

    it('edge case: handles large dataset', async () => {
      const mockData = {
        resources: Array.from({ length: 500 }, (_, i) => ({
          type: i % 2 === 0 ? 's3' : 'ec2',
          name: `resource-${i}`,
          public: true,
          region: 'us-east-1'
        })),
        summary: { total: 500, public: 500 }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await publicResources.execute({});
      expect(result.resources).toHaveLength(500);
    });
  });

  describe('Performance', () => {
    it('performance: wrapper overhead should be minimal', async () => {
      const mockData = { resources: [], summary: { total: 0 } };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const start = performance.now();
      await publicResources.execute({});
      const duration = performance.now() - start;

      // Wrapper overhead should be under 50ms (excluding MCP call which is mocked)
      expect(duration).toBeLessThan(50);
    });
  });
});
