/**
 * Unit tests for whoami - Covert AWS identity detection
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

import { whoami } from './whoami';
import * as mcpClient from '../config/lib/mcp-client';

describe('whoami - Unit Tests', () => {
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
        identity: { arn: 'arn:aws:iam::123456789012:user/test', account: '123456789012' }
      });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await whoami.execute({});
      expect(result).toBeDefined();
    });

    it('should accept valid input with action', async () => {
      const mockResponse = JSON.stringify({ identity: { account: '123456789012' } });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await whoami.execute({ action: 'sts-get-caller-identity' });
      expect(result).toBeDefined();
    });

    it('should handle multiple valid formats', async () => {
      const validInputs = [
        {},
        { action: 'sts-get-caller-identity' },
        { profile: 'default', action: 'ec2-describe-instances' },
        { opsec_level: 'safe' }
      ];

      for (const input of validInputs) {
        mcpMock.mockResolvedValue(JSON.stringify({ identity: {} }));
        const result = await whoami.execute(input);
        expect(result).toBeDefined();
      }
    });

    it('should reject invalid types', async () => {
      await expect(
        whoami.execute({ action: 123 as any })
      ).rejects.toThrow();
    });
  });

  describe('Security testing', () => {
    it('should block all security attack vectors', async () => {
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        (input) => whoami.execute({ action: input })
      );

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal', async () => {
      const attacks = ['../../../etc/passwd', '..\\..\\windows\\system32'];
      for (const attack of attacks) {
        await expect(whoami.execute({ action: attack })).rejects.toThrow();
      }
    });

    it('should block command injection', async () => {
      const attacks = ['; rm -rf /', '| cat /etc/passwd', '$(whoami)'];
      for (const attack of attacks) {
        await expect(whoami.execute({ action: attack })).rejects.toThrow();
      }
    });

    it('should block control characters', async () => {
      await expect(whoami.execute({ action: 'test\x00null' })).rejects.toThrow(/control/i);
    });
  });

  describe('Response format', () => {
    it('should parse JSON string response', async () => {
      const mockData = {
        identity: { arn: 'arn:aws:iam::123456789012:user/test', account: '123456789012' },
        techniques_used: ['sts-get-caller-identity']
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await whoami.execute({});
      expect(result.identity).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      mcpMock.mockResolvedValue('invalid json {');
      await expect(whoami.execute({})).rejects.toThrow();
    });
  });

  describe('Token reduction', () => {
    it('should filter verbose metadata', async () => {
      const mockData = {
        identity: { account: '123456789012' },
        _metadata: { scan_time: '2024-01-01' },
        raw_api_responses: [{ large: 'data' }]
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await whoami.execute({});
      expect(result._metadata).toBeUndefined();
      expect(result.raw_api_responses).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(whoami.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(whoami.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle empty response', async () => {
      mcpMock.mockResolvedValue('');
      await expect(whoami.execute({})).rejects.toThrow();
    });
  });

  describe('MCP response format handling', () => {
    it('handles direct array format', async () => {
      // MCP may return results as a direct array
      // This wrapper's OutputSchema expects an object, so arrays are rejected
      const mockData = [{ identity: { account: '123456789012' } }];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects direct array format - must be wrapped in object
      await expect(whoami.execute({})).rejects.toThrow(/Expected object, received array/);
    });

    it('handles tuple format', async () => {
      // MCP may return results as nested array (tuple)
      // This wrapper's OutputSchema expects an object, so tuples are rejected
      const mockData = [[{ identity: { account: '123456789012' } }]];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects tuple format - must be wrapped in object
      await expect(whoami.execute({})).rejects.toThrow(/Expected object, received array/);
    });

    it('handles object format', async () => {
      // MCP may return results wrapped in object - this is the expected format
      const mockData = {
        identity: {
          arn: 'arn:aws:iam::123456789012:user/test',
          account: '123456789012'
        },
        techniques_used: ['sts-get-caller-identity']
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await whoami.execute({});
      expect(result).toBeDefined();
      expect(result.identity?.account).toBe('123456789012');
    });
  });

  describe('Edge case handling', () => {
    it('edge case: handles null identity in optional fields', async () => {
      // Schema expects object type for identity, null is rejected
      const mockData = { identity: null };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      await expect(whoami.execute({})).rejects.toThrow();
    });

    it('edge case: handles undefined optional fields', async () => {
      const mockData = { techniques_used: ['sts'] };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await whoami.execute({});
      expect(result).toBeDefined();
      expect(result.identity).toBeUndefined();
    });

    it('edge case: handles empty identity object', async () => {
      const mockData = { identity: {} };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await whoami.execute({});
      expect(result.identity).toEqual({});
    });

    it('edge case: handles multiple techniques', async () => {
      const mockData = {
        identity: { account: '123456789012' },
        techniques_used: [
          'sts-get-caller-identity',
          'ec2-describe-instances',
          's3-list-buckets'
        ]
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await whoami.execute({});
      expect(result.techniques_used).toHaveLength(3);
    });
  });

  describe('Performance', () => {
    it('performance: wrapper overhead should be minimal', async () => {
      const mockData = { identity: { account: '123456789012' } };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const start = performance.now();
      await whoami.execute({});
      const duration = performance.now() - start;

      // Wrapper overhead should be under 50ms (excluding MCP call which is mocked)
      expect(duration).toBeLessThan(50);
    });
  });
});
