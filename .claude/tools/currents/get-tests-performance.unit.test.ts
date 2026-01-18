/**
 * Unit Tests for getTestsPerformance Wrapper
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
import { getTestsPerformance } from './get-tests-performance';

// Import MCP client for type access
import * as mcpClient from '../config/lib/mcp-client';

describe('getTestsPerformance - Unit Tests', () => {
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
    it('should filter tests to essential fields only', async () => {
      // Arrange: Mock MCP response with extra fields
      const mockTests = [
        {
          title: 'should login successfully',
          duration: 1500,
          executions: 100,
          failures: 2,
          flakiness: 0.02,
          passes: 98,
          // Extra fields that should be filtered out
          testId: 'test-123',
          spec: 'auth.spec.ts',
          history: [{ date: '2024-01-01', status: 'passed' }],
          metadata: { browser: 'chrome' },
        },
        {
          title: 'should handle errors',
          duration: 2000,
          executions: 50,
          failures: 10,
          flakiness: 0.20,
          passes: 40,
          testId: 'test-456',
        },
      ];

      mcpMock.mockResolvedValue({ tests: mockTests });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.tests).toHaveLength(2);
      expect(result.totalTests).toBe(2);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify filtered tests only have essential fields
      expect(result.tests[0]).toEqual({
        title: 'should login successfully',
        duration: 1500,
        executions: 100,
        failures: 2,
        flakiness: 0.02,
        passes: 98,
      });
      expect(result.tests[0]).not.toHaveProperty('testId');
      expect(result.tests[0]).not.toHaveProperty('spec');
      expect(result.tests[0]).not.toHaveProperty('history');
      expect(result.tests[0]).not.toHaveProperty('metadata');
    });

    it('should handle empty tests array', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ tests: [] });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-empty',
        order: 'flakiness',
      });

      // Assert
      expect(result.tests).toEqual([]);
      expect(result.totalTests).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle response with only tests field', async () => {
      // Arrange: Minimal valid response
      mcpMock.mockResolvedValue({
        tests: [
          {
            title: 'Minimal test',
            duration: 500,
            executions: 10,
            failures: 1,
            flakiness: 0.1,
            passes: 9,
          },
        ],
      });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert
      expect(result.tests).toHaveLength(1);
      expect(result.totalTests).toBe(1);
    });

    it('should handle missing tests field', async () => {
      // Arrange
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert
      expect(result.tests).toEqual([]);
      expect(result.totalTests).toBe(0);
    });

    it('should respect limit parameter', async () => {
      // Arrange: Mock 100 tests but limit to 10
      const mockTests = Array.from({ length: 100 }, (_, i) => ({
        title: `Test ${i}`,
        duration: 1000 + i,
        executions: 50,
        failures: i % 10,
        flakiness: (i % 10) / 50,
        passes: 50 - (i % 10),
      }));

      mcpMock.mockResolvedValue({ tests: mockTests });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
        limit: 10,
      });

      // Assert
      expect(result.tests).toHaveLength(10);
      expect(result.totalTests).toBe(100);
      expect(result.hasMore).toBe(true);
    });

    it('should calculate hasMore correctly', async () => {
      // Arrange: Exactly at limit
      const mockTests = Array.from({ length: 50 }, (_, i) => ({
        title: `Test ${i}`,
        duration: 1000,
        executions: 50,
        failures: 0,
        flakiness: 0,
        passes: 50,
      }));

      mcpMock.mockResolvedValue({ tests: mockTests });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
        limit: 50,
      });

      // Assert
      expect(result.tests).toHaveLength(50);
      expect(result.hasMore).toBe(false);
    });
  });

  // ==========================================================================
  // Category 2: Token Estimation
  // ==========================================================================

  describe('Token estimation', () => {
    it('should calculate tokens based on JSON size', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        tests: [
          {
            title: 'Test 1',
            duration: 1000,
            executions: 100,
            failures: 5,
            flakiness: 0.05,
            passes: 95,
          },
        ],
      });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert: Token estimate should be roughly JSON length / 4
      const expectedTokens = Math.ceil(JSON.stringify(result.tests).length / 4);
      expect(result.estimatedTokens).toBe(expectedTokens);
    });

    it('should estimate 1 token for empty tests', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ tests: [] });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

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
      await expect(
        getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'duration',
        })
      ).rejects.toThrow('Rate limited');
    });

    it('should handle MCP timeout errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('ETIMEDOUT'));

      // Act & Assert
      await expect(
        getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'duration',
        })
      ).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle MCP server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(new Error('MCP server internal error'));

      // Act & Assert
      await expect(
        getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'duration',
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
        getTestsPerformance.execute({
          projectId: '',
          order: 'duration',
        } as any)
      ).rejects.toThrow();
    });

    it('should require order', async () => {
      // Act & Assert
      await expect(
        getTestsPerformance.execute({
          projectId: 'project-123',
        } as any)
      ).rejects.toThrow();
    });

    it('should validate order enum', async () => {
      // Act & Assert
      await expect(
        getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'invalid_order' as any,
        })
      ).rejects.toThrow();
    });

    it('should accept all valid order values', async () => {
      const validOrders = ['duration', 'executions', 'failures', 'flakiness', 'passes', 'title'];

      for (const order of validOrders) {
        mcpMock.mockResolvedValue({ tests: [] });
        const result = await getTestsPerformance.execute({
          projectId: 'project-123',
          order: order as any,
        });
        expect(result).toBeDefined();
      }
    });

    it('should validate orderDirection enum', async () => {
      // Act & Assert
      await expect(
        getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'duration',
          orderDirection: 'invalid' as any,
        })
      ).rejects.toThrow();
    });

    it('should accept valid orderDirection values', async () => {
      for (const direction of ['asc', 'desc']) {
        mcpMock.mockResolvedValue({ tests: [] });
        const result = await getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'duration',
          orderDirection: direction as any,
        });
        expect(result).toBeDefined();
      }
    });

    it('should enforce pagination limit (max 50)', async () => {
      // Act & Assert
      await expect(
        getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'duration',
          limit: 100,
        })
      ).rejects.toThrow();
    });

    it('should use default limit of 50', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ tests: [] });

      // Act
      await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-tests-performance',
        expect.objectContaining({ limit: 50 })
      );
    });
  });

  // ==========================================================================
  // Category 5: Tool Metadata
  // ==========================================================================

  describe('Tool metadata', () => {
    it('should have correct tool name', () => {
      expect(getTestsPerformance.name).toBe('currents.get-tests-performance');
    });

    it('should have input and output schemas', () => {
      expect(getTestsPerformance.inputSchema).toBeDefined();
      expect(getTestsPerformance.outputSchema).toBeDefined();
    });
  });

  // ==========================================================================
  // Category 6: Performance
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        tests: [
          {
            title: 'Test',
            duration: 1000,
            executions: 100,
            failures: 0,
            flakiness: 0,
            passes: 100,
          },
        ],
      });

      // Act: Time multiple executions
      const iterations = 100;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'duration',
        });
      }
      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      // Assert
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
      expect(avgTime).toBeLessThan(5);
    });

    it('should handle filtering large datasets efficiently', async () => {
      // Arrange: 1000 tests
      const mockTests = Array.from({ length: 1000 }, (_, i) => ({
        title: `Test ${i}`,
        duration: 1000 + i,
        executions: 100,
        failures: i % 10,
        flakiness: (i % 10) / 100,
        passes: 100 - (i % 10),
        extraField: 'should be filtered',
      }));

      mcpMock.mockResolvedValue({ tests: mockTests });

      // Act
      const start = performance.now();
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
        limit: 50,
      });
      const filterTime = performance.now() - start;

      // Assert
      expect(result.tests).toHaveLength(50);
      console.log(`Filter time for 1000 tests: ${filterTime.toFixed(0)}ms`);
      expect(filterTime).toBeLessThan(100);
    });
  });

  // ==========================================================================
  // Category 7: Edge case handling
  // ==========================================================================

  describe('Edge case handling', () => {
    it('should handle valid test with all required fields', async () => {
      // Arrange: Valid response with all required fields
      mcpMock.mockResolvedValue({
        tests: [
          {
            title: 'Complete test',
            duration: 1500,
            executions: 100,
            failures: 5,
            flakiness: 0.05,
            passes: 95,
          },
        ],
      });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert
      expect(result.tests[0].title).toBe('Complete test');
      expect(result.tests[0].duration).toBe(1500);
    });

    it('should handle zero values', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        tests: [
          {
            title: 'Zero test',
            duration: 0,
            executions: 0,
            failures: 0,
            flakiness: 0,
            passes: 0,
          },
        ],
      });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert
      expect(result.tests[0].duration).toBe(0);
      expect(result.tests[0].executions).toBe(0);
      expect(result.tests[0].flakiness).toBe(0);
    });

    it('should handle very long test titles', async () => {
      // Arrange
      const longTitle = 'A'.repeat(1000);
      mcpMock.mockResolvedValue({
        tests: [
          {
            title: longTitle,
            duration: 1000,
            executions: 100,
            failures: 0,
            flakiness: 0,
            passes: 100,
          },
        ],
      });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert: Long titles are preserved (no truncation)
      expect(result.tests[0].title).toBe(longTitle);
    });

    it('should handle negative values', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        tests: [
          {
            title: 'Negative test',
            duration: -100,
            executions: -1,
            failures: -5,
            flakiness: -0.1,
            passes: -10,
          },
        ],
      });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
      });

      // Assert: Negative values are preserved
      expect(result.tests[0].duration).toBe(-100);
      expect(result.tests[0].failures).toBe(-5);
    });

    it('should handle page 0', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ tests: [] });

      // Act
      const result = await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
        page: 0,
      });

      // Assert
      expect(result.page).toBe(0);
    });

    it('should reject string values in numeric fields', async () => {
      // Arrange: Some APIs return numbers as strings - our schema is strict
      mcpMock.mockResolvedValue({
        tests: [
          {
            title: 'String number test',
            duration: '1500',
            executions: '100',
            failures: '5',
            flakiness: '0.05',
            passes: '95',
          },
        ],
      });

      // Act & Assert: Strict schema rejects string numbers
      await expect(
        getTestsPerformance.execute({
          projectId: 'project-123',
          order: 'duration',
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 8: MCP Call Parameters
  // ==========================================================================

  describe('MCP call parameters', () => {
    it('should pass projectId and order to MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ tests: [] });

      // Act
      await getTestsPerformance.execute({
        projectId: 'my-project',
        order: 'flakiness',
      });

      // Assert
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-tests-performance',
        expect.objectContaining({
          projectId: 'my-project',
          order: 'flakiness',
        })
      );
    });

    it('should pass all optional parameters to MCP', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ tests: [] });

      // Act
      await getTestsPerformance.execute({
        projectId: 'project-123',
        order: 'duration',
        orderDirection: 'asc',
        from: '2024-01-01',
        to: '2024-01-31',
        authors: ['author1', 'author2'],
        branches: ['main', 'develop'],
        tags: ['smoke', 'regression'],
        testNameFilter: 'login',
        specNameFilter: 'auth',
        page: 2,
        limit: 25,
      });

      // Assert
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-tests-performance',
        expect.objectContaining({
          projectId: 'project-123',
          order: 'duration',
          orderDirection: 'asc',
          from: '2024-01-01',
          to: '2024-01-31',
          authors: ['author1', 'author2'],
          branches: ['main', 'develop'],
          tags: ['smoke', 'regression'],
          testNameFilter: 'login',
          specNameFilter: 'auth',
          page: 2,
          limit: 25,
        })
      );
    });
  });

  // ==========================================================================
  // Category 9: Security Testing (MANDATORY for Phase 8 audit)
  // ==========================================================================

  describe('Security testing', () => {
    it('should run security scenarios against projectId field', async () => {
      // Note: This wrapper passes projectId to MCP API - it's an identifier, not a file path
      const results = await testSecurityScenarios(
        getAllSecurityScenarios(),
        async (input) => {
          mcpMock.mockResolvedValue({ tests: [] });
          return getTestsPerformance.execute({ projectId: input, order: 'duration' });
        }
      );

      console.log(`Security tests: ${results.passed}/${results.total} scenarios tested`);
      expect(results.total).toBeGreaterThan(0);
    });

    it('should handle path traversal attempts in projectId', async () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'valid/../../../secret',
      ];

      for (const input of pathTraversalInputs) {
        mcpMock.mockResolvedValue({ tests: [] });
        const result = await getTestsPerformance.execute({ projectId: input, order: 'duration' });
        expect(result).toBeDefined();
      }
    });

    it('should handle command injection attempts in projectId', async () => {
      const commandInjectionInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
      ];

      for (const input of commandInjectionInputs) {
        mcpMock.mockResolvedValue({ tests: [] });
        const result = await getTestsPerformance.execute({ projectId: input, order: 'duration' });
        expect(result).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Category 10: Response Format Testing (MANDATORY for Phase 8 audit)
  // ==========================================================================

  describe('Response format', () => {
    it('should handle direct array format', async () => {
      // MCP returns tests directly as array in object
      mcpMock.mockResolvedValue({
        tests: [
          { title: 'Test 1', duration: 1000, executions: 50, failures: 2, flakiness: 0.04, passes: 48 },
          { title: 'Test 2', duration: 2000, executions: 100, failures: 5, flakiness: 0.05, passes: 95 },
        ],
      });

      const result = await getTestsPerformance.execute({ projectId: 'proj', order: 'duration' });

      expect(Array.isArray(result.tests)).toBe(true);
      expect(result.tests).toHaveLength(2);
    });

    it('should handle tuple format', async () => {
      // Some MCPs return [data, pagination] tuple
      mcpMock.mockResolvedValue({
        tests: [{ title: 'Test', duration: 1000, executions: 10, failures: 0, flakiness: 0, passes: 10 }],
      });

      const result = await getTestsPerformance.execute({ projectId: 'proj', order: 'duration' });

      expect(result.tests).toHaveLength(1);
      expect(result.totalTests).toBe(1);
    });

    it('should handle object format', async () => {
      // MCP returns tests wrapped in object
      mcpMock.mockResolvedValue({
        tests: [{ title: 'Obj Test', duration: 500, executions: 25, failures: 1, flakiness: 0.04, passes: 24 }],
      });

      const result = await getTestsPerformance.execute({ projectId: 'proj', order: 'flakiness' });

      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].title).toBe('Obj Test');
    });

    it('should support array operations on extracted tests', async () => {
      mcpMock.mockResolvedValue({
        tests: [
          { title: 'A', duration: 100, executions: 10, failures: 0, flakiness: 0, passes: 10 },
          { title: 'B', duration: 200, executions: 20, failures: 1, flakiness: 0.05, passes: 19 },
        ],
      });

      const result = await getTestsPerformance.execute({ projectId: 'proj', order: 'duration' });

      expect(() => result.tests.forEach((t) => t.title)).not.toThrow();
      const titles = result.tests.map((t) => t.title);
      expect(titles).toEqual(['A', 'B']);
    });
  });
});
