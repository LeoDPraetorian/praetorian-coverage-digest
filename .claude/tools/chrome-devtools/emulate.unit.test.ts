/**
 * Unit Tests for chrome-devtools emulate Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { emulate } from './emulate';
import * as mcpClient from '../config/lib/mcp-client';

describe('emulate - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept empty input (all fields optional)', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await emulate.execute({});
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'emulate', {});
    });

    it('should accept cpuThrottlingRate within range', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await emulate.execute({ cpuThrottlingRate: 4 });
      expect(result).toMatchObject({ success: true });
    });

    it('should accept valid networkConditions enum', async () => {
      const conditions = ['No emulation', 'Offline', 'Slow 3G', 'Fast 3G', 'Slow 4G', 'Fast 4G'] as const;
      for (const networkConditions of conditions) {
        mcpMock.mockResolvedValue(undefined);
        const result = await emulate.execute({ networkConditions });
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(conditions.length);
    });

    it('should accept both params together', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await emulate.execute({ cpuThrottlingRate: 2, networkConditions: 'Slow 3G' });
      expect(result).toMatchObject({ success: true });
    });

    it('should reject cpuThrottlingRate below minimum', async () => {
      await expect(emulate.execute({ cpuThrottlingRate: 0 })).rejects.toThrow();
    });

    it('should reject cpuThrottlingRate above maximum', async () => {
      await expect(emulate.execute({ cpuThrottlingRate: 21 })).rejects.toThrow();
    });

    it('should reject invalid networkConditions enum', async () => {
      await expect(emulate.execute({ networkConditions: 'Invalid' as any })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const validInputs = [
        {},
        { cpuThrottlingRate: 1 },
        { cpuThrottlingRate: 20 },
        { networkConditions: 'Offline' as const },
        { cpuThrottlingRate: 4, networkConditions: 'Fast 4G' as const },
      ];
      for (const input of validInputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await emulate.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(validInputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(emulate.execute({})).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(emulate.execute({})).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(emulate.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('emulation'));
      await expect(emulate.execute({})).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(emulate.execute({})).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(emulate.execute({})).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(emulate.execute({})).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject string injection in cpuThrottlingRate', async () => {
      await expect(emulate.execute({ cpuThrottlingRate: '4; rm -rf /' as any })).rejects.toThrow();
    });
    it('should document security attack vector handling', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await emulate.execute({ networkConditions: scenario.input as any });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      // All should be blocked due to enum validation
      expect(blockedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await emulate.execute({});
      expect(result).toMatchObject({ success: true });
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await emulate.execute({});
      expect(result).toMatchObject({ success: true });
    });
    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await emulate.execute({});
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['emulated']);
      const result = await emulate.execute({});
      expect(result).toMatchObject({ success: true });
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ emulated: true }, null]);
      const result = await emulate.execute({});
      expect(result).toMatchObject({ success: true });
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { emulated: true }, status: 'ok' });
      const result = await emulate.execute({});
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await emulate.execute({});
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle boundary cpuThrottlingRate values', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result1 = await emulate.execute({ cpuThrottlingRate: 1 });
      expect(result1).toMatchObject({ success: true });
      const result2 = await emulate.execute({ cpuThrottlingRate: 20 });
      expect(result2).toMatchObject({ success: true });
    });
    it('should handle decimal cpuThrottlingRate (coerced)', async () => {
      mcpMock.mockResolvedValue(undefined);
      // min/max are 1-20, but decimals are valid numbers
      const result = await emulate.execute({ cpuThrottlingRate: 4.5 });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);
      await emulate.execute({ cpuThrottlingRate: 4 });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('emulate');
      expect(params).toEqual({ cpuThrottlingRate: 4 });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(emulate.execute({ cpuThrottlingRate: 0 })).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
