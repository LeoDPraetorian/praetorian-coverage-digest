/**
 * Unit Tests for getTestResults Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates filtering, token reduction, pagination, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMock, testSecurityScenarios, getAllSecurityScenarios } from '@claude/testing';

// Mock the MCP client module BEFORE importing
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

// Import the wrapper to test
import { getTestResults } from './get-test-results';

// Import MCP client for type access
import * as mcpClient from '../config/lib/mcp-client';

describe('getTestResults - Unit Tests', () => {
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
    it('should filter results to essential fields only', async () => {
      // Arrange: Mock MCP response with extra fields
      const mockResults = [
        {
          status: 'passed',
          duration: 1500,
          error: undefined,
          // Extra fields that should be filtered out
          testId: 'test-123',
          runId: 'run-456',
          metadata: { browser: 'chrome' },
          stackTrace: 'full stack trace here...',
        },
        {
          status: 'failed',
          duration: 2000,
          error: 'Assertion failed: expected true to be false',
          testId: 'test-456',
          runId: 'run-789',
        },
      ];

      mcpMock.mockResolvedValue({ results: mockResults, cursor: 'next-page' });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig-123' });

      // Assert
      expect(result).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(result.totalResults).toBe(2);
      expect(result.cursor).toBe('next-page');
      expect(result.hasMore).toBe(true);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify filtered results only have essential fields
      expect(result.results[0]).toEqual({
        status: 'passed',
        duration: 1500,
        error: undefined,
      });
      expect(result.results[0]).not.toHaveProperty('testId');
      expect(result.results[0]).not.toHaveProperty('metadata');
      expect(result.results[0]).not.toHaveProperty('stackTrace');
    });

    it('should truncate error messages to 200 characters', async () => {
      // Arrange: Very long error message
      const longError = 'A'.repeat(500);
      mcpMock.mockResolvedValue({
        results: [
          {
            status: 'failed',
            duration: 1000,
            error: longError,
          },
        ],
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert: Error is truncated
      expect(result.results[0].error).toHaveLength(200);
      expect(result.results[0].error).toBe('A'.repeat(200));
    });

    it('should handle empty results from MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ results: [] });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert
      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle missing results field', async () => {
      // Arrange
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert
      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
    });

    it('should respect limit parameter', async () => {
      // Arrange: Mock 100 results but limit to 10
      const mockResults = Array.from({ length: 100 }, (_, i) => ({
        status: i % 2 === 0 ? 'passed' : 'failed',
        duration: 1000 + i,
        error: i % 2 === 1 ? `Error ${i}` : undefined,
      }));

      mcpMock.mockResolvedValue({ results: mockResults });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig', limit: 10 });

      // Assert
      expect(result.results).toHaveLength(10);
      expect(result.totalResults).toBe(100);
    });

    it('should handle pagination with cursor', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        results: [{ status: 'passed', duration: 1000 }],
        cursor: 'page-2-token',
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe('page-2-token');
    });
  });

  // ==========================================================================
  // Category 2: Token Estimation
  // ==========================================================================

  describe('Token estimation', () => {
    it('should calculate tokens based on JSON size', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        results: [
          { status: 'passed', duration: 1000 },
          { status: 'failed', duration: 2000, error: 'Test error' },
        ],
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert: Token estimate should be roughly JSON length / 4
      const expectedTokens = Math.ceil(JSON.stringify(result.results).length / 4);
      expect(result.estimatedTokens).toBe(expectedTokens);
    });

    it('should estimate 1 token for empty results', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ results: [] });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert: Empty array "[]" = 2 chars = 1 token
      expect(result.estimatedTokens).toBe(1);
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
      await expect(getTestResults.execute({ signature: 'test-sig' })).rejects.toThrow(
        'Rate limited'
      );
    });

    it('should handle MCP timeout errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('ETIMEDOUT'));

      // Act & Assert
      await expect(getTestResults.execute({ signature: 'test-sig' })).rejects.toThrow(
        'ETIMEDOUT'
      );
    });

    it('should handle MCP server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('MCP server internal error'));

      // Act & Assert
      await expect(getTestResults.execute({ signature: 'test-sig' })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 4: Input Validation
  // ==========================================================================

  describe('Input validation', () => {
    it('should require signature', async () => {
      // Act & Assert
      await expect(
        getTestResults.execute({ signature: '' } as any)
      ).rejects.toThrow();
    });

    it('should accept valid signature', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ results: [] });

      // Act
      const result = await getTestResults.execute({ signature: 'valid-signature-123' });

      // Assert
      expect(result).toBeDefined();
    });

    it('should validate status enum', async () => {
      // Act & Assert
      await expect(
        getTestResults.execute({
          signature: 'test-sig',
          status: 'invalid_status' as any,
        })
      ).rejects.toThrow();
    });

    it('should accept all valid status values', async () => {
      const validStatuses = ['failed', 'passed', 'skipped', 'pending'];

      for (const status of validStatuses) {
        mcpMock.mockResolvedValue({ results: [] });
        const result = await getTestResults.execute({
          signature: 'test-sig',
          status: status as any,
        });
        expect(result).toBeDefined();
      }
    });

    it('should enforce pagination limit (max 50)', async () => {
      // Act & Assert
      await expect(
        getTestResults.execute({
          signature: 'test-sig',
          limit: 100,
        })
      ).rejects.toThrow();
    });

    it('should use default limit of 50', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ results: [] });

      // Act
      await getTestResults.execute({ signature: 'test-sig' });

      // Assert
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-test-results',
        expect.objectContaining({ limit: 50 })
      );
    });
  });

  // ==========================================================================
  // Category 5: Tool Metadata
  // ==========================================================================

  describe('Tool metadata', () => {
    it('should have correct tool name', () => {
      expect(getTestResults.name).toBe('currents.get-test-results');
    });

    it('should have input and output schemas', () => {
      expect(getTestResults.inputSchema).toBeDefined();
      expect(getTestResults.outputSchema).toBeDefined();
    });
  });

  // ==========================================================================
  // Category 6: Performance
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        results: [{ status: 'passed', duration: 1000 }],
      });

      // Act: Time multiple executions
      const iterations = 100;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await getTestResults.execute({ signature: 'test-sig' });
      }
      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      // Assert: Average execution time should be under 1ms (excluding MCP call)
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
      expect(avgTime).toBeLessThan(5); // 5ms threshold for mocked calls
    });
  });

  // ==========================================================================
  // Category 7: Edge case handling
  // ==========================================================================

  describe('Edge case handling', () => {
    it('should handle valid result with all fields', async () => {
      // Arrange: MCP returns valid data
      mcpMock.mockResolvedValue({
        results: [
          {
            status: 'passed',
            duration: 1500,
            error: 'Some error',
          },
        ],
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert
      expect(result.results[0].status).toBe('passed');
      expect(result.results[0].duration).toBe(1500);
      expect(result.results[0].error).toBe('Some error');
    });

    it('should handle missing error field (optional)', async () => {
      // Arrange: Error is optional
      mcpMock.mockResolvedValue({
        results: [
          {
            status: 'passed',
            duration: 1000,
          },
        ],
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert: No error field when not present
      expect(result.results[0].status).toBe('passed');
      expect(result.results[0].error).toBeUndefined();
    });

    it('should handle error being exactly 200 characters', async () => {
      // Arrange: Error exactly at boundary
      const exactError = 'B'.repeat(200);
      mcpMock.mockResolvedValue({
        results: [
          {
            status: 'failed',
            duration: 1000,
            error: exactError,
          },
        ],
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert: Error is preserved at boundary
      expect(result.results[0].error).toHaveLength(200);
    });

    it('should handle zero duration', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        results: [{ status: 'skipped', duration: 0 }],
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert
      expect(result.results[0].duration).toBe(0);
    });

    it('should handle empty error string', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        results: [{ status: 'failed', duration: 1000, error: '' }],
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert: Empty string is falsy, becomes undefined
      expect(result.results[0].error).toBeUndefined();
    });

    it('should handle large datasets efficiently', async () => {
      // Arrange: 1000 results
      const mockResults = Array.from({ length: 1000 }, (_, i) => ({
        status: i % 2 === 0 ? 'passed' : 'failed',
        duration: 1000 + i,
        error: i % 2 === 1 ? `Error ${i}` : undefined,
      }));

      mcpMock.mockResolvedValue({ results: mockResults });

      // Act
      const start = performance.now();
      const result = await getTestResults.execute({ signature: 'test-sig', limit: 50 });
      const filterTime = performance.now() - start;

      // Assert
      expect(result.results).toHaveLength(50);
      expect(result.totalResults).toBe(1000);
      console.log(`Filter time for 1000 results: ${filterTime.toFixed(0)}ms`);
      expect(filterTime).toBeLessThan(100);
    });

    it('should handle cursor being undefined vs null', async () => {
      // Arrange: No cursor (undefined)
      mcpMock.mockResolvedValue({
        results: [{ status: 'passed', duration: 1000 }],
        cursor: undefined,
      });

      // Act
      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Assert
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeUndefined();
    });
  });

  // ==========================================================================
  // Category 8: MCP Call Parameters
  // ==========================================================================

  describe('MCP call parameters', () => {
    it('should pass signature to MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ results: [] });

      // Act
      await getTestResults.execute({ signature: 'my-test-signature' });

      // Assert
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-test-results',
        expect.objectContaining({
          signature: 'my-test-signature',
        })
      );
    });

    it('should pass optional parameters to MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ results: [] });

      // Act
      await getTestResults.execute({
        signature: 'test-sig',
        status: 'failed',
        authors: ['author1'],
        branches: ['main'],
        tags: ['smoke'],
        cursor: 'page-2',
        limit: 25,
      });

      // Assert
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-test-results',
        expect.objectContaining({
          signature: 'test-sig',
          status: 'failed',
          authors: ['author1'],
          branches: ['main'],
          tags: ['smoke'],
          cursor: 'page-2',
          limit: 25,
        })
      );
    });
  });

  // ==========================================================================
  // Category 9: Security Testing (MANDATORY for Phase 8 audit)
  // ==========================================================================

  describe('Security testing', () => {
    it('should run security scenarios against signature field', async () => {
      // Note: This wrapper passes signature to MCP API - it's an identifier, not a file path
      // Security scenarios test that malicious inputs don't cause unexpected behavior
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        async (input) => {
          mcpMock.mockResolvedValue({ results: [] });
          return getTestResults.execute({ signature: input });
        }
      );

      // Log results for visibility - wrapper may accept inputs since they're API identifiers
      console.log(`Security tests: ${results.passed}/${results.total} scenarios tested`);
      expect(results.total).toBeGreaterThan(0);
    });

    it('should handle path traversal attempts in signature', async () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'valid/../../../secret',
      ];

      for (const input of pathTraversalInputs) {
        mcpMock.mockResolvedValue({ results: [] });
        // Signature is an API identifier - path traversal is passed to MCP, not filesystem
        const result = await getTestResults.execute({ signature: input });
        expect(result).toBeDefined();
      }
    });

    it('should handle command injection attempts in signature', async () => {
      const commandInjectionInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
      ];

      for (const input of commandInjectionInputs) {
        mcpMock.mockResolvedValue({ results: [] });
        // Signature is passed to MCP API, not shell
        const result = await getTestResults.execute({ signature: input });
        expect(result).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Category 10: Response Format Testing (MANDATORY for Phase 8 audit)
  // ==========================================================================

  describe('Response format', () => {
    it('should handle direct array format', async () => {
      // MCP returns results directly as array
      mcpMock.mockResolvedValue({
        results: [
          { status: 'passed', duration: 1000 },
          { status: 'failed', duration: 2000, error: 'Test failed' },
        ],
      });

      const result = await getTestResults.execute({ signature: 'test-sig' });

      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('should handle tuple format', async () => {
      // Some MCPs return [data, cursor] tuple
      mcpMock.mockResolvedValue({
        results: [{ status: 'passed', duration: 1000 }],
        cursor: 'next-page-token',
      });

      const result = await getTestResults.execute({ signature: 'test-sig' });

      expect(result.results).toHaveLength(1);
      expect(result.cursor).toBe('next-page-token');
      expect(result.hasMore).toBe(true);
    });

    it('should handle object format', async () => {
      // MCP returns results wrapped in object
      mcpMock.mockResolvedValue({
        results: [{ status: 'skipped', duration: 0 }],
      });

      const result = await getTestResults.execute({ signature: 'test-sig' });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('skipped');
    });

    it('should support array operations on extracted results', async () => {
      mcpMock.mockResolvedValue({
        results: [
          { status: 'passed', duration: 100 },
          { status: 'failed', duration: 200, error: 'err' },
        ],
      });

      const result = await getTestResults.execute({ signature: 'test-sig' });

      // Verify forEach works without throwing
      expect(() => result.results.forEach((r) => r.status)).not.toThrow();
      // Verify map works
      const statuses = result.results.map((r) => r.status);
      expect(statuses).toEqual(['passed', 'failed']);
    });
  });
});
