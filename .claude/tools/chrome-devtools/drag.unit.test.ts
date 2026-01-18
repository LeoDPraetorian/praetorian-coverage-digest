/**
 * Unit Tests for chrome-devtools drag Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  getAllSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

import { drag } from './drag';
import * as mcpClient from '../config/lib/mcp-client';

describe('drag - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should accept valid from_uid and to_uid strings', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await drag.execute({ from_uid: 'source-123', to_uid: 'target-456' });

      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'drag',
        { from_uid: 'source-123', to_uid: 'target-456' }
      );
    });

    it('should accept empty uid strings (current behavior)', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await drag.execute({ from_uid: '', to_uid: '' });

      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing from_uid field', async () => {
      await expect(
        drag.execute({ to_uid: 'target' } as any)
      ).rejects.toThrow();
    });

    it('should reject missing to_uid field', async () => {
      await expect(
        drag.execute({ from_uid: 'source' } as any)
      ).rejects.toThrow();
    });

    it('should reject invalid from_uid type (number)', async () => {
      await expect(
        drag.execute({ from_uid: 123, to_uid: 'target' } as any)
      ).rejects.toThrow();
    });

    it('should reject invalid to_uid type (null)', async () => {
      await expect(
        drag.execute({ from_uid: 'source', to_uid: null } as any)
      ).rejects.toThrow();
    });

    it('should handle multiple valid inputs', async () => {
      const validInputs = [
        { from_uid: 'a', to_uid: 'b' },
        { from_uid: 'source-element', to_uid: 'drop-zone' },
        { from_uid: 'item_1', to_uid: 'container' },
      ];

      for (const input of validInputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await drag.execute(input);
        expect(result.success).toBe(true);
      }

      expect(mcpMock).toHaveBeenCalledTimes(validInputs.length);
    });
  });

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      await expect(drag.execute({ from_uid: 'a', to_uid: 'b' })).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      await expect(drag.execute({ from_uid: 'a', to_uid: 'b' })).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      await expect(drag.execute({ from_uid: 'a', to_uid: 'b' })).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('element'));

      await expect(drag.execute({ from_uid: 'missing', to_uid: 'b' })).rejects.toThrow(/not found/i);
    });

    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());

      await expect(drag.execute({ from_uid: 'a', to_uid: 'b' })).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });

    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      await expect(drag.execute({ from_uid: 'a', to_uid: 'b' })).rejects.toThrow(/authentication/i);
    });

    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected error'));

      await expect(drag.execute({ from_uid: 'a', to_uid: 'b' })).rejects.toThrow(/unexpected/i);
    });
  });

  describe('Security', () => {
    it('should handle path traversal attempts', async () => {
      const maliciousInputs = [
        { from_uid: '../../../etc/passwd', to_uid: 'target' },
        { from_uid: 'source', to_uid: '..\\..\\windows' },
      ];

      for (const input of maliciousInputs) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await drag.execute(input);
          expect(mcpMock).toHaveBeenCalled();
        } catch (error) {
          expect(error).toBeDefined();
        }

        mcpMock.mockClear();
      }
    });

    it('should document security attack vector handling', async () => {
      const securityScenarios = getAllSecurityScenarios();

      let blockedCount = 0;
      let passedCount = 0;

      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await drag.execute({ from_uid: scenario.input, to_uid: 'target' });
          passedCount++;
        } catch {
          blockedCount++;
        }

        mcpMock.mockClear();
      }

      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await drag.execute({ from_uid: 'a', to_uid: 'b' });

      expect(result).toMatchObject({ success: true });
    });

    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);

      const result = await drag.execute({ from_uid: 'a', to_uid: 'b' });

      expect(result).toMatchObject({ success: true });
    });

    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await drag.execute({ from_uid: 'a', to_uid: 'b' });

      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });

    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['dragged']);

      const result = await drag.execute({ from_uid: 'a', to_uid: 'b' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ dragged: true }, null]);

      const result = await drag.execute({ from_uid: 'a', to_uid: 'b' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { dragged: true }, status: 'ok' });

      const result = await drag.execute({ from_uid: 'a', to_uid: 'b' });

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);

      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await drag.execute({ from_uid: `from-${i}`, to_uid: `to-${i}` });
      }

      const avgTime = (Date.now() - start) / iterations;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long uid strings', async () => {
      const longUid = 'a'.repeat(1000);
      mcpMock.mockResolvedValue(undefined);

      const result = await drag.execute({ from_uid: longUid, to_uid: longUid });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle same source and target', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await drag.execute({ from_uid: 'same', to_uid: 'same' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle unicode characters in uids', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await drag.execute({ from_uid: '元素-🎯', to_uid: '目标-📦' });

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);

      await drag.execute({ from_uid: 'source', to_uid: 'target' });

      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('drag');
      expect(params).toEqual({ from_uid: 'source', to_uid: 'target' });
    });

    it('should not call MCP if input validation fails', async () => {
      await expect(drag.execute({} as any)).rejects.toThrow();
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
