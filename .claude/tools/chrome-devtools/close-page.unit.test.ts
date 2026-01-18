/**
 * Unit Tests for chrome-devtools close-page Wrapper
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

import { closePage } from './close-page';
import * as mcpClient from '../config/lib/mcp-client';

describe('close-page - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should accept valid pageIdx number', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await closePage.execute({ pageIdx: 0 });

      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'close_page',
        { pageIdx: 0 }
      );
    });

    it('should accept positive pageIdx', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await closePage.execute({ pageIdx: 5 });

      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing pageIdx field', async () => {
      await expect(
        closePage.execute({} as any)
      ).rejects.toThrow();
    });

    it('should reject invalid pageIdx type (string)', async () => {
      await expect(
        closePage.execute({ pageIdx: '0' } as any)
      ).rejects.toThrow();
    });

    it('should reject invalid pageIdx type (null)', async () => {
      await expect(
        closePage.execute({ pageIdx: null } as any)
      ).rejects.toThrow();
    });

    it('should reject non-integer pageIdx', async () => {
      await expect(
        closePage.execute({ pageIdx: 1.5 })
      ).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const validInputs = [0, 1, 2, 10, 100];

      for (const pageIdx of validInputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await closePage.execute({ pageIdx });
        expect(result.success).toBe(true);
      }

      expect(mcpMock).toHaveBeenCalledTimes(validInputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      await expect(closePage.execute({ pageIdx: 0 })).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      await expect(closePage.execute({ pageIdx: 0 })).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      await expect(closePage.execute({ pageIdx: 0 })).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('page'));

      await expect(closePage.execute({ pageIdx: 999 })).rejects.toThrow(/not found/i);
    });

    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());

      await expect(closePage.execute({ pageIdx: 0 })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });

    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      await expect(closePage.execute({ pageIdx: 0 })).rejects.toThrow(/authentication/i);
    });

    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));

      await expect(closePage.execute({ pageIdx: 0 })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    // Note: pageIdx is a number, not string, so security tests are less applicable
    // but we include them for completeness and to ensure the wrapper handles edge cases

    it('should handle negative page indices', async () => {
      mcpMock.mockResolvedValue(undefined);

      // Negative numbers are valid integers, wrapper passes through to MCP
      const result = await closePage.execute({ pageIdx: -1 });
      expect(result).toMatchObject({ success: true });
    });

    it('should document security attack vector handling (via type coercion)', async () => {
      const securityScenarios = getAllSecurityScenarios();

      let blockedCount = 0;
      let passedCount = 0;

      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);

        try {
          // Attempt to pass string input (should be rejected by Zod)
          await closePage.execute({ pageIdx: scenario.input as any });
          passedCount++;
        } catch {
          blockedCount++;
        }

        mcpMock.mockClear();
      }

      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      // All should be blocked because pageIdx expects number, not string
      expect(blockedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await closePage.execute({ pageIdx: 0 });

      expect(result).toMatchObject({ success: true });
    });

    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);

      const result = await closePage.execute({ pageIdx: 0 });

      expect(result).toMatchObject({ success: true });
    });

    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await closePage.execute({ pageIdx: 0 });

      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });

    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['closed']);

      const result = await closePage.execute({ pageIdx: 0 });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ closed: true }, null]);

      const result = await closePage.execute({ pageIdx: 0 });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { closed: true }, status: 'ok' });

      const result = await closePage.execute({ pageIdx: 0 });

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);

      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await closePage.execute({ pageIdx: i % 10 });
      }

      const avgTime = (Date.now() - start) / iterations;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large page indices', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await closePage.execute({ pageIdx: 999999 });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle zero page index', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await closePage.execute({ pageIdx: 0 });

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);

      await closePage.execute({ pageIdx: 2 });

      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('close_page');
      expect(params).toEqual({ pageIdx: 2 });
    });

    it('should not call MCP if input validation fails', async () => {
      await expect(closePage.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
