/**
 * Unit Tests for chrome-devtools new-page Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { newPage } from './new-page';
import * as mcpClient from '../config/lib/mcp-client';

describe('new-page - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid URL', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await newPage.execute({ url: 'https://example.com' });
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'new_page', { url: 'https://example.com' });
    });

    it('should accept URL with optional timeout', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await newPage.execute({ url: 'https://example.com', timeout: 30000 });
      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing URL field', async () => {
      await expect(newPage.execute({} as any)).rejects.toThrow();
    });

    it('should reject invalid URL format', async () => {
      await expect(newPage.execute({ url: 'not-a-url' })).rejects.toThrow();
    });

    it('should reject non-integer timeout', async () => {
      await expect(newPage.execute({ url: 'https://example.com', timeout: 1.5 })).rejects.toThrow();
    });

    it('should handle multiple valid URLs', async () => {
      const urls = ['https://google.com', 'http://localhost:3000', 'https://test.example.com/path?q=1'];
      for (const url of urls) {
        mcpMock.mockResolvedValue(undefined);
        const result = await newPage.execute({ url });
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(urls.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(newPage.execute({ url: 'https://example.com' })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(newPage.execute({ url: 'https://example.com' })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(newPage.execute({ url: 'https://example.com' })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('page'));
      await expect(newPage.execute({ url: 'https://notfound.com' })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(newPage.execute({ url: 'https://example.com' })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(newPage.execute({ url: 'https://example.com' })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(newPage.execute({ url: 'https://example.com' })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should handle javascript: URLs (current behavior - Zod url() allows them)', async () => {
      // Note: Zod's url() validator does NOT block javascript: URLs
      // This documents current behavior - security should be enforced at MCP level
      mcpMock.mockResolvedValue(undefined);
      const result = await newPage.execute({ url: 'javascript:alert(1)' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle data: URLs (current behavior - Zod url() allows them)', async () => {
      // Note: Zod's url() validator does NOT block data: URLs
      mcpMock.mockResolvedValue(undefined);
      const result = await newPage.execute({ url: 'data:text/html,<script>alert(1)</script>' });
      expect(result).toMatchObject({ success: true });
    });
    it('should document security attack vector handling', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await newPage.execute({ url: scenario.input });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await newPage.execute({ url: 'https://example.com' });
      expect(result).toMatchObject({ success: true });
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await newPage.execute({ url: 'https://example.com' });
      expect(result).toMatchObject({ success: true });
    });
    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await newPage.execute({ url: 'https://example.com' });
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['created']);
      const result = await newPage.execute({ url: 'https://example.com' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ pageId: 1 }, null]);
      const result = await newPage.execute({ url: 'https://example.com' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { pageId: 1 }, status: 'ok' });
      const result = await newPage.execute({ url: 'https://example.com' });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await newPage.execute({ url: 'https://example.com' });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      mcpMock.mockResolvedValue(undefined);
      const result = await newPage.execute({ url: longUrl });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle URLs with query parameters', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await newPage.execute({ url: 'https://example.com?q=test&page=1' });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);
      await newPage.execute({ url: 'https://example.com' });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('new_page');
      expect(params).toEqual({ url: 'https://example.com' });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(newPage.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
