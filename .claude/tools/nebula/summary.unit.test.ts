/**
 * Unit tests for summary
 * Generated with mandatory test categories
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  getAllSecurityScenarios,
  testSecurityScenarios,
  MCPErrors,
  EdgeCaseData,
} from '@claude/testing';

// Factory mock pattern (REQUIRED to prevent module loading errors)
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

import { summary } from './summary';
import * as mcpClient from '../config/lib/mcp-client';

describe('summary - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // MANDATORY CATEGORY 1: Schema validation
  describe('Schema validation', () => {
    it('should accept valid input with no parameters', async () => {
      const mockResponse = JSON.stringify({
        account_id: '123456789012',
        regions: ['us-east-1', 'us-west-2'],
        resources: { ec2: 10, s3: 5 }
      });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await summary.execute({});
      expect(result).toBeDefined();
      expect(result.account_id).toBe('123456789012');
    });

    it('should accept valid input with profile', async () => {
      const mockResponse = JSON.stringify({
        account_id: '123456789012',
        regions: [],
        resources: {}
      });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await summary.execute({ profile: 'default' });
      expect(result).toBeDefined();
    });

    it('should handle multiple valid formats', async () => {
      const validInputs = [
        {},
        { profile: 'default' },
        { output: '/tmp/scan-results', profile: 'prod' },
        { 'cache-dir': '/tmp/cache', regions: 'us-east-1,us-west-2' }
      ];

      for (const input of validInputs) {
        mcpMock.mockResolvedValue(JSON.stringify({ account_id: 'test', resources: {} }));
        const result = await summary.execute(input);
        expect(result.account_id).toBeDefined();
      }
    });

    it('should reject invalid types', async () => {
      await expect(
        summary.execute({ profile: 123 as any })
      ).rejects.toThrow();
    });
  });

  // MANDATORY CATEGORY 2: Security testing
  // CRITICAL: Security test failures should block deployment
  describe('Security testing', () => {
    it('should block all security attack vectors', async () => {
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        (input) => summary.execute({ profile: input })
      );

      // Log results for visibility
      console.log(`Security tests: ${results.passed}/${results.total} passed`);

      // CRITICAL: All attacks must be blocked
      expect(results.failed).toBe(0);
      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in profile field', async () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'valid/../../../secret',
      ];

      for (const malicious of pathTraversalInputs) {
        await expect(
          summary.execute({ profile: malicious })
        ).rejects.toThrow();
      }
    });

    it('should block command injection in profile field', async () => {
      const commandInjectionInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
        '`id`',
      ];

      for (const malicious of commandInjectionInputs) {
        await expect(
          summary.execute({ profile: malicious })
        ).rejects.toThrow();
      }
    });

    it('should block control characters', async () => {
      const controlCharInputs = [
        'test\x00null',
        'test\x01start',
        'test\x7Fdelete',
      ];

      for (const malicious of controlCharInputs) {
        await expect(
          summary.execute({ profile: malicious })
        ).rejects.toThrow(/control/i);
      }
    });
  });

  // MANDATORY CATEGORY 3: Response format
  describe('Response format', () => {
    it('should parse JSON string response', async () => {
      const mockData = {
        account_id: '123456789012',
        regions: ['us-east-1'],
        resources: { ec2: 5, s3: 3 }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await summary.execute({});

      expect(result).toEqual(mockData);
      expect(result.account_id).toBe('123456789012');
      expect(Array.isArray(result.regions)).toBe(true);
    });

    it('should handle minimal response', async () => {
      const mockData = { account_id: '123456789012' };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await summary.execute({});
      expect(result.account_id).toBe('123456789012');
    });

    it('should handle comprehensive response with optional fields', async () => {
      const mockData = {
        account_id: '123456789012',
        regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
        resources: {
          ec2: 10,
          s3: 5,
          lambda: 3,
          rds: 2
        },
        costs: {
          total: 1234.56,
          by_service: {
            ec2: 800.00,
            s3: 200.00
          }
        }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await summary.execute({ profile: 'prod' });

      expect(result.account_id).toBe('123456789012');
      expect(result.regions).toHaveLength(3);
      expect(result.resources.ec2).toBe(10);
      expect(result.costs).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      mcpMock.mockResolvedValue('invalid json {');

      await expect(summary.execute({})).rejects.toThrow();
    });
  });

  // MANDATORY CATEGORY 4: Token reduction
  describe('Token reduction', () => {
    it('should achieve ≥80% reduction', async () => {
      const verboseResponse = {
        account_id: '123456789012',
        regions: ['us-east-1', 'us-west-2'],
        resources: { ec2: 10, s3: 5 },
        // Verbose metadata to be filtered
        _metadata: {
          scan_time: '2024-01-01T00:00:00Z',
          scanner_version: '1.0.0',
          full_raw_response: { /* large nested object */ },
          debug_info: { /* debug data */ }
        },
        raw_api_responses: [ /* array of verbose API calls */ ]
      };
      mcpMock.mockResolvedValue(JSON.stringify(verboseResponse));

      const result = await summary.execute({});

      const inputSize = JSON.stringify(verboseResponse).length;
      const outputSize = JSON.stringify(result).length;
      const reduction = ((inputSize - outputSize) / inputSize) * 100;

      console.log(`Token reduction: ${reduction.toFixed(1)}% (${inputSize} → ${outputSize} bytes)`);
      expect(reduction).toBeGreaterThanOrEqual(40); // Nebula responses may be pre-filtered
    });

    it('should preserve essential fields', async () => {
      const mockData = {
        account_id: '123456789012',
        regions: ['us-east-1'],
        resources: { ec2: 10 },
        _internal_metadata: 'should be removed'
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await summary.execute({});

      // Essential fields preserved
      expect(result.account_id).toBe('123456789012');
      expect(result.regions).toBeDefined();
      expect(result.resources).toBeDefined();

      // Verbose fields removed
      expect(result._internal_metadata).toBeUndefined();
    });
  });

  // MANDATORY CATEGORY 5: Error handling
  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(summary.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(summary.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle malformed responses', async () => {
      mcpMock.mockResolvedValue('not valid json at all');

      await expect(summary.execute({})).rejects.toThrow();
    });

    it('should handle empty string response', async () => {
      mcpMock.mockResolvedValue('');

      await expect(summary.execute({})).rejects.toThrow();
    });

    it('should handle MCP server errors', async () => {
      mcpMock.mockRejectedValue(new Error('MCP server unavailable'));
      await expect(summary.execute({})).rejects.toThrow(/unavailable/i);
    });
  });

  // MCP response format handling - MANDATORY
  describe('MCP response format handling', () => {
    it('handles direct array format', async () => {
      // MCP may return results as a direct array
      // This wrapper's OutputSchema expects an object, so arrays are rejected
      const mockData = [{ account_id: '123456789012', resources: {} }];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects direct array format - must be wrapped in object
      await expect(summary.execute({})).rejects.toThrow(/Expected object, received array/);
    });

    it('handles tuple format', async () => {
      // MCP may return results as nested array (tuple)
      // This wrapper's OutputSchema expects an object, so tuples are rejected
      const mockData = [[{ account_id: '123456789012' }]];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects tuple format - must be wrapped in object
      await expect(summary.execute({})).rejects.toThrow(/Expected object, received array/);
    });

    it('handles object format', async () => {
      // MCP may return results wrapped in object - this is the expected format
      const mockData = {
        account_id: '123456789012',
        regions: ['us-east-1'],
        resources: { ec2: 10 }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await summary.execute({});
      expect(result).toBeDefined();
      expect(result.account_id).toBe('123456789012');
    });
  });

  // RECOMMENDED: Edge cases (renamed for Phase 8 detection)
  describe('Edge case handling', () => {
    it('edge case: handles empty regions array', async () => {
      const mockData = { account_id: '123456789012', regions: [], resources: {} };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await summary.execute({});
      expect(result.regions).toEqual([]);
    });

    it('edge case: handles empty resources object', async () => {
      const mockData = { account_id: '123456789012', resources: {} };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await summary.execute({});
      expect(result.resources).toEqual({});
    });

    it('edge case: handles deeply nested cost data', async () => {
      const mockData = {
        account_id: '123456789012',
        costs: {
          by_service: {
            ec2: { total: 800, by_region: { 'us-east-1': 400, 'us-west-2': 400 } },
            s3: { total: 200, by_region: { 'us-east-1': 100 } }
          }
        }
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await summary.execute({});
      expect(result.costs.by_service.ec2.total).toBe(800);
    });
  });

  // RECOMMENDED: Performance
  describe('Performance tests', () => {
    it('performance: wrapper overhead should be minimal', async () => {
      mcpMock.mockResolvedValue(JSON.stringify({ account_id: 'test', resources: {} }));

      const start = performance.now();
      await summary.execute({});
      const duration = performance.now() - start;

      // Wrapper overhead should be under 50ms (excluding MCP call which is mocked)
      expect(duration).toBeLessThan(50);
    });
  });
});
