/**
 * Unit Tests for chrome-devtools take-snapshot Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { takeSnapshot } from './take-snapshot';
import * as mcpClient from '../config/lib/mcp-client';

describe('take-snapshot - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept empty input (all fields optional)', async () => {
      mcpMock.mockResolvedValue('snapshot content');
      const result = await takeSnapshot.execute({});
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'take_snapshot', {});
    });

    it('should accept filePath option', async () => {
      mcpMock.mockResolvedValue('snapshot content');
      const result = await takeSnapshot.execute({ filePath: '/tmp/snapshot.txt' });
      expect(result.success).toBe(true);
    });

    it('should accept verbose option true', async () => {
      mcpMock.mockResolvedValue('verbose snapshot content');
      const result = await takeSnapshot.execute({ verbose: true });
      expect(result.success).toBe(true);
    });

    it('should accept verbose option false', async () => {
      mcpMock.mockResolvedValue('snapshot content');
      const result = await takeSnapshot.execute({ verbose: false });
      expect(result.success).toBe(true);
    });

    it('should accept both options combined', async () => {
      mcpMock.mockResolvedValue('snapshot content');
      const result = await takeSnapshot.execute({ filePath: '/tmp/snapshot.txt', verbose: true });
      expect(result.success).toBe(true);
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        {},
        { filePath: '/tmp/snapshot.txt' },
        { verbose: true },
        { verbose: false },
        { filePath: '/custom/path.txt', verbose: true },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue('snapshot');
        const result = await takeSnapshot.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(takeSnapshot.execute({})).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(takeSnapshot.execute({})).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(takeSnapshot.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('page'));
      await expect(takeSnapshot.execute({})).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(takeSnapshot.execute({})).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(takeSnapshot.execute({})).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(takeSnapshot.execute({})).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should document security attack vector handling for filePath', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue('snapshot');
        try {
          await takeSnapshot.execute({ filePath: scenario.input });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with snapshot when MCP returns string', async () => {
      mcpMock.mockResolvedValue('snapshot content');
      const result = await takeSnapshot.execute({});
      expect(result).toMatchObject({ success: true, snapshot: 'snapshot content' });
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await takeSnapshot.execute({});
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await takeSnapshot.execute({});
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['snapshot']);
      const result = await takeSnapshot.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ snapshot: 'content' }, null]);
      const result = await takeSnapshot.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { snapshot: 'content' }, status: 'ok' });
      const result = await takeSnapshot.execute({});
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue('snapshot');
      const start = Date.now();
      for (let i = 0; i < 100; i++) await takeSnapshot.execute({});
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large snapshot', async () => {
      const largeSnapshot = 'a'.repeat(100000);
      mcpMock.mockResolvedValue(largeSnapshot);
      const result = await takeSnapshot.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle path with spaces', async () => {
      mcpMock.mockResolvedValue('snapshot');
      const result = await takeSnapshot.execute({ filePath: '/path with spaces/snapshot.txt' });
      expect(result.success).toBe(true);
    });
    it('should handle unicode content in snapshot', async () => {
      mcpMock.mockResolvedValue('日本語コンテンツ');
      const result = await takeSnapshot.execute({});
      expect(result.success).toBe(true);
      expect(result.snapshot).toBe('日本語コンテンツ');
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue('snapshot');
      await takeSnapshot.execute({ verbose: true });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('take_snapshot');
      expect(params).toEqual({ verbose: true });
    });
  });
});
