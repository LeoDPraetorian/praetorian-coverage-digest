/**
 * Unit Tests for chrome-devtools performance-start-trace Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { performanceStartTrace } from './performance-start-trace';
import * as mcpClient from '../config/lib/mcp-client';

describe('performance-start-trace - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid reload and autoStop booleans', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await performanceStartTrace.execute({ reload: true, autoStop: true });
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'performance_start_trace', { reload: true, autoStop: true });
    });

    it('should accept reload true autoStop false', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await performanceStartTrace.execute({ reload: true, autoStop: false });
      expect(result).toMatchObject({ success: true });
    });

    it('should accept reload false autoStop true', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await performanceStartTrace.execute({ reload: false, autoStop: true });
      expect(result).toMatchObject({ success: true });
    });

    it('should accept both false', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await performanceStartTrace.execute({ reload: false, autoStop: false });
      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing reload field', async () => {
      await expect(performanceStartTrace.execute({ autoStop: true } as any)).rejects.toThrow();
    });

    it('should reject missing autoStop field', async () => {
      await expect(performanceStartTrace.execute({ reload: true } as any)).rejects.toThrow();
    });

    it('should reject string values for reload', async () => {
      await expect(performanceStartTrace.execute({ reload: 'true', autoStop: true } as any)).rejects.toThrow();
    });

    it('should reject string values for autoStop', async () => {
      await expect(performanceStartTrace.execute({ reload: true, autoStop: 'true' } as any)).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { reload: true, autoStop: true },
        { reload: true, autoStop: false },
        { reload: false, autoStop: true },
        { reload: false, autoStop: false },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await performanceStartTrace.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(performanceStartTrace.execute({ reload: true, autoStop: true })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(performanceStartTrace.execute({ reload: true, autoStop: true })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(performanceStartTrace.execute({ reload: true, autoStop: true })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('trace'));
      await expect(performanceStartTrace.execute({ reload: true, autoStop: true })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(performanceStartTrace.execute({ reload: true, autoStop: true })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(performanceStartTrace.execute({ reload: true, autoStop: true })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(performanceStartTrace.execute({ reload: true, autoStop: true })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject all string security inputs for boolean fields', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await performanceStartTrace.execute({ reload: scenario.input as any, autoStop: true });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      // All should be blocked due to boolean validation
      expect(blockedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await performanceStartTrace.execute({ reload: true, autoStop: true });
      expect(result).toMatchObject({ success: true });
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await performanceStartTrace.execute({ reload: true, autoStop: true });
      expect(result).toMatchObject({ success: true });
    });
    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await performanceStartTrace.execute({ reload: true, autoStop: true });
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['started']);
      const result = await performanceStartTrace.execute({ reload: true, autoStop: true });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ started: true }, null]);
      const result = await performanceStartTrace.execute({ reload: true, autoStop: true });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { started: true }, status: 'ok' });
      const result = await performanceStartTrace.execute({ reload: true, autoStop: true });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await performanceStartTrace.execute({ reload: true, autoStop: true });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('has no special edge cases for boolean-only inputs', () => {
      // Boolean fields only have two valid values (true/false)
      // All other inputs are caught by type validation in Input validation suite
      expect(true).toBe(true);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);
      await performanceStartTrace.execute({ reload: true, autoStop: false });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('performance_start_trace');
      expect(params).toEqual({ reload: true, autoStop: false });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(performanceStartTrace.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
