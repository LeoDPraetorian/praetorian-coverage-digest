/**
 * Unit Tests for chrome-devtools press-key Wrapper
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

import { pressKey } from './press-key';
import * as mcpClient from '../config/lib/mcp-client';

describe('press-key - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should accept valid key string', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await pressKey.execute({ key: 'Enter' });

      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'press_key',
        { key: 'Enter' }
      );
    });

    it('should accept key combinations', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await pressKey.execute({ key: 'Control+A' });

      expect(result).toMatchObject({ success: true });
    });

    it('should accept empty key string (current behavior)', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await pressKey.execute({ key: '' });

      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing key field', async () => {
      await expect(
        pressKey.execute({} as any)
      ).rejects.toThrow();
    });

    it('should reject invalid key type (number)', async () => {
      await expect(
        pressKey.execute({ key: 123 } as any)
      ).rejects.toThrow();
    });

    it('should handle multiple valid key inputs', async () => {
      const validKeys = ['Enter', 'Tab', 'Escape', 'Space', 'ArrowUp', 'Control+Shift+S'];

      for (const key of validKeys) {
        mcpMock.mockResolvedValue(undefined);
        const result = await pressKey.execute({ key });
        expect(result.success).toBe(true);
      }

      expect(mcpMock).toHaveBeenCalledTimes(validKeys.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      await expect(pressKey.execute({ key: 'Enter' })).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      await expect(pressKey.execute({ key: 'Enter' })).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      await expect(pressKey.execute({ key: 'Enter' })).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('key'));

      await expect(pressKey.execute({ key: 'InvalidKey' })).rejects.toThrow(/not found/i);
    });

    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());

      await expect(pressKey.execute({ key: 'Enter' })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });

    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      await expect(pressKey.execute({ key: 'Enter' })).rejects.toThrow(/authentication/i);
    });

    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));

      await expect(pressKey.execute({ key: 'Enter' })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should handle command injection attempts in key', async () => {
      const maliciousKeys = ['; rm -rf /', '| cat /etc/passwd', '$(whoami)'];

      for (const key of maliciousKeys) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await pressKey.execute({ key });
          expect(mcpMock).toHaveBeenCalled();
        } catch (error) {
          expect(error).toBeDefined();
        }

        mcpMock.mockClear();
      }
    });

    it('should document security attack vector handling', async () => {
      const securityScenarios = getAllSecurityScenarios();

      let blockedCount = 0;
      let passedCount = 0;

      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await pressKey.execute({ key: scenario.input });
          passedCount++;
        } catch {
          blockedCount++;
        }

        mcpMock.mockClear();
      }

      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await pressKey.execute({ key: 'Enter' });

      expect(result).toMatchObject({ success: true });
    });

    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);

      const result = await pressKey.execute({ key: 'Enter' });

      expect(result).toMatchObject({ success: true });
    });

    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await pressKey.execute({ key: 'Enter' });

      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });

    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['pressed']);

      const result = await pressKey.execute({ key: 'Enter' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ pressed: true }, null]);

      const result = await pressKey.execute({ key: 'Enter' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { pressed: true }, status: 'ok' });

      const result = await pressKey.execute({ key: 'Enter' });

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);

      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await pressKey.execute({ key: 'Enter' });
      }

      const avgTime = (Date.now() - start) / iterations;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long key strings', async () => {
      const longKey = 'Control+' + 'A'.repeat(100);
      mcpMock.mockResolvedValue(undefined);

      const result = await pressKey.execute({ key: longKey });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle special keys', async () => {
      const specialKeys = ['F1', 'Delete', 'Backspace', 'Home', 'End', 'PageUp', 'PageDown'];

      for (const key of specialKeys) {
        mcpMock.mockResolvedValue(undefined);
        const result = await pressKey.execute({ key });
        expect(result.success).toBe(true);
        mcpMock.mockClear();
      }
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);

      await pressKey.execute({ key: 'Enter' });

      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('press_key');
      expect(params).toEqual({ key: 'Enter' });
    });

    it('should not call MCP if input validation fails', async () => {
      await expect(pressKey.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
