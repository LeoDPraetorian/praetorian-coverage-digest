/**
 * Unit Tests for chrome-devtools get-network-request Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { getNetworkRequest } from './get-network-request';
import * as mcpClient from '../config/lib/mcp-client';

describe('get-network-request - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid reqid', async () => {
      mcpMock.mockResolvedValue({ url: 'https://example.com' });
      const result = await getNetworkRequest.execute({ reqid: 123 });
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'get_network_request', { reqid: 123 });
    });

    it('should accept empty input (reqid is optional)', async () => {
      mcpMock.mockResolvedValue({ url: 'https://example.com' });
      const result = await getNetworkRequest.execute({});
      expect(result.success).toBe(true);
    });

    it('should accept reqid of 0', async () => {
      mcpMock.mockResolvedValue({ url: 'https://example.com' });
      const result = await getNetworkRequest.execute({ reqid: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept large reqid', async () => {
      mcpMock.mockResolvedValue({ url: 'https://example.com' });
      const result = await getNetworkRequest.execute({ reqid: 999999 });
      expect(result.success).toBe(true);
    });

    it('should reject string reqid', async () => {
      await expect(getNetworkRequest.execute({ reqid: '123' as any })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        {},
        { reqid: 1 },
        { reqid: 100 },
        { reqid: 0 },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue({ url: 'https://example.com' });
        const result = await getNetworkRequest.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(getNetworkRequest.execute({})).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(getNetworkRequest.execute({})).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(getNetworkRequest.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('request'));
      await expect(getNetworkRequest.execute({ reqid: 999 })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(getNetworkRequest.execute({})).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(getNetworkRequest.execute({})).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(getNetworkRequest.execute({})).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject all string security inputs for reqid (number validation)', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue({ url: 'https://example.com' });
        try {
          await getNetworkRequest.execute({ reqid: scenario.input as any });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      // All should be blocked due to number validation
      expect(blockedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with request when MCP returns request', async () => {
      const requestData = { url: 'https://example.com', method: 'GET', status: 200 };
      mcpMock.mockResolvedValue(requestData);
      const result = await getNetworkRequest.execute({ reqid: 1 });
      expect(result.success).toBe(true);
      expect(result.request).toEqual(requestData);
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await getNetworkRequest.execute({});
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await getNetworkRequest.execute({});
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue([{ url: 'https://example.com' }]);
      const result = await getNetworkRequest.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ url: 'https://example.com' }, null]);
      const result = await getNetworkRequest.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { url: 'https://example.com' }, status: 'ok' });
      const result = await getNetworkRequest.execute({});
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue({ url: 'https://example.com' });
      const start = Date.now();
      for (let i = 0; i < 100; i++) await getNetworkRequest.execute({ reqid: i });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle negative reqid', async () => {
      mcpMock.mockResolvedValue({ url: 'https://example.com' });
      const result = await getNetworkRequest.execute({ reqid: -1 });
      expect(result.success).toBe(true);
    });
    it('should handle complex request object', async () => {
      const complexRequest = {
        url: 'https://api.example.com/data',
        method: 'POST',
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: '{"key": "value"}',
        timing: { duration: 150 }
      };
      mcpMock.mockResolvedValue(complexRequest);
      const result = await getNetworkRequest.execute({ reqid: 1 });
      expect(result.success).toBe(true);
      expect(result.request).toEqual(complexRequest);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue({ url: 'https://example.com' });
      await getNetworkRequest.execute({ reqid: 42 });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('get_network_request');
      expect(params).toEqual({ reqid: 42 });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(getNetworkRequest.execute({ reqid: 'invalid' as any })).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
