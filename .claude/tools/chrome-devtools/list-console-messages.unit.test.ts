/**
 * Unit Tests for chrome-devtools list-console-messages Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { listConsoleMessages } from './list-console-messages';
import * as mcpClient from '../config/lib/mcp-client';

describe('list-console-messages - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept empty input (all fields optional)', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listConsoleMessages.execute({});
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'list_console_messages', { includePreservedMessages: false });
    });

    it('should accept includePreservedMessages true', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listConsoleMessages.execute({ includePreservedMessages: true });
      expect(result.success).toBe(true);
    });

    it('should accept pageIdx', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listConsoleMessages.execute({ pageIdx: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept pageSize', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listConsoleMessages.execute({ pageSize: 50 });
      expect(result.success).toBe(true);
    });

    it('should accept valid types array', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listConsoleMessages.execute({ types: ['log', 'error', 'warn'] });
      expect(result.success).toBe(true);
    });

    it('should accept all valid type values', async () => {
      mcpMock.mockResolvedValue([]);
      const validTypes = ['log', 'debug', 'info', 'error', 'warn', 'dir', 'table', 'trace'] as const;
      const result = await listConsoleMessages.execute({ types: [...validTypes] });
      expect(result.success).toBe(true);
    });

    it('should accept all options combined', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listConsoleMessages.execute({
        includePreservedMessages: true,
        pageIdx: 0,
        pageSize: 100,
        types: ['error', 'warn']
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative pageIdx', async () => {
      await expect(listConsoleMessages.execute({ pageIdx: -1 })).rejects.toThrow();
    });

    it('should reject invalid type enum', async () => {
      await expect(listConsoleMessages.execute({ types: ['invalid'] as any })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        {},
        { types: ['log' as const] },
        { pageIdx: 0, pageSize: 10 },
        { includePreservedMessages: true },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue([]);
        const result = await listConsoleMessages.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(listConsoleMessages.execute({})).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(listConsoleMessages.execute({})).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(listConsoleMessages.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('messages'));
      await expect(listConsoleMessages.execute({})).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(listConsoleMessages.execute({})).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(listConsoleMessages.execute({})).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(listConsoleMessages.execute({})).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject invalid type enum values (blocks all security inputs)', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue([]);
        try {
          await listConsoleMessages.execute({ types: [scenario.input] as any });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with messages array', async () => {
      const messages = [{ msgid: 1, text: 'Hello' }, { msgid: 2, text: 'World' }];
      mcpMock.mockResolvedValue(messages);
      const result = await listConsoleMessages.execute({});
      expect(result.success).toBe(true);
      expect(result.messages).toEqual(messages);
    });
    it('should return success true with empty messages array', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listConsoleMessages.execute({});
      expect(result).toMatchObject({ success: true, messages: [] });
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await listConsoleMessages.execute({});
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await listConsoleMessages.execute({});
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue([{ msgid: 1 }, { msgid: 2 }]);
      const result = await listConsoleMessages.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([[{ msgid: 1 }], null]);
      const result = await listConsoleMessages.execute({});
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: [{ msgid: 1 }], status: 'ok' });
      const result = await listConsoleMessages.execute({});
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue([]);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await listConsoleMessages.execute({});
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle large messages array', async () => {
      const messages = Array.from({ length: 1000 }, (_, i) => ({ msgid: i, text: `Message ${i}` }));
      mcpMock.mockResolvedValue(messages);
      const result = await listConsoleMessages.execute({});
      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(1000);
    });
    it('should handle empty types array', async () => {
      mcpMock.mockResolvedValue([]);
      const result = await listConsoleMessages.execute({ types: [] });
      expect(result.success).toBe(true);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue([]);
      await listConsoleMessages.execute({ types: ['error'] });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('list_console_messages');
      expect(params).toEqual({ includePreservedMessages: false, types: ['error'] });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(listConsoleMessages.execute({ pageIdx: -1 })).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
