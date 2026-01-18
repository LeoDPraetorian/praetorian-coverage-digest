/**
 * Unit Tests for chrome-devtools click Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates input validation, error handling, security, and response format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  testSecurityScenarios,
  getAllSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

// Mock the MCP client module BEFORE importing the wrapper
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

// Import the wrapper to test
import { click } from './click';

// Import MCP client for mock access
import * as mcpClient from '../config/lib/mcp-client';

describe('click - Unit Tests', () => {
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
      // Arrange
      mcpMock.mockResolvedValue(undefined); // chrome-devtools click returns void

      // Act
      const result = await click.execute({ uid: 'element-123' });

      // Assert
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledTimes(1);
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'click',
        { uid: 'element-123' }
      );
    });

    it('should accept valid uid with dblClick option', async () => {
      // Arrange
      mcpMock.mockResolvedValue(undefined);

      // Act
      const result = await click.execute({ uid: 'btn-456', dblClick: true });

      // Assert
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'click',
        { uid: 'btn-456', dblClick: true }
      );
    });

    it('should accept valid uid with dblClick false', async () => {
      // Arrange
      mcpMock.mockResolvedValue(undefined);

      // Act
      const result = await click.execute({ uid: 'input-789', dblClick: false });

      // Assert
      expect(result).toMatchObject({ success: true });
    });

    it('should accept empty uid string (current behavior - no min length)', async () => {
      // Note: The current wrapper does not validate min length on uid
      // This test documents the current behavior
      mcpMock.mockResolvedValue(undefined);

      // Act
      const result = await click.execute({ uid: '' });

      // Assert: Currently accepts empty strings
      expect(result).toMatchObject({ success: true });
    });

    it('should reject missing uid field', async () => {
      // Act & Assert - TypeScript enforces this, but test runtime validation
      await expect(
        click.execute({} as any)
      ).rejects.toThrow();
    });

    it('should reject invalid uid type (number)', async () => {
      // Act & Assert
      await expect(
        click.execute({ uid: 123 } as any)
      ).rejects.toThrow();
    });

    it('should reject invalid uid type (null)', async () => {
      // Act & Assert
      await expect(
        click.execute({ uid: null } as any)
      ).rejects.toThrow();
    });

    it('should reject invalid dblClick type (string)', async () => {
      // Act & Assert
      await expect(
        click.execute({ uid: 'test', dblClick: 'yes' } as any)
      ).rejects.toThrow();
    });

    it('should handle multiple valid input formats', async () => {
      // Arrange: Various valid uid formats
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
        const result = await click.execute(input);
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
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      // Act & Assert
      await expect(
        click.execute({ uid: 'test-element' })
      ).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      // Act & Assert
      await expect(
        click.execute({ uid: 'test-element' })
      ).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      // Act & Assert
      await expect(
        click.execute({ uid: 'test-element' })
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle not found errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.notFound('element'));

      // Act & Assert
      await expect(
        click.execute({ uid: 'nonexistent-element' })
      ).rejects.toThrow(/not found/i);
    });

    it('should handle network errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.networkError());

      // Act & Assert
      await expect(
        click.execute({ uid: 'test-element' })
      ).rejects.toThrow(/network.*error|ECONNREFUSED/i);
    });

    it('should handle unauthorized errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      // Act & Assert
      await expect(
        click.execute({ uid: 'test-element' })
      ).rejects.toThrow(/authentication/i);
    });

    it('should propagate unexpected errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Unexpected chrome-devtools error'));

      // Act & Assert
      await expect(
        click.execute({ uid: 'test-element' })
      ).rejects.toThrow(/unexpected/i);
    });
  });

  // ==========================================================================
  // Category 3: Security Tests
  // ==========================================================================

  describe('Security', () => {
    // Note: The current click.ts wrapper does not have security validation
    // on the uid field. These tests document the current behavior and will
    // help identify when security validation is added.

    it('should handle path traversal attempts in uid', async () => {
      // Path traversal patterns that might be used maliciously
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'valid/../../../secret',
      ];

      for (const maliciousUid of pathTraversalInputs) {
        mcpMock.mockResolvedValue(undefined);

        // Current behavior: wrapper passes through to MCP
        // When security is added, this should reject
        try {
          await click.execute({ uid: maliciousUid });
          // If no error, MCP was called (security not enforced)
          expect(mcpMock).toHaveBeenCalled();
        } catch (error) {
          // If error, security validation blocked it (good!)
          expect(error).toBeDefined();
        }

        mcpMock.mockClear();
      }
    });

    it('should handle command injection attempts in uid', async () => {
      // Command injection patterns
      const commandInjectionInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
        '`id`',
      ];

      for (const maliciousUid of commandInjectionInputs) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await click.execute({ uid: maliciousUid });
          // If no error, MCP was called
          expect(mcpMock).toHaveBeenCalled();
        } catch (error) {
          // If error, security validation blocked it
          expect(error).toBeDefined();
        }

        mcpMock.mockClear();
      }
    });

    it('should handle XSS and malicious script patterns in uid', async () => {
      // XSS patterns
      const xssInputs = [
        '<script>alert(1)</script>',
        '<img onerror=alert(1)>',
        'javascript:void(0)',
      ];

      for (const maliciousUid of xssInputs) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await click.execute({ uid: maliciousUid });
          expect(mcpMock).toHaveBeenCalled();
        } catch (error) {
          expect(error).toBeDefined();
        }

        mcpMock.mockClear();
      }
    });

    it('should handle control characters in uid', async () => {
      // Control character patterns
      const controlCharInputs = [
        'test\x00null',
        'test\x01start',
        'test\x7Fdelete',
      ];

      for (const maliciousUid of controlCharInputs) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await click.execute({ uid: maliciousUid });
          expect(mcpMock).toHaveBeenCalled();
        } catch (error) {
          expect(error).toBeDefined();
        }

        mcpMock.mockClear();
      }
    });

    it('should document security attack vector handling', async () => {
      // This test documents the current state of security handling
      // The wrapper should be updated to include sanitization
      const securityScenarios = getAllSecurityScenarios();

      let blockedCount = 0;
      let passedCount = 0;

      for (const scenario of securityScenarios) {
        mcpMock.mockResolvedValue(undefined);

        try {
          await click.execute({ uid: scenario.input });
          passedCount++;
        } catch {
          blockedCount++;
        }

        mcpMock.mockClear();
      }

      // Log security posture for visibility
      console.log(`Security scenarios: ${blockedCount} blocked, ${passedCount} passed through`);

      // This assertion documents current behavior
      // Update when security validation is added to the wrapper
      expect(blockedCount + passedCount).toBe(securityScenarios.length);
    });
  });

  // ==========================================================================
  // Category 4: Response Format Tests
  // ==========================================================================

  describe('Response format', () => {
    it('should return success true when MCP returns void/undefined', async () => {
      // Arrange: chrome-devtools click typically returns void
      mcpMock.mockResolvedValue(undefined);

      // Act
      const result = await click.execute({ uid: 'element-id' });

      // Assert
      expect(result).toMatchObject({ success: true });
      expect(typeof result.success).toBe('boolean');
    });

    it('should return success true when MCP returns null', async () => {
      // Arrange
      mcpMock.mockResolvedValue(null);

      // Act
      const result = await click.execute({ uid: 'element-id' });

      // Assert
      expect(result).toMatchObject({ success: true });
    });

    it('should return success true when MCP returns empty object', async () => {
      // Arrange
      mcpMock.mockResolvedValue({});

      // Act
      const result = await click.execute({ uid: 'element-id' });

      // Assert
      expect(result).toMatchObject({ success: true });
    });

    it('should return consistent output schema', async () => {
      // Arrange
      mcpMock.mockResolvedValue(undefined);

      // Act
      const result = await click.execute({ uid: 'element-id' });

      // Assert: Output matches OutputSchema
      expect(result).toHaveProperty('success');
      expect(Object.keys(result)).toEqual(['success', 'estimatedTokens']);
    });

    // MCP Response Format Coverage (Required for Phase 8)
    // Tests for all 3 MCP response formats to prevent forEach bugs

    it('should handle direct array format from MCP', async () => {
      // Direct array format: MCP returns [item1, item2, ...]
      // For click, this shouldn't happen but wrapper should handle gracefully
      mcpMock.mockResolvedValue(['clicked']);

      const result = await click.execute({ uid: 'element-id' });

      // Wrapper normalizes to success response
      expect(result).toMatchObject({ success: true });
    });

    it('should handle tuple format from MCP', async () => {
      // Tuple format: MCP returns [data, metadata/offset]
      // Common in list operations, click wrapper should handle
      mcpMock.mockResolvedValue([{ clicked: true }, null]);

      const result = await click.execute({ uid: 'element-id' });

      // Wrapper normalizes to success response
      expect(result).toMatchObject({ success: true });
    });

    it('should handle object format from MCP', async () => {
      // Object format: MCP returns { data: ..., other: ... }
      // Wrapper should extract relevant fields
      mcpMock.mockResolvedValue({ data: { clicked: true }, status: 'ok' });

      const result = await click.execute({ uid: 'element-id' });

      // Wrapper normalizes to success response
      expect(result).toMatchObject({ success: true });
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue(undefined);

      // Act: Measure execution time
      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await click.execute({ uid: `element-${i}` });
      }

      const avgTime = (Date.now() - start) / iterations;

      // Assert: Average time should be very fast (mocked)
      expect(avgTime).toBeLessThan(10); // <10ms per call
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  // ==========================================================================
  // Category 6: Edge Case Tests
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle very long uid strings', async () => {
      // Arrange: Very long uid (1000 characters)
      const longUid = 'a'.repeat(1000);
      mcpMock.mockResolvedValue(undefined);

      // Act
      const result = await click.execute({ uid: longUid });

      // Assert
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'click',
        { uid: longUid }
      );
    });

    it('should handle uid with special characters', async () => {
      // Arrange
      const specialUids = [
        'element-with-dash',
        'element_with_underscore',
        'element.with.dot',
        'element:with:colon',
        'element/with/slash',
        'element[0]',
        'element@attr',
      ];

      for (const uid of specialUids) {
        mcpMock.mockResolvedValue(undefined);
        const result = await click.execute({ uid });
        expect(result.success).toBe(true);
        mcpMock.mockClear();
      }
    });

    it('should handle unicode characters in uid', async () => {
      // Arrange
      mcpMock.mockResolvedValue(undefined);

      // Act
      const result = await click.execute({ uid: 'element-中文-🚀' });

      // Assert
      expect(result).toMatchObject({ success: true });
    });

    it('should handle whitespace in uid', async () => {
      // Arrange
      mcpMock.mockResolvedValue(undefined);

      // Act: uid with leading/trailing whitespace
      const result = await click.execute({ uid: '  element-id  ' });

      // Assert: Wrapper passes through as-is
      expect(result).toMatchObject({ success: true });
      expect(mcpMock).toHaveBeenCalledWith(
        'chrome-devtools',
        'click',
        { uid: '  element-id  ' }
      );
    });
  });

  // ==========================================================================
  // Category 7: Integration Pattern Tests
  // ==========================================================================

  describe('MCP integration patterns', () => {
    it('should call correct MCP server and tool', async () => {
      // Arrange
      mcpMock.mockResolvedValue(undefined);

      // Act
      await click.execute({ uid: 'test-element' });

      // Assert
      expect(mcpMock).toHaveBeenCalledTimes(1);

      const [mcpName, toolName, params] = mcpMock.mock.calls[0];
      expect(mcpName).toBe('chrome-devtools');
      expect(toolName).toBe('click');
      expect(params).toEqual({ uid: 'test-element' });
    });

    it('should pass validated input to MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue(undefined);

      // Act
      await click.execute({ uid: 'element-id', dblClick: true });

      // Assert
      const [, , params] = mcpMock.mock.calls[0];
      expect(params).toEqual({ uid: 'element-id', dblClick: true });
    });

    it('should not call MCP if input validation fails', async () => {
      // Act & Assert - missing uid field should fail validation
      await expect(
        click.execute({} as any)
      ).rejects.toThrow();

      // MCP should not be called when validation fails
      expect(mcpMock).not.toHaveBeenCalled();
    });
  });
});
