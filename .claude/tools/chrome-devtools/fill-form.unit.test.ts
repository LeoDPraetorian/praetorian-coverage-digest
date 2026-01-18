/**
 * Unit Tests for chrome-devtools fill-form Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, getAllSecurityScenarios, MCPErrors } from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({ callMCPTool: vi.fn() }));

import { fillForm } from './fill-form';
import * as mcpClient from '../config/lib/mcp-client';

describe('fill-form - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => { vi.clearAllMocks(); });

  describe('Input validation', () => {
    it('should accept valid elements array', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await fillForm.execute({
        elements: [{
          name: 'username',
          ref: 'input-1',
          type: 'textbox',
          value: 'testuser'
        }]
      });
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith('chrome-devtools', 'fill_form', {
        elements: [{ name: 'username', ref: 'input-1', type: 'textbox', value: 'testuser' }]
      });
    });

    it('should accept multiple elements', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await fillForm.execute({
        elements: [
          { name: 'username', ref: 'input-1', type: 'textbox', value: 'testuser' },
          { name: 'password', ref: 'input-2', type: 'textbox', value: 'password123' },
          { name: 'remember', ref: 'checkbox-1', type: 'checkbox', value: 'true' }
        ]
      });
      expect(result).toMatchObject({ success: true });
    });

    it('should accept all valid type enum values', async () => {
      const validTypes = ['textbox', 'checkbox', 'radio', 'combobox', 'slider'] as const;
      for (const type of validTypes) {
        mcpMock.mockResolvedValue(undefined);
        const result = await fillForm.execute({
          elements: [{ name: 'field', ref: 'el-1', type, value: 'test' }]
        });
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(validTypes.length);
    });

    it('should reject missing elements field', async () => {
      await expect(fillForm.execute({} as any)).rejects.toThrow();
    });

    it('should reject empty elements array', async () => {
      await expect(fillForm.execute({ elements: [] })).rejects.toThrow();
    });

    it('should reject element missing name', async () => {
      await expect(fillForm.execute({
        elements: [{ ref: 'el-1', type: 'textbox', value: 'test' }] as any
      })).rejects.toThrow();
    });

    it('should reject element missing ref', async () => {
      await expect(fillForm.execute({
        elements: [{ name: 'field', type: 'textbox', value: 'test' }] as any
      })).rejects.toThrow();
    });

    it('should reject element missing type', async () => {
      await expect(fillForm.execute({
        elements: [{ name: 'field', ref: 'el-1', value: 'test' }] as any
      })).rejects.toThrow();
    });

    it('should reject element missing value', async () => {
      await expect(fillForm.execute({
        elements: [{ name: 'field', ref: 'el-1', type: 'textbox' }] as any
      })).rejects.toThrow();
    });

    it('should reject invalid type enum', async () => {
      await expect(fillForm.execute({
        elements: [{ name: 'field', ref: 'el-1', type: 'invalid' as any, value: 'test' }]
      })).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const inputs = [
        { elements: [{ name: 'a', ref: 'r1', type: 'textbox' as const, value: '1' }] },
        { elements: [{ name: 'b', ref: 'r2', type: 'checkbox' as const, value: 'true' }] },
        { elements: [{ name: 'c', ref: 'r3', type: 'radio' as const, value: 'opt1' }] },
      ];
      for (const input of inputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await fillForm.execute(input);
        expect(result.success).toBe(true);
      }
      expect(mcpMock).toHaveBeenCalledTimes(inputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());
      await expect(fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      })).rejects.toThrow(/rate limit/i);
    });
    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());
      await expect(fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      })).rejects.toThrow(/server.*error/i);
    });
    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());
      await expect(fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      })).rejects.toThrow(/ETIMEDOUT/);
    });
    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('element'));
      await expect(fillForm.execute({
        elements: [{ name: 'f', ref: 'missing', type: 'textbox', value: 'v' }]
      })).rejects.toThrow(/not found/i);
    });
    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());
      await expect(fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });
    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());
      await expect(fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      })).rejects.toThrow(/authentication/i);
    });
    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));
      await expect(fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should reject invalid type enum (blocks security inputs)', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await fillForm.execute({
            elements: [{ name: 'f', ref: 'r', type: scenario.input as any, value: 'v' }]
          });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (type): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount).toBe(securityScenarios.length);
    });
    it('should document security attack vector handling for value', async () => {
      const securityScenarios = getAllSecurityScenarios();
      let blockedCount = 0, passedCount = 0;
      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);
        try {
          await fillForm.execute({
            elements: [{ name: 'f', ref: 'r', type: 'textbox', value: scenario.input }]
          });
          passedCount++;
        } catch { blockedCount++; }
        mcpMock.mockClear();
      }
      console.log(`Security scenarios (value): ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      });
      expect(result).toMatchObject({ success: true });
    });
    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);
      const result = await fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      });
      expect(result).toMatchObject({ success: true });
    });
    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      });
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });
    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['filled']);
      const result = await fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ filled: true }, null]);
      const result = await fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      });
      expect(result).toMatchObject({ success: true });
    });
    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { filled: true }, status: 'ok' });
      const result = await fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      });
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);
      const start = Date.now();
      for (let i = 0; i < 100; i++) await fillForm.execute({
        elements: [{ name: 'f', ref: 'r', type: 'textbox', value: 'v' }]
      });
      const avgTime = (Date.now() - start) / 100;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle large elements array', async () => {
      const elements = Array.from({ length: 100 }, (_, i) => ({
        name: `field-${i}`,
        ref: `ref-${i}`,
        type: 'textbox' as const,
        value: `value-${i}`
      }));
      mcpMock.mockResolvedValue(undefined);
      const result = await fillForm.execute({ elements });
      expect(result.success).toBe(true);
    });
    it('should handle very long value strings', async () => {
      mcpMock.mockResolvedValue(undefined);
      const result = await fillForm.execute({
        elements: [{
          name: 'description',
          ref: 'textarea-1',
          type: 'textbox',
          value: 'a'.repeat(10000)
        }]
      });
      expect(result.success).toBe(true);
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);
      await fillForm.execute({
        elements: [{ name: 'user', ref: 'input-user', type: 'textbox', value: 'admin' }]
      });
      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('fill_form');
      expect(params).toEqual({
        elements: [{ name: 'user', ref: 'input-user', type: 'textbox', value: 'admin' }]
      });
    });
    it('should not call MCP if input validation fails', async () => {
      await expect(fillForm.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
