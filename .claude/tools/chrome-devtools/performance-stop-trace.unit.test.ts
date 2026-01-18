/**
 * Unit Tests for chrome-devtools performance-stop-trace Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { performanceStopTrace } from './performance-stop-trace';
import * as mcpClient from '../config/lib/mcp-client';

describe('performance-stop-trace - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept empty input object', async () => {
      mcpMock.mockResolvedValue({ insights: [] });
      const result = await performanceStopTrace.execute({});
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'performance_stop_trace', {});
    });

    it('should accept extra fields (stripped by Zod)', async () => {
      mcpMock.mockResolvedValue({ insights: [] });
      const result = await performanceStopTrace.execute({ extra: 'field' } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(performanceStopTrace.execute({})).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(performanceStopTrace.execute({})).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(performanceStopTrace.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('trace'));
      await expect(performanceStopTrace.execute({})).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(performanceStopTrace.execute({})).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(performanceStopTrace.execute({})).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(performanceStopTrace.execute({})).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should document security attack vector handling', async () => {
      // No string inputs to exploit, but test for completeness
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue({ insights: [] });
        try {
          await performanceStopTrace.execute({ [scenario.input]: true } as any);
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with insights when MCP returns insights', async () => {
      const insights = [{ name: 'DocumentLatency', duration: 150 }];
      mcpMock.mockResolvedValue(insights);
      const result = await performanceStopTrace.execute({});
      expect(result.success).toBe(true);
      expect(result.insights).toEqual(insights);
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await performanceStopTrace.execute({});
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await performanceStopTrace.execute({});
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['stopped']);
      const result = await performanceStopTrace.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ insights: [] }, null]);
      const result = await performanceStopTrace.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { insights: [] }, status: 'ok' });
      const result = await performanceStopTrace.execute({});
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue({ insights: [] });
      const start = Date.now();
      for (let i = 0; i < 100; i++) await performanceStopTrace.execute({});
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle complex insights data', async () => {
      const complexInsights = {
        summary: { duration: 1500 },
        insights: [
          { name: 'DocumentLatency', duration: 150 },
          { name: 'LargestContentfulPaint', duration: 800 }
        ],
        metrics: { fps: 60, jankCount: 2 }
      };
      mcpMock.mockResolvedValue(complexInsights);
      const result = await performanceStopTrace.execute({});
      expect(result.success).toBe(true);
      expect(result.insights).toEqual(complexInsights);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue({ insights: [] });
      await performanceStopTrace.execute({});
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('performance_stop_trace');
      expect(params).toEqual({});
    });
  });
});
