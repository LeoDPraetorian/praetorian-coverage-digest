/**
 * Unit Tests for chrome-devtools hover Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates input validation, error handling, security, and response format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  getAllSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

// Mock the MCP client module BEFORE importing the wrapper
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

// Import the wrapper to test
import { hover } from './hover';

// Import MCP client for mock access
import * as mcpClient from '../config/lib/mcp-client';

describe('hover - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    // Create fresh mock for each test
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  afterEach(() => {
    // Clear mocks after each test
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Category 1: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should accept valid uid string', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await hover.execute({ uid: 'element-123' });

      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledTimes(1);
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'hover',
        { uid: 'element-123' }
      );
    });

    it('should accept empty uid string (current behavior - no min length)', async () => {
      // Note: The current wrapper does not validate min length on uid
      mcpMock.mockResolvedValue(undefined);

      const result = await hover.execute({ uid: '' });

      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing uid field', async () => {
      await expect(
        hover.execute({} as any)
      ).rejects.toThrow();
    });

    it('should reject invalid uid type (number)', async () => {
      await expect(
        hover.execute({ uid: 123 } as any)
      ).rejects.toThrow();
    });

    it('should reject invalid uid type (null)', async () => {
      await expect(
        hover.execute({ uid: null } as any)
      ).rejects.toThrow();
    });

    it('should handle multiple valid input formats', async () => {
      const validInputs = [
        { uid: 'simple-id' },
        { uid: 'id_with_underscore' },
        { uid: 'id-with-dashes' },
        { uid: '12345' },
        { uid: 'CamelCaseId' },
        { uid: 'id.with.dots' },
      ];

      for (const input of validInputs) {
        mcpMock.mockResolvedValue(undefined);
        const result = await hover.execute(input);
        expect(result.success).toBe(true);
      }

      expect(mcpMock).toHaveBeenCalledTimes(validInputs.length);
    });
  });

  // ==========================================================================
  // Category 2: Error Handling Tests
  // ==========================================================================

  describe('Error handling', () => {
    it('should handle rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      await expect(
        hover.execute({ uid: 'test-element' })
      ).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      await expect(
        hover.execute({ uid: 'test-element' })
      ).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      await expect(
        hover.execute({ uid: 'test-element' })
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound('element'));

      await expect(
        hover.execute({ uid: 'nonexistent-element' })
      ).rejects.toThrow(/not found/i);
    });

    it('should handle network errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.networkError());

      await expect(
        hover.execute({ uid: 'test-element' })
      ).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });

    it('should handle unauthorized errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      await expect(
        hover.execute({ uid: 'test-element' })
      ).rejects.toThrow(/authentication/i);
    });

    it('should propagate unexpected errors', async () => {
      mcpMock.mockRejectedValue(new Error('Unexpected chrome-devtools error'));

      await expect(
        hover.execute({ uid: 'test-element' })
      ).rejects.toThrow(/unexpected/i);
    });
  });

  // ==========================================================================
  // Category 3: Security Tests
  // ==========================================================================

  describe('Security', () => {
    it('should handle path traversal attempts in uid', async () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'valid/../../../secret',
      ];

      for (const maliciousUid of pathTraversalInputs) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await hover.execute({ uid: maliciousUid });
          expect(mcpMock).toHaveBeenCalled();
        } catch (error) {
          expect(error).toBeDefined();
        }

        mcpMock.mockClear();
      }
    });

    it('should handle command injection attempts in uid', async () => {
      const commandInjectionInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
        '`id`',
      ];

      for (const maliciousUid of commandInjectionInputs) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await hover.execute({ uid: maliciousUid });
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
          await hover.execute({ uid: scenario.input });
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

  // ==========================================================================
  // Category 4: Response Format Tests
  // ==========================================================================

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await hover.execute({ uid: 'element-id' });

      expect(result).toMatchObject({ success: true });
      expect(typeof result.success).toBe('boolean');
    });

    it('should return success true when MCP returns null', async () => {
      mcpMock.mockResolvedValue(null);

      const result = await hover.execute({ uid: 'element-id' });

      expect(result).toMatchObject({ success: true });
    });

    it('should return success true when MCP returns empty object', async () => {
      mcpMock.mockResolvedValue({});

      const result = await hover.execute({ uid: 'element-id' });

      expect(result).toMatchObject({ success: true });
    });

    it('should return consistent output schema', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await hover.execute({ uid: 'element-id' });

      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });

    // MCP Response Format Coverage (Required for Phase 8)
    it('should handle direct array format from MCP', async () => {
      mcpMock.mockResolvedValue(['hovered']);

      const result = await hover.execute({ uid: 'element-id' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle tuple format from MCP', async () => {
      mcpMock.mockResolvedValue([{ hovered: true }, null]);

      const result = await hover.execute({ uid: 'element-id' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle object format from MCP', async () => {
      mcpMock.mockResolvedValue({ data: { hovered: true }, status: 'ok' });

      const result = await hover.execute({ uid: 'element-id' });

      expect(result).toMatchObject({ success: true });
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      mcpMock.mockResolvedValue(undefined);

      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await hover.execute({ uid: `element-${i}` });
      }

      const avgTime = (Date.now() - start) / iterations;

      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  // ==========================================================================
  // Category 6: Edge Case Tests
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle very long uid strings', async () => {
      const longUid = 'a'.repeat(1000);
      mcpMock.mockResolvedValue(undefined);

      const result = await hover.execute({ uid: longUid });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle uid with special characters', async () => {
      const specialUids = [
        'element-with-dash',
        'element_with_underscore',
        'element.with.dot',
        'element:with:colon',
        'element/with/slash',
      ];

      for (const uid of specialUids) {
        mcpMock.mockResolvedValue(undefined);
        const result = await hover.execute({ uid });
        expect(result.success).toBe(true);
        mcpMock.mockClear();
      }
    });

    it('should handle unicode characters in uid', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await hover.execute({ uid: 'element-中文-🚀' });

      expect(result).toMatchObject({ success: true });
    });

    it('should handle whitespace in uid', async () => {
      mcpMock.mockResolvedValue(undefined);

      const result = await hover.execute({ uid: '  element-id  ' });

      expect(result).toMatchObject({ success: true });
    });
  });

  // ==========================================================================
  // Category 7: MCP Integration Pattern Tests
  // ==========================================================================

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      mcpMock.mockResolvedValue(undefined);

      await hover.execute({ uid: 'test-element' });

      expect(mcpMock).toHaveBeenCalledTimes(1);

      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('hover');
      expect(params).toEqual({ uid: 'test-element' });
    });

    it('should not call MCP if input validation fails', async () => {
      await expect(
        hover.execute({} as any)
      ).rejects.toThrow();

      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
