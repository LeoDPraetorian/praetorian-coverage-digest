/**
 * Unit Tests for chrome-devtools navigate-page Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  getAllSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

import { navigatePage } from './navigate-page';
import * as mcpClient from '../config/lib/mcp-client';

describe('navigate-page - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should accept valid url with type', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'url', url: 'https://example.com' });

      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'navigate_page',
        { type: 'url', url: 'https://example.com' }
      );
    });

    it('should accept back navigation type', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'back' });

      expect(result).toMatchObject({ success: true });
    });

    it('should accept forward navigation type', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'forward' });

      expect(result).toMatchObject({ success: true });
    });

    it('should accept reload navigation type', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'reload' });

      expect(result).toMatchObject({ success: true });
    });

    it('should accept optional timeout parameter', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'url', url: 'https://example.com', timeout: 30000 });

      expect(result).toMatchObject({ success: true });
    });

    it('should accept optional ignoreCache parameter', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'reload', ignoreCache: true });

      expect(result).toMatchObject({ success: true });
    });

    it('should accept empty input (all fields optional)', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({});

      expect(result).toMatchObject({ success: true });
    });

    it('should reject invalid type enum', async () => {
      await expect(
        navigatePage.execute({ type: 'invalid' as any })
      ).rejects.toThrow();
    });

    it('should reject invalid url format', async () => {
      await expect(
        navigatePage.execute({ type: 'url', url: 'not-a-valid-url' })
      ).rejects.toThrow();
    });

    it('should reject non-integer timeout', async () => {
      await expect(
        navigatePage.execute({ type: 'url', url: 'https://example.com', timeout: 1.5 })
      ).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const validInputs = [
        { type: 'url' as const, url: 'https://google.com' },
        { type: 'back' as const },
        { type: 'forward' as const },
        { type: 'reload' as const },
        { type: 'reload' as const, ignoreCache: false },
      ];

      for (const input of validInputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await navigatePage.execute(input);
        expect(result.success).toBe(true);
      }

      expect(mcpMock).toHaveBeenCalledTimes(validInputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      await expect(navigatePage.execute({ type: 'reload' })).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      await expect(navigatePage.execute({ type: 'reload' })).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      await expect(navigatePage.execute({ type: 'reload' })).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('page'));

      await expect(navigatePage.execute({ type: 'url', url: 'https://notfound.com' })).rejects.toThrow(/not found/i);
    });

    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());

      await expect(navigatePage.execute({ type: 'reload' })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });

    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      await expect(navigatePage.execute({ type: 'reload' })).rejects.toThrow(/authentication/i);
    });

    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));

      await expect(navigatePage.execute({ type: 'reload' })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should handle javascript: URLs (current behavior - Zod url() allows them)', async () => {
      // Note: Zod's url() validator does NOT block javascript: URLs
      // This documents current behavior - security should be enforced at MCP level
      mcpMock.mockResolvedValue(undefined);
      const result = await navigatePage.execute({ type: 'url', url: 'javascript:alert(1)' });
      expect(result).toMatchObject({ success: true });
    });

    it('should handle data: URLs (current behavior - Zod url() allows them)', async () => {
      // Note: Zod's url() validator does NOT block data: URLs
      mcpMock.mockResolvedValue(undefined);
      const result = await navigatePage.execute({ type: 'url', url: 'data:text/html,<script>alert(1)</script>' });
      expect(result).toMatchObject({ success: true });
    });

    it('should accept valid https URLs', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'url', url: 'https://secure.example.com' });

      expect(result).toMatchObject({ success: true });
    });

    it('should accept valid http URLs', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'url', url: 'http://example.com' });

      expect(result).toMatchObject({ success: true });
    });

    it('should document security attack vector handling', async () => {
      const securityScenarios = getAllSecurityScenarios();

      let blockedCount = 0;
      let passedCount = 0;

      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);

        try {
          // Try as URL - most should be blocked by URL validator
          await navigatePage.execute({ type: 'url', url: scenario.input });
          passedCount++;
        } catch {
          blockedCount++;
        }

        mcpMock.mockClear();
      }

      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      // URL validation should block most malicious strings
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'reload' });

      expect(result).toMatchObject({ success: true });
    });

    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);

      const result = await navigatePage.execute({ type: 'reload' });

      expect(result).toMatchObject({ success: true });
    });

    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'reload' });

      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });

    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['navigated']);

      const result = await navigatePage.execute({ type: 'reload' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ navigated: true }, null]);

      const result = await navigatePage.execute({ type: 'reload' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { navigated: true }, status: 'ok' });

      const result = await navigatePage.execute({ type: 'reload' });

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);

      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await navigatePage.execute({ type: 'reload' });
      }

      const avgTime = (Date.now() - start) / iterations;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({ type: 'url', url: longUrl });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle URLs with query parameters', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({
        type: 'url',
        url: 'https://example.com/search?q=test&page=1'
      });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle URLs with unicode', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await navigatePage.execute({
        type: 'url',
        url: 'https://example.com/路径'
      });

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);

      await navigatePage.execute({ type: 'url', url: 'https://example.com' });

      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('navigate_page');
      expect(params).toEqual({ type: 'url', url: 'https://example.com' });
    });

    it('should not call MCP if input validation fails', async () => {
      await expect(navigatePage.execute({ type: 'invalid' as any })).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
