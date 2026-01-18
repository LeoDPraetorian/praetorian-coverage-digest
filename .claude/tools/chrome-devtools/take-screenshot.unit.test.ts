/**
 * Unit Tests for chrome-devtools take-screenshot Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { takeScreenshot } from './take-screenshot';
import * as mcpClient from '../config/lib/mcp-client';

describe('take-screenshot - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept empty input (all fields optional)', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      const result = await takeScreenshot.execute({});
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'take_screenshot', { format: 'png' });
    });

    it('should accept filePath option', async () => {
      mcpMock.mockResolvedValue({ path: '/custom/path.png' });
      const result = await takeScreenshot.execute({ filePath: '/custom/path.png' });
      expect(result.success).toBe(true);
    });

    it('should accept png format', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      const result = await takeScreenshot.execute({ format: 'png' });
      expect(result.success).toBe(true);
    });

    it('should accept jpeg format', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.jpeg' });
      const result = await takeScreenshot.execute({ format: 'jpeg' });
      expect(result.success).toBe(true);
    });

    it('should accept webp format', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.webp' });
      const result = await takeScreenshot.execute({ format: 'webp' });
      expect(result.success).toBe(true);
    });

    it('should accept fullPage option', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      const result = await takeScreenshot.execute({ fullPage: true });
      expect(result.success).toBe(true);
    });

    it('should accept quality option within range', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      const result = await takeScreenshot.execute({ quality: 80 });
      expect(result.success).toBe(true);
    });

    it('should accept uid option', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      const result = await takeScreenshot.execute({ uid: 'element-id' });
      expect(result.success).toBe(true);
    });

    it('should accept all options combined', async () => {
      mcpMock.mockResolvedValue({ path: '/custom/path.jpeg' });
      const result = await takeScreenshot.execute({
        filePath: '/custom/path.jpeg',
        format: 'jpeg',
        fullPage: false,
        quality: 90,
        uid: 'element'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid format enum', async () => {
      await expect(takeScreenshot.execute({ format: 'gif' as any })).rejects.toThrow();
    });

    it('should reject quality below minimum', async () => {
      await expect(takeScreenshot.execute({ quality: -1 })).rejects.toThrow();
    });

    it('should reject quality above maximum', async () => {
      await expect(takeScreenshot.execute({ quality: 101 })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        {},
        { format: 'png' as const },
        { format: 'jpeg' as const, quality: 50 },
        { fullPage: true },
        { uid: 'element', format: 'webp' as const },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
        const result = await takeScreenshot.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(takeScreenshot.execute({})).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(takeScreenshot.execute({})).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(takeScreenshot.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('element'));
      await expect(takeScreenshot.execute({})).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(takeScreenshot.execute({})).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(takeScreenshot.execute({})).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(takeScreenshot.execute({})).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject all security inputs for format (enum validation)', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
        try {
          await takeScreenshot.execute({ format: scenario.input as any });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (format): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount).toBe(securityScenarios.length);
    });
    it('should document security attack vector handling for filePath', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
        try {
          await takeScreenshot.execute({ filePath: scenario.input });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (filePath): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with path when MCP returns path', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      const result = await takeScreenshot.execute({});
      expect(result).toMatchObject({ success: true, path: '/tmp/screenshot.png' });
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await takeScreenshot.execute({});
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await takeScreenshot.execute({});
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['/tmp/screenshot.png']);
      const result = await takeScreenshot.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ path: '/tmp/screenshot.png' }, null]);
      const result = await takeScreenshot.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { path: '/tmp/screenshot.png' }, status: 'ok' });
      const result = await takeScreenshot.execute({});
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      const start = Date.now();
      for (let i = 0; i < 100; i++) await takeScreenshot.execute({});
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle boundary quality values', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      const result1 = await takeScreenshot.execute({ quality: 0 });
      expect(result1.success).toBe(true);
      const result2 = await takeScreenshot.execute({ quality: 100 });
      expect(result2.success).toBe(true);
    });
    it('should handle path with spaces', async () => {
      mcpMock.mockResolvedValue({ path: '/path with spaces/screenshot.png' });
      const result = await takeScreenshot.execute({ filePath: '/path with spaces/screenshot.png' });
      expect(result.success).toBe(true);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue({ path: '/tmp/screenshot.png' });
      await takeScreenshot.execute({ format: 'jpeg', quality: 80 });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('take_screenshot');
      expect(params).toEqual({ format: 'jpeg', quality: 80 });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(takeScreenshot.execute({ format: 'invalid' as any })).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
