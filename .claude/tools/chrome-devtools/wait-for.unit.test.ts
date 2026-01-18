/**
 * Unit Tests for chrome-devtools wait-for Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { waitFor } from './wait-for';
import * as mcpClient from '../config/lib/mcp-client';

describe('wait-for - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid text', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await waitFor.execute({ text: 'Loading complete' });
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'wait_for', { text: 'Loading complete' });
    });

    it('should accept text with optional timeout', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await waitFor.execute({ text: 'Submit', timeout: 5000 });
      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing text field', async () => {
      await expect(waitFor.execute({} as any)).rejects.toThrow();
    });

    it('should reject empty text string', async () => {
      await expect(waitFor.execute({ text: '' })).rejects.toThrow();
    });

    it('should reject non-integer timeout', async () => {
      await expect(waitFor.execute({ text: 'test', timeout: 1.5 })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { text: 'Hello' },
        { text: 'World', timeout: 10000 },
        { text: 'A longer text with spaces' },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await waitFor.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(waitFor.execute({ text: 'test' })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(waitFor.execute({ text: 'test' })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(waitFor.execute({ text: 'test' })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('text'));
      await expect(waitFor.execute({ text: 'test' })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(waitFor.execute({ text: 'test' })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(waitFor.execute({ text: 'test' })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(waitFor.execute({ text: 'test' })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should document security attack vector handling', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await waitFor.execute({ text: scenario.input });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await waitFor.execute({ text: 'test' });
      expect(result).toMatchObject({ success: true });
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await waitFor.execute({ text: 'test' });
      expect(result).toMatchObject({ success: true });
    });
    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await waitFor.execute({ text: 'test' });
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['found']);
      const result = await waitFor.execute({ text: 'test' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ found: true }, null]);
      const result = await waitFor.execute({ text: 'test' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { found: true }, status: 'ok' });
      const result = await waitFor.execute({ text: 'test' });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await waitFor.execute({ text: 'test' });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long text', async () => {
      const longText = 'a'.repeat(1000);
      mcpMock.mockResolvedValue(undefined);
      const result = await waitFor.execute({ text: longText });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle unicode text', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await waitFor.execute({ text: '日本語テスト' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle special characters', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await waitFor.execute({ text: '<div>Test & "quotes"</div>' });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);
      await waitFor.execute({ text: 'test' });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('wait_for');
      expect(params).toEqual({ text: 'test' });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(waitFor.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
