/**
 * Unit tests for access-key-to-account-id - AWS key to account mapping
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

import { accessKeyToAccountId } from './access-key-to-account-id';
import * as mcpClient from '../config/lib/mcp-client';

describe('access-key-to-account-id - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema validation', () => {
    it('should accept valid access key ID', async () => {
      const mockResponse = JSON.stringify({
        access_key_id: 'AKIAIOSFODNN7EXAMPLE',
        account_id: '123456789012'
      });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await accessKeyToAccountId.execute({ 'access-key-id': 'AKIAIOSFODNN7EXAMPLE' });
      expect(result).toBeDefined();
      expect(result.account_id).toBe('123456789012');
    });

    it('should accept comma-separated access key IDs', async () => {
      const mockResponse = JSON.stringify({
        results: [
          { access_key_id: 'AKIAIOSFODNN7EXAMPLE', account_id: '123456789012' },
          { access_key_id: 'AKIAI44QH8DHBEXAMPLE', account_id: '987654321098' }
        ]
      });
      mcpMock.mockResolvedValue(mockResponse);

      const result = await accessKeyToAccountId.execute({
        'access-key-id': 'AKIAIOSFODNN7EXAMPLE,AKIAI44QH8DHBEXAMPLE'
      });
      expect(result).toBeDefined();
    });

    it('should reject missing required field', async () => {
      await expect(
        accessKeyToAccountId.execute({} as any)
      ).rejects.toThrow();
    });

    it('should reject invalid types', async () => {
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 123 as any })
      ).rejects.toThrow();
    });
  });

  describe('Security testing', () => {
    it('should block all security attack vectors', async () => {
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        (input) => accessKeyToAccountId.execute({ 'access-key-id': input })
      );

      expect(results.failed).toBe(0);
      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal', async () => {
      const attacks = ['../../../etc/passwd', '..\\..\\windows\\system32'];
      for (const attack of attacks) {
        await expect(accessKeyToAccountId.execute({ 'access-key-id': attack })).rejects.toThrow();
      }
    });

    it('should block command injection', async () => {
      const attacks = ['; rm -rf /', '| cat /etc/passwd', '$(whoami)'];
      for (const attack of attacks) {
        await expect(accessKeyToAccountId.execute({ 'access-key-id': attack })).rejects.toThrow();
      }
    });

    it('should block control characters', async () => {
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 'AKIA\x00TEST' })
      ).rejects.toThrow(/control/i);
    });
  });

  describe('Response format', () => {
    it('should parse single key response', async () => {
      const mockData = {
        access_key_id: 'AKIAIOSFODNN7EXAMPLE',
        account_id: '123456789012',
        valid: true
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await accessKeyToAccountId.execute({ 'access-key-id': 'AKIAIOSFODNN7EXAMPLE' });
      expect(result.account_id).toBe('123456789012');
    });

    it('should handle malformed JSON', async () => {
      mcpMock.mockResolvedValue('invalid json {');
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 'AKIAIOSFODNN7EXAMPLE' })
      ).rejects.toThrow();
    });
  });

  describe('Token reduction', () => {
    it('should filter verbose metadata', async () => {
      const mockData = {
        account_id: '123456789012',
        _metadata: { scan_time: '2024-01-01' },
        raw_api_responses: [{ large: 'data' }]
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' });
      expect(result._metadata).toBeUndefined();
      expect(result.raw_api_responses).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' })
      ).rejects.toThrow(/rate limit/i);
    });

    it('should handle timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' })
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle empty response', async () => {
      mcpMock.mockResolvedValue('');
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' })
      ).rejects.toThrow();
    });
  });

  describe('MCP response format handling', () => {
    it('handles direct array format', async () => {
      // MCP may return results as a direct array
      // This wrapper's OutputSchema expects an object, so arrays are rejected
      const mockData = [
        { access_key_id: 'AKIAIOSFODNN7EXAMPLE', account_id: '123456789012', valid: true }
      ];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects direct array format - must be wrapped in object
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 'AKIAIOSFODNN7EXAMPLE' })
      ).rejects.toThrow(/Expected object, received array/);
    });

    it('handles tuple format', async () => {
      // MCP may return results as nested array (tuple)
      // This wrapper's OutputSchema expects an object, so tuples are rejected
      const mockData = [[
        { access_key_id: 'AKIAIOSFODNN7EXAMPLE', account_id: '123456789012', valid: true }
      ]];
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Wrapper rejects tuple format - must be wrapped in object
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 'AKIAIOSFODNN7EXAMPLE' })
      ).rejects.toThrow(/Expected object, received array/);
    });

    it('handles object format', async () => {
      // MCP may return results wrapped in object - this is the expected format
      const mockData = {
        results: [
          { access_key_id: 'AKIAIOSFODNN7EXAMPLE', account_id: '123456789012', valid: true }
        ]
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await accessKeyToAccountId.execute({ 'access-key-id': 'AKIAIOSFODNN7EXAMPLE' });
      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
    });
  });

  describe('Edge case handling', () => {
    it('edge case: handles null values in response', async () => {
      // Schema rejects null for string fields - validates strict typing
      const mockData = { access_key_id: null, account_id: '123456789012' };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      // Null values in required string fields should be rejected by schema
      await expect(
        accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' })
      ).rejects.toThrow(/Expected string, received null/);
    });

    it('edge case: handles undefined optional fields', async () => {
      const mockData = { account_id: '123456789012' };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' });
      expect(result).toBeDefined();
      expect(result.account_id).toBe('123456789012');
    });

    it('edge case: handles empty results array', async () => {
      const mockData = { results: [] };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' });
      expect(result.results).toEqual([]);
    });

    it('edge case: handles large dataset', async () => {
      const mockData = {
        results: Array.from({ length: 100 }, (_, i) => ({
          access_key_id: `AKIA${i.toString().padStart(16, '0')}`,
          account_id: `${i.toString().padStart(12, '0')}`,
          valid: true,
        }))
      };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const result = await accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' });
      expect(result.results).toHaveLength(100);
    });
  });

  describe('Performance', () => {
    it('performance: wrapper overhead should be minimal', async () => {
      const mockData = { access_key_id: 'AKIATEST', account_id: '123456789012' };
      mcpMock.mockResolvedValue(JSON.stringify(mockData));

      const start = performance.now();
      await accessKeyToAccountId.execute({ 'access-key-id': 'AKIATEST' });
      const duration = performance.now() - start;

      // Wrapper overhead should be under 50ms (excluding MCP call which is mocked)
      expect(duration).toBeLessThan(50);
    });
  });
});
