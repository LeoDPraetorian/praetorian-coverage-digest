/**
 * Unit Tests for chrome-devtools get-console-message Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { getConsoleMessage } from './get-console-message';
import * as mcpClient from '../config/lib/mcp-client';

describe('get-console-message - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid msgid', async () => {
      mcpMock.mockResolvedValue({ text: 'Console message' });
      const result = await getConsoleMessage.execute({ msgid: 123 });
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'get_console_message', { msgid: 123 });
    });

    it('should accept msgid of 0', async () => {
      mcpMock.mockResolvedValue({ text: 'First message' });
      const result = await getConsoleMessage.execute({ msgid: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept large msgid', async () => {
      mcpMock.mockResolvedValue({ text: 'Message' });
      const result = await getConsoleMessage.execute({ msgid: 999999 });
      expect(result.success).toBe(true);
    });

    it('should reject missing msgid field', async () => {
      await expect(getConsoleMessage.execute({} as any)).rejects.toThrow();
    });

    it('should reject string msgid', async () => {
      await expect(getConsoleMessage.execute({ msgid: '123' as any })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { msgid: 1 },
        { msgid: 10 },
        { msgid: 100 },
        { msgid: 1000 },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue({ text: 'message' });
        const result = await getConsoleMessage.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(getConsoleMessage.execute({ msgid: 1 })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(getConsoleMessage.execute({ msgid: 1 })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(getConsoleMessage.execute({ msgid: 1 })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('message'));
      await expect(getConsoleMessage.execute({ msgid: 999 })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(getConsoleMessage.execute({ msgid: 1 })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(getConsoleMessage.execute({ msgid: 1 })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(getConsoleMessage.execute({ msgid: 1 })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject all string security inputs (number validation)', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue({ text: 'message' });
        try {
          await getConsoleMessage.execute({ msgid: scenario.input as any });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      // All should be blocked due to number validation
      expect(blockedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with message when MCP returns message', async () => {
      mcpMock.mockResolvedValue({ text: 'Console output', level: 'log' });
      const result = await getConsoleMessage.execute({ msgid: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toEqual({ text: 'Console output', level: 'log' });
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await getConsoleMessage.execute({ msgid: 1 });
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await getConsoleMessage.execute({ msgid: 1 });
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['message text']);
      const result = await getConsoleMessage.execute({ msgid: 1 });
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ text: 'message' }, null]);
      const result = await getConsoleMessage.execute({ msgid: 1 });
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { text: 'message' }, status: 'ok' });
      const result = await getConsoleMessage.execute({ msgid: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue({ text: 'message' });
      const start = Date.now();
      for (let i = 0; i < 100; i++) await getConsoleMessage.execute({ msgid: i });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle negative msgid', async () => {
      mcpMock.mockResolvedValue({ text: 'message' });
      const result = await getConsoleMessage.execute({ msgid: -1 });
      expect(result.success).toBe(true);
    });
    it('should handle complex message object', async () => {
      const complexMessage = {
        text: 'Error message',
        level: 'error',
        timestamp: Date.now(),
        args: [{ type: 'string', value: 'test' }]
      };
      mcpMock.mockResolvedValue(complexMessage);
      const result = await getConsoleMessage.execute({ msgid: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toEqual(complexMessage);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue({ text: 'message' });
      await getConsoleMessage.execute({ msgid: 42 });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('get_console_message');
      expect(params).toEqual({ msgid: 42 });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(getConsoleMessage.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
