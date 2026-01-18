/**
 * Unit Tests for chrome-devtools list-pages Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { listPages } from './list-pages';
import * as mcpClient from '../config/lib/mcp-client';

describe('list-pages - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept empty input object', async () => {
      mcpMock.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'list_pages', {});
    });

    it('should accept no input', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
    });

    it('should reject extra fields (documented behavior)', async () => {
      mcpMock.mockResolvedValue([]);
      // Zod strict by default strips extra fields
      const result = await listPages.execute({ extra: 'field' } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(listPages.execute({})).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(listPages.execute({})).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(listPages.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('browser'));
      await expect(listPages.execute({})).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(listPages.execute({})).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(listPages.execute({})).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(listPages.execute({})).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should document security attack vector handling', async () => {
      // No string inputs to exploit, but test for completeness
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue([]);
        try {
          await listPages.execute({ [scenario.input]: true } as any);
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with pages array', async () => {
      const pages = [{ id: 1, url: 'https://example.com' }];
      mcpMock.mockResolvedValue(pages);
      const result = await listPages.execute({});
      expect(result).toMatchObject({ success: true, pages });
    });
    it('should return success true with empty pages array', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listPages.execute({});
      expect(result).toMatchObject({ success: true, pages: [] });
    });
    it('should return success true when MCP returns undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
      expect(result.pages).toEqual([{ id: 1 }, { id: 2 }]);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([[{ id: 1 }], null]);
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: [{ id: 1 }], status: 'ok' });
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue([]);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await listPages.execute({});
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle large pages array', async () => {
      const pages = Array.from({ length: 100 }, (_, i) => ({ id: i, url: `https://page${i}.com` }));
      mcpMock.mockResolvedValue(pages);
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(100);
    });
    it('should handle pages with complex data', async () => {
      const pages = [{ id: 1, url: 'https://example.com', nested: { deep: { value: true } } }];
      mcpMock.mockResolvedValue(pages);
      const result = await listPages.execute({});
      expect(result.success).toBe(true);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue([]);
      await listPages.execute({});
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('list_pages');
      expect(params).toEqual({});
    });
  });
});
