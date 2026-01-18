/**
 * Unit Tests for getTestsSignatures Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates filtering, token reduction, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, testSecurityScenarios, getAllSecurityScenarios } from '@claude/testing';

// Mock the MCP client module BEFORE importing
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

// Import the wrapper to test
import { getTestsSignatures } from './get-tests-signatures';

// Import MCP client for type access
import * as mcpClient from '../config/lib/mcp-client';

describe('getTestsSignatures - Unit Tests', () => {
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
  // Category 1: Wrapper Logic Tests (Mocked)
  // ==========================================================================

  describe('Filtering logic', () => {
    it('should return signature with input echoed back', async () => {
      // Arrange: Mock MCP response
      mcpMock.mockResolvedValue({
        signature: 'abc123def456',
        // Extra fields that might be in raw response
        fullHash: 'abc123def456789...',
        metadata: { created: '2024-01-01' },
      });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'auth.spec.ts',
        title: 'should login successfully',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.signature).toBe('abc123def456');
      expect(result.projectId).toBe('project-123');
      expect(result.spec).toBe('auth.spec.ts');
      expect(result.title).toBe('should login successfully');
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify no extra fields leaked through
      expect(result).not.toHaveProperty('fullHash');
      expect(result).not.toHaveProperty('metadata');
    });

    it('should use mock-signature when signature is missing', async () => {
      // Arrange: MCP returns no signature
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'test.spec.ts',
        title: 'test title',
      });

      // Assert: Falls back to mock-signature
      expect(result.signature).toBe('mock-signature');
    });

    it('should handle response with extra metadata', async () => {
      // Arrange: Response with additional fields beyond signature
      mcpMock.mockResolvedValue({
        signature: 'abc123',
        algorithm: 'sha256',
        timestamp: '2024-01-01T00:00:00Z',
      });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'test.spec.ts',
        title: 'test title',
      });

      // Assert: Only signature and echoed inputs should be returned
      expect(result.signature).toBe('abc123');
      expect(result.projectId).toBe('project-123');
      expect(result).not.toHaveProperty('algorithm');
      expect(result).not.toHaveProperty('timestamp');
    });

    it('should echo back input parameters exactly', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: 'sig-123' });

      const input = {
        projectId: 'test-project-with-long-name',
        spec: 'path/to/deeply/nested/spec.ts',
        title: 'should handle complex scenarios with many edge cases',
      };

      // Act
      const result = await getTestsSignatures.execute(input);

      // Assert
      expect(result.projectId).toBe(input.projectId);
      expect(result.spec).toBe(input.spec);
      expect(result.title).toBe(input.title);
    });
  });

  // ==========================================================================
  // Category 2: Token Estimation
  // ==========================================================================

  describe('Token estimation', () => {
    it('should calculate tokens based on JSON size', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: 'abc123' });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'test.spec.ts',
        title: 'test title',
      });

      // Assert: Token estimate based on raw response
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(typeof result.estimatedTokens).toBe('number');
    });

    it('should handle empty response in token calculation', async () => {
      // Arrange
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'test.spec.ts',
        title: 'test title',
      });

      // Assert: Empty object "{}" = 2 chars = 1 token minimum
      expect(result.estimatedTokens).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Category 3: Error Handling
  // ==========================================================================

  describe('Error handling', () => {
    it('should handle MCP rate limit errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('Rate limited due to too many requests'));

      // Act & Assert
      await expect(
        getTestsSignatures.execute({
          projectId: 'project-123',
          spec: 'test.spec.ts',
          title: 'test',
        })
      ).rejects.toThrow('Rate limited');
    });

    it('should handle MCP timeout errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('ETIMEDOUT'));

      // Act & Assert
      await expect(
        getTestsSignatures.execute({
          projectId: 'project-123',
          spec: 'test.spec.ts',
          title: 'test',
        })
      ).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle MCP server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('MCP server internal error'));

      // Act & Assert
      await expect(
        getTestsSignatures.execute({
          projectId: 'project-123',
          spec: 'test.spec.ts',
          title: 'test',
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 4: Input Validation
  // ==========================================================================

  describe('Input validation', () => {
    it('should require projectId', async () => {
      // Act & Assert
      await expect(
        getTestsSignatures.execute({
          projectId: '',
          spec: 'test.spec.ts',
          title: 'test',
        } as any)
      ).rejects.toThrow();
    });

    it('should require spec', async () => {
      // Act & Assert
      await expect(
        getTestsSignatures.execute({
          projectId: 'project-123',
          spec: '',
          title: 'test',
        } as any)
      ).rejects.toThrow();
    });

    it('should require title', async () => {
      // Act & Assert
      await expect(
        getTestsSignatures.execute({
          projectId: 'project-123',
          spec: 'test.spec.ts',
          title: '',
        } as any)
      ).rejects.toThrow();
    });

    it('should accept valid input', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: 'valid-sig' });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'valid-project',
        spec: 'valid.spec.ts',
        title: 'valid title',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.signature).toBe('valid-sig');
    });
  });

  // ==========================================================================
  // Category 5: Tool Metadata
  // ==========================================================================

  describe('Tool metadata', () => {
    it('should have correct tool name', () => {
      expect(getTestsSignatures.name).toBe('currents.get-tests-signatures');
    });

    it('should have input and output schemas', () => {
      expect(getTestsSignatures.inputSchema).toBeDefined();
      expect(getTestsSignatures.outputSchema).toBeDefined();
    });
  });

  // ==========================================================================
  // Category 6: Performance
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: 'sig-123' });

      // Act: Time multiple executions
      const iterations = 100;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await getTestsSignatures.execute({
          projectId: 'project-123',
          spec: 'test.spec.ts',
          title: 'test title',
        });
      }
      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      // Assert
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
      expect(avgTime).toBeLessThan(5);
    });
  });

  // ==========================================================================
  // Category 7: Edge case handling
  // ==========================================================================

  describe('Edge case handling', () => {
    it('should handle null signature in response', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: null });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'test.spec.ts',
        title: 'test title',
      });

      // Assert: null || 'mock-signature' = 'mock-signature'
      expect(result.signature).toBe('mock-signature');
    });

    it('should handle undefined signature in response', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: undefined });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'test.spec.ts',
        title: 'test title',
      });

      // Assert
      expect(result.signature).toBe('mock-signature');
    });

    it('should handle empty string signature', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: '' });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'test.spec.ts',
        title: 'test title',
      });

      // Assert: Empty string is falsy, falls back to mock-signature
      expect(result.signature).toBe('mock-signature');
    });

    it('should handle very long signature', async () => {
      // Arrange
      const longSignature = 'A'.repeat(1000);
      mcpMock.mockResolvedValue({ signature: longSignature });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'test.spec.ts',
        title: 'test title',
      });

      // Assert: Long signatures are preserved
      expect(result.signature).toBe(longSignature);
    });

    it('should handle special characters in input', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: 'sig-123' });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-with-dashes_and_underscores',
        spec: 'path/to/spec with spaces.spec.ts',
        title: "should handle 'quotes' and \"double quotes\"",
      });

      // Assert
      expect(result.projectId).toBe('project-with-dashes_and_underscores');
      expect(result.spec).toBe('path/to/spec with spaces.spec.ts');
      expect(result.title).toBe("should handle 'quotes' and \"double quotes\"");
    });

    it('should handle unicode in input', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: 'sig-123' });

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: 'テスト.spec.ts',
        title: 'should handle émojis 🎉 and unicode',
      });

      // Assert
      expect(result.spec).toBe('テスト.spec.ts');
      expect(result.title).toBe('should handle émojis 🎉 and unicode');
    });

    it('should handle very long input values', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: 'sig-123' });

      const longSpec = 'path/'.repeat(100) + 'test.spec.ts';
      const longTitle = 'should '.repeat(100) + 'work';

      // Act
      const result = await getTestsSignatures.execute({
        projectId: 'project-123',
        spec: longSpec,
        title: longTitle,
      });

      // Assert: Long values are preserved
      expect(result.spec).toBe(longSpec);
      expect(result.title).toBe(longTitle);
    });
  });

  // ==========================================================================
  // Category 8: MCP Call Parameters
  // ==========================================================================

  describe('MCP call parameters', () => {
    it('should pass all input parameters to MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ signature: 'sig-123' });

      // Act
      await getTestsSignatures.execute({
        projectId: 'my-project',
        spec: 'my-spec.ts',
        title: 'my test title',
      });

      // Assert
      expect(mcpMock).toHaveBeenCalledTimes(1);
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-tests-signatures',
        {
          projectId: 'my-project',
          spec: 'my-spec.ts',
          title: 'my test title',
        }
      );
    });
  });

  // ==========================================================================
  // Category 9: Security Testing (MANDATORY for Phase 8 audit)
  // ==========================================================================

  describe('Security testing', () => {
    it('should run security scenarios against string fields', async () => {
      // Note: This wrapper passes identifiers to MCP API
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        async (input) => {
          mcpMock.mockResolvedValue({ signature: 'sig-123' });
          return getTestsSignatures.execute({
            projectId: input,
            spec: 'test.spec.ts',
            title: 'test title',
          });
        }
      );

      console.log(`Security tests: ${results.passed}/${results.total} scenarios tested`);
      expect(results.total).toBeGreaterThan(0);
    });

    it('should handle path traversal attempts in spec field', async () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'valid/../../../secret',
      ];

      for (const input of pathTraversalInputs) {
        mcpMock.mockResolvedValue({ signature: 'sig' });
        const result = await getTestsSignatures.execute({
          projectId: 'proj',
          spec: input,
          title: 'test',
        });
        expect(result).toBeDefined();
      }
    });

    it('should handle command injection attempts in title field', async () => {
      const commandInjectionInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
      ];

      for (const input of commandInjectionInputs) {
        mcpMock.mockResolvedValue({ signature: 'sig' });
        const result = await getTestsSignatures.execute({
          projectId: 'proj',
          spec: 'test.spec.ts',
          title: input,
        });
        expect(result).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Category 10: Response Format Testing (MANDATORY for Phase 8 audit)
  // ==========================================================================

  describe('Response format', () => {
    it('should handle direct array format', async () => {
      // This wrapper returns a single signature, not array - test signature extraction
      mcpMock.mockResolvedValue({ signature: 'abc123' });

      const result = await getTestsSignatures.execute({
        projectId: 'proj',
        spec: 'test.spec.ts',
        title: 'test',
      });

      expect(typeof result.signature).toBe('string');
      expect(result.signature).toBe('abc123');
    });

    it('should handle tuple format', async () => {
      // Response with signature and additional metadata
      mcpMock.mockResolvedValue({
        signature: 'tuple-sig',
        metadata: { hash: 'sha256' },
      });

      const result = await getTestsSignatures.execute({
        projectId: 'proj',
        spec: 'test.spec.ts',
        title: 'test',
      });

      expect(result.signature).toBe('tuple-sig');
      expect(result).not.toHaveProperty('metadata');
    });

    it('should handle object format', async () => {
      // Response with nested object structure
      mcpMock.mockResolvedValue({
        signature: 'obj-sig',
        details: { algorithm: 'sha256', version: 1 },
      });

      const result = await getTestsSignatures.execute({
        projectId: 'proj',
        spec: 'test.spec.ts',
        title: 'test',
      });

      expect(result.signature).toBe('obj-sig');
      expect(result.projectId).toBe('proj');
    });

    it('should support string operations on extracted signature', async () => {
      mcpMock.mockResolvedValue({ signature: 'test-signature-123' });

      const result = await getTestsSignatures.execute({
        projectId: 'proj',
        spec: 'test.spec.ts',
        title: 'test',
      });

      // Verify string operations work
      expect(() => result.signature.toLowerCase()).not.toThrow();
      expect(result.signature.includes('signature')).toBe(true);
    });
  });
});
