/**
 * Unit Tests for chrome-devtools resize-page Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { resizePage } from './resize-page';
import * as mcpClient from '../config/lib/mcp-client';

describe('resize-page - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid width and height', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await resizePage.execute({ width: 1920, height: 1080 });
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'resize_page', { width: 1920, height: 1080 });
    });

    it('should accept small dimensions', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await resizePage.execute({ width: 320, height: 480 });
      expect(result).toMatchObject({ success: true });
    });

    it('should accept zero dimensions', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await resizePage.execute({ width: 0, height: 0 });
      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing width field', async () => {
      await expect(resizePage.execute({ height: 1080 } as any)).rejects.toThrow();
    });

    it('should reject missing height field', async () => {
      await expect(resizePage.execute({ width: 1920 } as any)).rejects.toThrow();
    });

    it('should reject invalid width type (string)', async () => {
      await expect(resizePage.execute({ width: '1920', height: 1080 } as any)).rejects.toThrow();
    });

    it('should reject invalid height type (null)', async () => {
      await expect(resizePage.execute({ width: 1920, height: null } as any)).rejects.toThrow();
    });

    it('should handle multiple valid dimensions', async () => {
      const dimensions = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 375, height: 812 },
        { width: 768, height: 1024 },
      ];
      for (const dim of dimensions) {
        mcpMock.mockResolvedValue(undefined);
        const result = await resizePage.execute(dim);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(dimensions.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(resizePage.execute({ width: 1920, height: 1080 })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(resizePage.execute({ width: 1920, height: 1080 })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(resizePage.execute({ width: 1920, height: 1080 })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('page'));
      await expect(resizePage.execute({ width: 1920, height: 1080 })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(resizePage.execute({ width: 1920, height: 1080 })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(resizePage.execute({ width: 1920, height: 1080 })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(resizePage.execute({ width: 1920, height: 1080 })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject string inputs (type coercion attack)', async () => {
      // Security: Number inputs prevent string injection attacks
      await expect(resizePage.execute({ width: '1920; rm -rf /', height: 1080 } as any)).rejects.toThrow();
    });
    it('should document security attack vector handling', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await resizePage.execute({ width: scenario.input as any, height: 1080 });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await resizePage.execute({ width: 1920, height: 1080 });
      expect(result).toMatchObject({ success: true });
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await resizePage.execute({ width: 1920, height: 1080 });
      expect(result).toMatchObject({ success: true });
    });
    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await resizePage.execute({ width: 1920, height: 1080 });
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['resized']);
      const result = await resizePage.execute({ width: 1920, height: 1080 });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ resized: true }, null]);
      const result = await resizePage.execute({ width: 1920, height: 1080 });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { resized: true }, status: 'ok' });
      const result = await resizePage.execute({ width: 1920, height: 1080 });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await resizePage.execute({ width: 1920, height: 1080 });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large dimensions', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await resizePage.execute({ width: 10000, height: 10000 });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle negative dimensions', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await resizePage.execute({ width: -100, height: -100 });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle decimal dimensions (rounded)', async () => {
      // z.number() without .int() allows decimals
      mcpMock.mockResolvedValue(undefined);
      const result = await resizePage.execute({ width: 1920.5, height: 1080.5 });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);
      await resizePage.execute({ width: 1920, height: 1080 });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('resize_page');
      expect(params).toEqual({ width: 1920, height: 1080 });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(resizePage.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
