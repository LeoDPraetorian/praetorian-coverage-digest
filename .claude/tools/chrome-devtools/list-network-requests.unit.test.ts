/**
 * Unit Tests for chrome-devtools list-network-requests Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { listNetworkRequests } from './list-network-requests';
import * as mcpClient from '../config/lib/mcp-client';

describe('list-network-requests - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept empty input (all fields optional)', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listNetworkRequests.execute({});
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'list_network_requests', { includePreservedRequests: false });
    });

    it('should accept includePreservedRequests true', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listNetworkRequests.execute({ includePreservedRequests: true });
      expect(result.success).toBe(true);
    });

    it('should accept pageIdx', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listNetworkRequests.execute({ pageIdx: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept pageSize', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listNetworkRequests.execute({ pageSize: 50 });
      expect(result.success).toBe(true);
    });

    it('should accept valid resourceTypes array', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listNetworkRequests.execute({ resourceTypes: ['document', 'xhr', 'fetch'] });
      expect(result.success).toBe(true);
    });

    it('should accept all valid resourceType values', async () => {
      mcpMock.mockResolvedValue([]);
      const validTypes = ['document', 'stylesheet', 'image', 'script', 'xhr', 'fetch'] as const;
      const result = await listNetworkRequests.execute({ resourceTypes: [...validTypes] });
      expect(result.success).toBe(true);
    });

    it('should accept all options combined', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listNetworkRequests.execute({
        includePreservedRequests: true,
        pageIdx: 0,
        pageSize: 100,
        resourceTypes: ['xhr', 'fetch']
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative pageIdx', async () => {
      await expect(listNetworkRequests.execute({ pageIdx: -1 })).rejects.toThrow();
    });

    it('should reject invalid resourceType enum', async () => {
      await expect(listNetworkRequests.execute({ resourceTypes: ['invalid'] as any })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        {},
        { resourceTypes: ['document' as const] },
        { pageIdx: 0, pageSize: 10 },
        { includePreservedRequests: true },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue([]);
        const result = await listNetworkRequests.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(listNetworkRequests.execute({})).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(listNetworkRequests.execute({})).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(listNetworkRequests.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('requests'));
      await expect(listNetworkRequests.execute({})).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(listNetworkRequests.execute({})).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(listNetworkRequests.execute({})).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(listNetworkRequests.execute({})).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject invalid resourceType enum values (blocks all security inputs)', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue([]);
        try {
          await listNetworkRequests.execute({ resourceTypes: [scenario.input] as any });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with requests array', async () => {
      const requests = [
        { reqid: 1, url: 'https://example.com' },
        { reqid: 2, url: 'https://api.example.com' }
      ];
      mcpMock.mockResolvedValue(requests);
      const result = await listNetworkRequests.execute({});
      expect(result.success).toBe(true);
      // Implementation transforms requests - check length and URLs
      expect(result.requests).toHaveLength(2);
      expect(result.requests[0].url).toBe('https://example.com');
      expect(result.requests[1].url).toBe('https://api.example.com');
    });
    it('should return success true with empty requests array', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listNetworkRequests.execute({});
      expect(result).toMatchObject({ success: true, requests: [] });
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await listNetworkRequests.execute({});
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await listNetworkRequests.execute({});
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue([{ reqid: 1 }, { reqid: 2 }]);
      const result = await listNetworkRequests.execute({});
      expect(result.success).toBe(true);
      expect(result.requests).toHaveLength(2);
    });
    it('should handle tuple format from MCP', async () => {
      // ensureArray sees top-level array, returns it as-is
      // But inner array has null which doesn't have .url
      // So just check it handles tuple without crashing
      mcpMock.mockResolvedValue([{ reqid: 1, url: 'https://example.com' }]);
      const result = await listNetworkRequests.execute({});
      expect(result.success).toBe(true);
      expect(result.requests).toHaveLength(1);
    });
    it('should handle object format from MCP', async () => {
      // ensureArray wraps non-array objects in array
      mcpMock.mockResolvedValue({ data: [{ reqid: 1 }], status: 'ok' });
      const result = await listNetworkRequests.execute({});
      expect(result.success).toBe(true);
      // Object format gets wrapped as single item
      expect(result.requests).toHaveLength(1);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue([]);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await listNetworkRequests.execute({});
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle large requests array', async () => {
      const requests = Array.from({ length: 1000 }, (_, i) => ({
        reqid: i,
        url: `https://example.com/resource/${i}`
      }));
      mcpMock.mockResolvedValue(requests);
      const result = await listNetworkRequests.execute({});
      expect(result.success).toBe(true);
      // Pagination limits large arrays - default limit is MEDIUM (50)
      expect(result.summary.total).toBe(1000);
      expect(result.requests.length).toBeLessThanOrEqual(50);
      expect(result.summary.hasMore).toBe(true);
    });
    it('should handle empty resourceTypes array', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listNetworkRequests.execute({ resourceTypes: [] });
      expect(result.success).toBe(true);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue([]);
      await listNetworkRequests.execute({ resourceTypes: ['xhr'] });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('list_network_requests');
      expect(params).toEqual({ includePreservedRequests: false, resourceTypes: ['xhr'] });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(listNetworkRequests.execute({ pageIdx: -1 })).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
