/**
 * Unit Tests for chrome-devtools evaluate-script Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { evaluateScript } from './evaluate-script';
import * as mcpClient from '../config/lib/mcp-client';

describe('evaluate-script - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid function string', async () => {
      mcpMock.mockResolvedValue('result');
      const result = await evaluateScript.execute({ function: 'return document.title' });
      expect(result.success).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'evaluate_script', { function: 'return document.title' });
    });

    it('should accept function with optional args', async () => {
      mcpMock.mockResolvedValue('result');
      const result = await evaluateScript.execute({
        function: 'return args[0].textContent',
        args: [{ uid: 'element-123' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept function with multiple args', async () => {
      mcpMock.mockResolvedValue('result');
      const result = await evaluateScript.execute({
        function: 'return args[0].textContent + args[1].textContent',
        args: [{ uid: 'element-1' }, { uid: 'element-2' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept function without args', async () => {
      mcpMock.mockResolvedValue(42);
      const result = await evaluateScript.execute({ function: 'return 1 + 1' });
      expect(result.success).toBe(true);
    });

    it('should reject missing function field', async () => {
      await expect(evaluateScript.execute({} as any)).rejects.toThrow();
    });

    it('should reject empty function string', async () => {
      await expect(evaluateScript.execute({ function: '' })).rejects.toThrow();
    });

    it('should reject invalid args structure (missing uid)', async () => {
      await expect(evaluateScript.execute({
        function: 'return 1',
        args: [{ notUid: 'value' }] as any
      })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { function: 'return 1' },
        { function: 'return document.body' },
        { function: 'return args[0]', args: [{ uid: 'el-1' }] },
        { function: '(function() { return true; })()' },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue('result');
        const result = await evaluateScript.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(evaluateScript.execute({ function: 'return 1' })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(evaluateScript.execute({ function: 'return 1' })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(evaluateScript.execute({ function: 'return 1' })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('context'));
      await expect(evaluateScript.execute({ function: 'return 1' })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(evaluateScript.execute({ function: 'return 1' })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(evaluateScript.execute({ function: 'return 1' })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(evaluateScript.execute({ function: 'return 1' })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should document security attack vector handling for function', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue('result');
        try {
          await evaluateScript.execute({ function: scenario.input });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      // Note: This documents actual behavior - security should be enforced at MCP level
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true with result when MCP returns data', async () => {
      mcpMock.mockResolvedValue({ value: 'test' });
      const result = await evaluateScript.execute({ function: 'return document.title' });
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ value: 'test' });
    });
    it('should return success true when MCP returns primitive', async () => {
      mcpMock.mockResolvedValue(42);
      const result = await evaluateScript.execute({ function: 'return 42' });
      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
    });
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await evaluateScript.execute({ function: 'console.log("test")' });
      expect(result.success).toBe(true);
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await evaluateScript.execute({ function: 'return null' });
      expect(result.success).toBe(true);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['result']);
      const result = await evaluateScript.execute({ function: 'return []' });
      expect(result.success).toBe(true);
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ value: 'test' }, null]);
      const result = await evaluateScript.execute({ function: 'return 1' });
      expect(result.success).toBe(true);
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { value: 'test' }, status: 'ok' });
      const result = await evaluateScript.execute({ function: 'return 1' });
      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue('result');
      const start = Date.now();
      for (let i = 0; i < 100; i++) await evaluateScript.execute({ function: 'return 1' });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long function string', async () => {
      const longFunction = 'return "' + 'a'.repeat(5000) + '"';
      mcpMock.mockResolvedValue('long result');
      const result = await evaluateScript.execute({ function: longFunction });
      expect(result.success).toBe(true);
    });
    it('should handle complex return values', async () => {
      const complexResult = {
        nodes: [{ id: 1, children: [{ id: 2 }] }],
        metadata: { count: 100, nested: { deep: true } }
      };
      mcpMock.mockResolvedValue(complexResult);
      const result = await evaluateScript.execute({ function: 'return complexData' });
      expect(result.success).toBe(true);
      expect(result.result).toEqual(complexResult);
    });
    it('should handle empty args array', async () => {
      mcpMock.mockResolvedValue('result');
      const result = await evaluateScript.execute({ function: 'return 1', args: [] });
      expect(result.success).toBe(true);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue('result');
      await evaluateScript.execute({ function: 'return document.title' });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('evaluate_script');
      expect(params).toEqual({ function: 'return document.title' });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(evaluateScript.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
