/**
 * Unit Tests for chrome-devtools performance-analyze-insight Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { performanceAnalyzeInsight } from './performance-analyze-insight';
import * as mcpClient from '../config/lib/mcp-client';

describe('performance-analyze-insight - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid insightSetId and insightName', async () => {
      mcpMock.mockResolvedValue({ analysis: 'result' });
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'performance_analyze_insight',
        { insightSetId: 'set-123', insightName: 'DocumentLatency' }
      );
    });

    it('should reject missing insightSetId field', async () => {
      await expect(performanceAnalyzeInsight.execute({ insightName: 'DocumentLatency' } as any)).rejects.toThrow();
    });

    it('should reject missing insightName field', async () => {
      await expect(performanceAnalyzeInsight.execute({ insightSetId: 'set-123' } as any)).rejects.toThrow();
    });

    it('should reject empty insightSetId', async () => {
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: '',
        insightName: 'DocumentLatency'
      })).rejects.toThrow();
    });

    it('should reject empty insightName', async () => {
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: ''
      })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { insightSetId: 'set-1', insightName: 'DocumentLatency' },
        { insightSetId: 'set-2', insightName: 'LargestContentfulPaint' },
        { insightSetId: 'set-3', insightName: 'CumulativeLayoutShift' },
        { insightSetId: 'uuid-abc-123', insightName: 'FirstInputDelay' },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue({ analysis: 'result' });
        const result = await performanceAnalyzeInsight.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('insight'));
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: 'set-999',
        insightName: 'Unknown'
      })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should document security attack vector handling for insightSetId', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue({ analysis: 'result' });
        try {
          await performanceAnalyzeInsight.execute({
            insightSetId: scenario.input,
            insightName: 'DocumentLatency'
          });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (insightSetId): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
    it('should document security attack vector handling for insightName', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue({ analysis: 'result' });
        try {
          await performanceAnalyzeInsight.execute({
            insightSetId: 'set-123',
            insightName: scenario.input
          });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (insightName): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with insight when MCP returns insight', async () => {
      const insightData = { duration: 150, breakdown: [] };
      mcpMock.mockResolvedValue(insightData);
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      expect(result.success).toBe(true);
      expect(result.insight).toEqual(insightData);
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['analysis result']);
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ insight: 'data' }, null]);
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { insight: 'data' }, status: 'ok' });
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue({ analysis: 'result' });
      const start = Date.now();
      for (let i = 0; i < 100; i++) await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long insight names', async () => {
      mcpMock.mockResolvedValue({ analysis: 'result' });
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'VeryLongInsightNameThatMightExistInSomeSystemsWithoutLimit'
      });
      expect(result.success).toBe(true);
    });
    it('should handle complex insight data', async () => {
      const complexInsight = {
        name: 'DocumentLatency',
        duration: 150,
        breakdown: [
          { phase: 'connect', duration: 20 },
          { phase: 'request', duration: 50 },
          { phase: 'response', duration: 80 }
        ],
        metadata: { url: 'https://example.com', timestamp: Date.now() }
      };
      mcpMock.mockResolvedValue(complexInsight);
      const result = await performanceAnalyzeInsight.execute({
        insightSetId: 'set-123',
        insightName: 'DocumentLatency'
      });
      expect(result.success).toBe(true);
      expect(result.insight).toEqual(complexInsight);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue({ analysis: 'result' });
      await performanceAnalyzeInsight.execute({
        insightSetId: 'set-abc',
        insightName: 'LCP'
      });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('performance_analyze_insight');
      expect(params).toEqual({ insightSetId: 'set-abc', insightName: 'LCP' });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(performanceAnalyzeInsight.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
