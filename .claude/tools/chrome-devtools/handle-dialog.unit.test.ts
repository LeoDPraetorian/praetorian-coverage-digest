/**
 * Unit Tests for chrome-devtools handle-dialog Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { handleDialog } from './handle-dialog';
import * as mcpClient from '../config/lib/mcp-client';

describe('handle-dialog - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept accept action', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await handleDialog.execute({ action: 'accept' });
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'handle_dialog', { action: 'accept' });
    });

    it('should accept dismiss action', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await handleDialog.execute({ action: 'dismiss' });
      expect(result).toMatchObject({ success: true });
    });

    it('should accept action with promptText', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await handleDialog.execute({ action: 'accept', promptText: 'user input' });
      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing action field', async () => {
      await expect(handleDialog.execute({} as any)).rejects.toThrow();
    });

    it('should reject invalid action enum', async () => {
      await expect(handleDialog.execute({ action: 'invalid' as any })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { action: 'accept' as const },
        { action: 'dismiss' as const },
        { action: 'accept' as const, promptText: 'test' },
        { action: 'dismiss' as const, promptText: '' },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await handleDialog.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(handleDialog.execute({ action: 'accept' })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(handleDialog.execute({ action: 'accept' })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(handleDialog.execute({ action: 'accept' })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('dialog'));
      await expect(handleDialog.execute({ action: 'accept' })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(handleDialog.execute({ action: 'accept' })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(handleDialog.execute({ action: 'accept' })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(handleDialog.execute({ action: 'accept' })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject invalid action enum (blocks all security inputs)', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await handleDialog.execute({ action: scenario.input as any });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (action): ${blockedCount} blocked, ${passedCount} passed through`);
      // All should be blocked due to enum validation
      expect(blockedCount).toBe(securityScenarios.length);
    });
    it('should document security attack vector handling for promptText', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await handleDialog.execute({ action: 'accept', promptText: scenario.input });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (promptText): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await handleDialog.execute({ action: 'accept' });
      expect(result).toMatchObject({ success: true });
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await handleDialog.execute({ action: 'accept' });
      expect(result).toMatchObject({ success: true });
    });
    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await handleDialog.execute({ action: 'accept' });
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['handled']);
      const result = await handleDialog.execute({ action: 'accept' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ handled: true }, null]);
      const result = await handleDialog.execute({ action: 'accept' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { handled: true }, status: 'ok' });
      const result = await handleDialog.execute({ action: 'accept' });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await handleDialog.execute({ action: 'accept' });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty promptText', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await handleDialog.execute({ action: 'accept', promptText: '' });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle long promptText', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await handleDialog.execute({ action: 'accept', promptText: 'a'.repeat(1000) });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);
      await handleDialog.execute({ action: 'accept' });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('handle_dialog');
      expect(params).toEqual({ action: 'accept' });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(handleDialog.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
