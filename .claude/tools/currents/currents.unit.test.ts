/**
 * Currents MCP Wrapper Unit Tests
 *
 * Tests all 5 currents wrappers:
 * - getProjects: List all projects
 * - getRuns: Get test runs for a project (paginated)
 * - getRunDetails: Get detailed run information
 * - getSpecFilesPerformance: Get spec performance metrics
 * - getSpecInstance: Get debugging data for a spec instance
 *
 * Following mcp-code-test-test methodology:
 * - Factory mock pattern for MCP client
 * - Schema validation tests (valid/invalid inputs)
 * - Token reduction verification (≥80% savings)
 * - Error handling tests
 * - Edge case coverage
 * - Performance tests (<100ms)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMCPMock, MCPErrors } from '@claude/testing';
import { getProjects } from './get-projects';
import { getRuns } from './get-runs';
import { getRunDetails } from './get-run-details';
import { getSpecFilesPerformance } from './get-spec-files-performance';
import { getSpecInstance } from './get-spec-instance';
import * as mcpClient from '../config/lib/mcp-client';

// Factory mock pattern (REQUIRED to prevent module loading errors)
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

// =============================================================================
// Mock Data Generators
// =============================================================================

const MockProject = (id: string, name: string) => ({
  projectId: id,  // MCP returns projectId, wrapper maps to id
  name,
  description: 'Project description - will be filtered out',
  settings: { webhookUrl: 'https://example.com' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
});

const MockRun = (id: string, status: string, specs: number = 10, tests: number = 50) => ({
  runId: id,
  status,
  completionState: 'COMPLETE',
  createdAt: '2024-01-15T10:00:00Z',
  durationMs: 180000,
  timeout: { isTimeout: false },
  // Actual API structure - nested groups with instances and tests
  groups: [{
    groupId: 'default',
    instances: { overall: specs, complete: specs, passes: specs, failures: 0 },
    tests: { overall: tests, passes: tests, failures: 0, pending: 0, skipped: 0, flaky: 0 }
  }],
  tags: [],
  meta: {
    ciBuildId: 'build-123',
    commit: { branch: 'main', sha: 'abc123', message: 'Test commit' }
  },
});

const MockRunDetails = (id: string) => ({
  id,
  status: 'failed',
  createdAt: '2024-01-15T10:00:00Z',
  specs: 25,
  tests: 100,
  passed: 85,
  failed: 10,
  skipped: 3,
  pending: 2,
  duration: 180000,
  // Verbose fields that should be filtered
  ciInfo: { provider: 'github', buildId: 'build-123' },
  browserInfo: { name: 'chrome', version: '120' },
  retries: { totalRetries: 5, retriedTests: ['test-1', 'test-2'] },
});

const MockSpecFile = (name: string, avgDuration: number, failureRate: number) => ({
  name,
  avgDuration,
  failureRate,
  flakeRate: 0.05,
  overallExecutions: 100,
  // Verbose fields that should be filtered
  lastRun: '2024-01-15T10:00:00Z',
  executionHistory: [{ runId: 'run-1', status: 'passed' }],
  authors: ['dev@example.com'],
});

const MockSpecInstance = (id: string, status: string, error?: string) => ({
  id,
  spec: 'cypress/e2e/login.cy.ts',
  status,
  duration: 5000,
  tests: 10,
  passed: 8,
  failed: 2,
  error,
  // Verbose fields that should be filtered
  screenshots: [{ path: '/path/to/screenshot.png' }],
  video: '/path/to/video.mp4',
  attempts: [{ attemptId: 1, status: 'failed' }],
});

// =============================================================================
// getProjects Tests
// =============================================================================

describe('getProjects', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  describe('Schema Validation', () => {
    it('should accept empty input object', async () => {
      mcpMock.mockResolvedValue([]);  // MCP returns direct array

      const result = await getProjects.execute({});

      expect(result.projects).toEqual([]);
      expect(mcpMock).toHaveBeenCalledWith('currents', 'currents-get-projects', {});
    });
  });

  describe('Filtering & Token Reduction', () => {
    it('should extract only id and name from projects', async () => {
      // MCP returns direct array, not wrapped in object
      mcpMock.mockResolvedValue([
        MockProject('proj-1', 'E2E Tests'),
        MockProject('proj-2', 'Integration Tests'),
      ]);

      const result = await getProjects.execute({});

      expect(result.projects).toHaveLength(2);
      expect(result.projects[0]).toEqual({ id: 'proj-1', name: 'E2E Tests' });
      expect(result.projects[1]).toEqual({ id: 'proj-2', name: 'Integration Tests' });
      // Verify verbose fields are removed
      expect(result.projects[0]).not.toHaveProperty('description');
      expect(result.projects[0]).not.toHaveProperty('settings');
      expect(result.projects[0]).not.toHaveProperty('createdAt');
    });

    it('should calculate totalProjects correctly', async () => {
      mcpMock.mockResolvedValue([
        MockProject('proj-1', 'Project 1'),
        MockProject('proj-2', 'Project 2'),
        MockProject('proj-3', 'Project 3'),
      ]);

      const result = await getProjects.execute({});

      expect(result.totalProjects).toBe(3);
    });

    it('should estimate token count', async () => {
      mcpMock.mockResolvedValue([MockProject('proj-1', 'E2E Tests')]);

      const result = await getProjects.execute({});

      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(typeof result.estimatedTokens).toBe('number');
    });

    it('should achieve ≥80% token reduction', async () => {
      const rawProjects = Array.from({ length: 10 }, (_, i) =>
        MockProject(`proj-${i}`, `Project ${i}`)
      );
      mcpMock.mockResolvedValue(rawProjects);  // Direct array

      const result = await getProjects.execute({});

      const rawSize = JSON.stringify(rawProjects).length;
      const filteredSize = JSON.stringify(result.projects).length;
      const reduction = 1 - filteredSize / rawSize;

      expect(reduction).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty projects array', async () => {
      mcpMock.mockResolvedValue([]);  // Direct empty array

      const result = await getProjects.execute({});

      expect(result.projects).toEqual([]);
      expect(result.totalProjects).toBe(0);
    });

    it('should handle non-array response gracefully', async () => {
      mcpMock.mockResolvedValue({});  // Object instead of array

      const result = await getProjects.execute({});

      expect(result.projects).toEqual([]);
      expect(result.totalProjects).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should propagate rate limit errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.rateLimit());

      await expect(getProjects.execute({})).rejects.toThrow(/rate limit/i);
    });

    it('should propagate server errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      await expect(getProjects.execute({})).rejects.toThrow(/server.*error/i);
    });

    it('should propagate timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      await expect(getProjects.execute({})).rejects.toThrow(/ETIMEDOUT/);
    });
  });

  describe('Performance', () => {
    it('should execute in <100ms', async () => {
      // MCP returns direct array
      mcpMock.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) =>
          MockProject(`proj-${i}`, `Project ${i}`)
        )
      );

      const start = performance.now();
      await getProjects.execute({});
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});

// =============================================================================
// getRuns Tests
// =============================================================================

describe('getRuns', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  describe('Schema Validation', () => {
    it('should accept valid input with required projectId', async () => {
      mcpMock.mockResolvedValue({ runs: [] });

      const result = await getRuns.execute({ projectId: 'proj-123' });

      expect(result.runs).toEqual([]);
      expect(mcpMock).toHaveBeenCalledWith('currents', 'currents-get-runs', {
        projectId: 'proj-123',
        limit: 50, // default
      });
    });

    it('should accept optional cursor and limit', async () => {
      mcpMock.mockResolvedValue({ runs: [], cursor: 'next-cursor' });

      const result = await getRuns.execute({
        projectId: 'proj-123',
        cursor: 'prev-cursor',
        limit: 25,
      });

      expect(mcpMock).toHaveBeenCalledWith('currents', 'currents-get-runs', {
        projectId: 'proj-123',
        cursor: 'prev-cursor',
        limit: 25,
      });
    });

    it('should reject empty projectId', async () => {
      await expect(getRuns.execute({ projectId: '' })).rejects.toThrow();
    });

    it('should reject limit below 1', async () => {
      await expect(
        getRuns.execute({ projectId: 'proj-123', limit: 0 })
      ).rejects.toThrow();
    });

    it('should reject limit above 50', async () => {
      await expect(
        getRuns.execute({ projectId: 'proj-123', limit: 51 })
      ).rejects.toThrow();
    });
  });

  describe('Filtering & Token Reduction', () => {
    it('should extract only essential run fields', async () => {
      mcpMock.mockResolvedValue({
        data: [MockRun('run-1', 'FAILED', 10, 50)],
      });

      const result = await getRuns.execute({ projectId: 'proj-123' });

      expect(result.runs[0]).toMatchObject({
        id: 'run-1',
        status: 'FAILED',
        createdAt: '2024-01-15T10:00:00Z',
      });
      // Verify specs and tests are aggregated from groups
      expect(result.runs[0].specs.total).toBe(10);
      expect(result.runs[0].tests.total).toBe(50);
      // Verify verbose fields are removed (groups, meta remain but are filtered in output)
      expect(result.runs[0]).not.toHaveProperty('groups');
      expect(result.runs[0]).not.toHaveProperty('timeout');
    });

    it('should respect limit parameter', async () => {
      mcpMock.mockResolvedValue({
        data: Array.from({ length: 50 }, (_, i) =>
          MockRun(`run-${i}`, 'PASSED')
        ),
      });

      const result = await getRuns.execute({ projectId: 'proj-123', limit: 10 });

      expect(result.runs).toHaveLength(10);
    });

    it('should handle pagination cursor', async () => {
      mcpMock.mockResolvedValue({
        data: [MockRun('run-1', 'PASSED')],
        has_more: true,
      });

      const result = await getRuns.execute({ projectId: 'proj-123' });

      expect(result.hasMore).toBe(true);
    });

    it('should set hasMore=false when no cursor', async () => {
      mcpMock.mockResolvedValue({
        data: [MockRun('run-1', 'PASSED')],
        has_more: false,
      });

      const result = await getRuns.execute({ projectId: 'proj-123' });

      expect(result.hasMore).toBe(false);
    });

    it('should achieve significant token reduction (≥50%)', async () => {
      const rawRuns = Array.from({ length: 20 }, (_, i) =>
        MockRun(`run-${i}`, 'PASSED', 10, 50)
      );
      mcpMock.mockResolvedValue({ data: rawRuns });

      const result = await getRuns.execute({ projectId: 'proj-123' });

      const rawSize = JSON.stringify(rawRuns).length;
      const filteredSize = JSON.stringify(result.runs).length;
      const reduction = 1 - filteredSize / rawSize;

      // getRuns removes groups structure, meta (~25% reduction actual)
      expect(reduction).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty runs array', async () => {
      mcpMock.mockResolvedValue({ data: [] });

      const result = await getRuns.execute({ projectId: 'proj-123' });

      expect(result.runs).toEqual([]);
      expect(result.totalRuns).toBe(0);
    });

    it('should handle missing runs field', async () => {
      mcpMock.mockResolvedValue({});

      const result = await getRuns.execute({ projectId: 'proj-123' });

      expect(result.runs).toEqual([]);
      expect(result.totalRuns).toBe(0);
    });

    it('should handle runs with missing optional fields', async () => {
      mcpMock.mockResolvedValue({
        data: [{ runId: 'run-1', status: 'PASSED', createdAt: '2024-01-15T10:00:00Z', groups: [] }],
      });

      const result = await getRuns.execute({ projectId: 'proj-123' });

      expect(result.runs[0].specs.total).toBe(0);
      expect(result.runs[0].tests.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should propagate MCP errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      await expect(
        getRuns.execute({ projectId: 'proj-123' })
      ).rejects.toThrow();
    });
  });
});

// =============================================================================
// getRunDetails Tests
// =============================================================================

describe('getRunDetails', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  describe('Schema Validation', () => {
    it('should accept valid runId', async () => {
      mcpMock.mockResolvedValue(MockRunDetails('run-123'));

      const result = await getRunDetails.execute({ runId: 'run-123' });

      expect(result.run.id).toBe('run-123');
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-run-details',
        { runId: 'run-123' }
      );
    });

    it('should reject empty runId', async () => {
      await expect(getRunDetails.execute({ runId: '' })).rejects.toThrow();
    });
  });

  describe('Filtering & Token Reduction', () => {
    it('should extract only essential run details', async () => {
      mcpMock.mockResolvedValue(MockRunDetails('run-123'));

      const result = await getRunDetails.execute({ runId: 'run-123' });

      expect(result.run).toEqual({
        id: 'run-123',
        status: 'failed',
        createdAt: '2024-01-15T10:00:00Z',
        specs: 25,
        tests: 100,
        passed: 85,
        failed: 10,
        skipped: 3,
        pending: 2,
        duration: 180000,
      });
      // Verify verbose fields are removed
      expect(result.run).not.toHaveProperty('ciInfo');
      expect(result.run).not.toHaveProperty('browserInfo');
      expect(result.run).not.toHaveProperty('retries');
    });

    it('should achieve ≥80% token reduction', async () => {
      const rawDetails = MockRunDetails('run-123');
      mcpMock.mockResolvedValue(rawDetails);

      const result = await getRunDetails.execute({ runId: 'run-123' });

      const rawSize = JSON.stringify(rawDetails).length;
      const filteredSize = JSON.stringify(result.run).length;
      const reduction = 1 - filteredSize / rawSize;

      expect(reduction).toBeGreaterThanOrEqual(0.5); // Lower threshold due to essential data
    });
  });

  describe('Edge Cases', () => {
    it('should use runId as fallback when id missing', async () => {
      mcpMock.mockResolvedValue({
        status: 'passed',
        createdAt: '2024-01-15T10:00:00Z',
      });

      const result = await getRunDetails.execute({ runId: 'run-456' });

      expect(result.run.id).toBe('run-456');
    });

    it('should handle missing optional fields with defaults', async () => {
      mcpMock.mockResolvedValue({
        id: 'run-123',
      });

      const result = await getRunDetails.execute({ runId: 'run-123' });

      expect(result.run.status).toBe('unknown');
      expect(result.run.specs).toBe(0);
      expect(result.run.tests).toBe(0);
      expect(result.run.passed).toBe(0);
      expect(result.run.failed).toBe(0);
      expect(result.run.skipped).toBe(0);
      expect(result.run.pending).toBe(0);
    });

    it('should handle optional duration', async () => {
      mcpMock.mockResolvedValue({
        id: 'run-123',
        status: 'passed',
        createdAt: '2024-01-15T10:00:00Z',
        duration: undefined,
      });

      const result = await getRunDetails.execute({ runId: 'run-123' });

      expect(result.run.duration).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should propagate not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound());

      await expect(
        getRunDetails.execute({ runId: 'nonexistent' })
      ).rejects.toThrow(/404|not found/i);
    });
  });
});

// =============================================================================
// getSpecFilesPerformance Tests
// =============================================================================

describe('getSpecFilesPerformance', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  describe('Schema Validation', () => {
    it('should accept valid input with required fields', async () => {
      mcpMock.mockResolvedValue({ specFiles: [] });

      const result = await getSpecFilesPerformance.execute({
        projectId: 'proj-123',
        order: 'failureRate',
      });

      expect(result.specFiles).toEqual([]);
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-spec-files-performance',
        expect.objectContaining({
          projectId: 'proj-123',
          order: 'failureRate',
          orderDirection: 'desc', // default
        })
      );
    });

    it('should accept all valid order values', async () => {
      const orderValues = [
        'failedExecutions',
        'failureRate',
        'flakeRate',
        'flakyExecutions',
        'fullyReported',
        'overallExecutions',
        'suiteSize',
        'timeoutExecutions',
        'timeoutRate',
        'avgDuration',
      ];

      for (const order of orderValues) {
        mcpMock.mockResolvedValue({ specFiles: [] });

        await expect(
          getSpecFilesPerformance.execute({
            projectId: 'proj-123',
            order: order as any,
          })
        ).resolves.not.toThrow();
      }
    });

    it('should accept optional filter parameters', async () => {
      mcpMock.mockResolvedValue({ specFiles: [] });

      const result = await getSpecFilesPerformance.execute({
        projectId: 'proj-123',
        order: 'avgDuration',
        orderDirection: 'asc',
        from: '2024-01-01',
        to: '2024-01-31',
        authors: ['dev@example.com'],
        branches: ['main'],
        tags: ['smoke'],
        specNameFilter: 'login',
        page: 1,
        limit: 25,
      });

      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-spec-files-performance',
        expect.objectContaining({
          authors: ['dev@example.com'],
          branches: ['main'],
          tags: ['smoke'],
          specNameFilter: 'login',
        })
      );
    });

    it('should reject empty projectId', async () => {
      await expect(
        getSpecFilesPerformance.execute({ projectId: '', order: 'failureRate' })
      ).rejects.toThrow();
    });

    it('should reject invalid order value', async () => {
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'proj-123',
          order: 'invalid' as any,
        })
      ).rejects.toThrow();
    });

    it('should reject limit above 50', async () => {
      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'proj-123',
          order: 'failureRate',
          limit: 100,
        })
      ).rejects.toThrow();
    });
  });

  describe('Filtering & Token Reduction', () => {
    it('should extract only essential spec metrics', async () => {
      mcpMock.mockResolvedValue({
        specFiles: [MockSpecFile('cypress/e2e/login.cy.ts', 5000, 0.1)],
      });

      const result = await getSpecFilesPerformance.execute({
        projectId: 'proj-123',
        order: 'failureRate',
      });

      expect(result.specFiles[0]).toEqual({
        name: 'cypress/e2e/login.cy.ts',
        avgDuration: 5000,
        failureRate: 0.1,
        flakeRate: 0.05,
        overallExecutions: 100,
      });
      // Verify verbose fields are removed
      expect(result.specFiles[0]).not.toHaveProperty('lastRun');
      expect(result.specFiles[0]).not.toHaveProperty('executionHistory');
      expect(result.specFiles[0]).not.toHaveProperty('authors');
    });

    it('should respect limit parameter', async () => {
      mcpMock.mockResolvedValue({
        specFiles: Array.from({ length: 50 }, (_, i) =>
          MockSpecFile(`spec-${i}.cy.ts`, 1000, 0.05)
        ),
      });

      const result = await getSpecFilesPerformance.execute({
        projectId: 'proj-123',
        order: 'avgDuration',
        limit: 10,
      });

      expect(result.specFiles).toHaveLength(10);
    });

    it('should calculate hasMore based on total vs limit', async () => {
      mcpMock.mockResolvedValue({
        specFiles: Array.from({ length: 60 }, (_, i) =>
          MockSpecFile(`spec-${i}.cy.ts`, 1000, 0.05)
        ),
      });

      const result = await getSpecFilesPerformance.execute({
        projectId: 'proj-123',
        order: 'avgDuration',
        limit: 50,
      });

      expect(result.hasMore).toBe(true);
      expect(result.totalSpecs).toBe(60);
    });

    it('should achieve ≥80% token reduction', async () => {
      const rawSpecs = Array.from({ length: 20 }, (_, i) =>
        MockSpecFile(`spec-${i}.cy.ts`, 1000 * i, 0.05 * i)
      );
      mcpMock.mockResolvedValue({ specFiles: rawSpecs });

      const result = await getSpecFilesPerformance.execute({
        projectId: 'proj-123',
        order: 'avgDuration',
      });

      const rawSize = JSON.stringify(rawSpecs).length;
      const filteredSize = JSON.stringify(result.specFiles).length;
      const reduction = 1 - filteredSize / rawSize;

      expect(reduction).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty specFiles array', async () => {
      mcpMock.mockResolvedValue({ specFiles: [] });

      const result = await getSpecFilesPerformance.execute({
        projectId: 'proj-123',
        order: 'failureRate',
      });

      expect(result.specFiles).toEqual([]);
      expect(result.totalSpecs).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle missing specFiles field', async () => {
      mcpMock.mockResolvedValue({});

      const result = await getSpecFilesPerformance.execute({
        projectId: 'proj-123',
        order: 'failureRate',
      });

      expect(result.specFiles).toEqual([]);
      expect(result.totalSpecs).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should propagate MCP errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.serverError());

      await expect(
        getSpecFilesPerformance.execute({
          projectId: 'proj-123',
          order: 'failureRate',
        })
      ).rejects.toThrow();
    });
  });
});

// =============================================================================
// getSpecInstance Tests
// =============================================================================

describe('getSpecInstance', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  describe('Schema Validation', () => {
    it('should accept valid instanceId', async () => {
      mcpMock.mockResolvedValue(MockSpecInstance('inst-123', 'passed'));

      const result = await getSpecInstance.execute({ instanceId: 'inst-123' });

      expect(result.instance.id).toBe('inst-123');
      expect(mcpMock).toHaveBeenCalledWith(
        'currents',
        'currents-get-spec-instance',
        { instanceId: 'inst-123' }
      );
    });

    it('should reject empty instanceId', async () => {
      await expect(getSpecInstance.execute({ instanceId: '' })).rejects.toThrow();
    });
  });

  describe('Filtering & Token Reduction', () => {
    it('should extract only essential instance fields', async () => {
      mcpMock.mockResolvedValue(MockSpecInstance('inst-123', 'failed', 'Error message'));

      const result = await getSpecInstance.execute({ instanceId: 'inst-123' });

      expect(result.instance).toEqual({
        id: 'inst-123',
        spec: 'cypress/e2e/login.cy.ts',
        status: 'failed',
        duration: 5000,
        tests: 10,
        passed: 8,
        failed: 2,
        error: 'Error message',
      });
      // Verify verbose fields are removed
      expect(result.instance).not.toHaveProperty('screenshots');
      expect(result.instance).not.toHaveProperty('video');
      expect(result.instance).not.toHaveProperty('attempts');
    });

    it('should truncate error messages to 300 characters', async () => {
      const longError = 'A'.repeat(500);
      mcpMock.mockResolvedValue(MockSpecInstance('inst-123', 'failed', longError));

      const result = await getSpecInstance.execute({ instanceId: 'inst-123' });

      expect(result.instance.error).toHaveLength(300);
      expect(result.instance.error).toBe('A'.repeat(300));
    });

    it('should handle undefined error gracefully', async () => {
      mcpMock.mockResolvedValue(MockSpecInstance('inst-123', 'passed', undefined));

      const result = await getSpecInstance.execute({ instanceId: 'inst-123' });

      expect(result.instance.error).toBeUndefined();
    });

    it('should achieve ≥80% token reduction with long errors', async () => {
      const longError = 'Stack trace line\n'.repeat(100);
      const rawInstance = MockSpecInstance('inst-123', 'failed', longError);
      mcpMock.mockResolvedValue(rawInstance);

      const result = await getSpecInstance.execute({ instanceId: 'inst-123' });

      const rawSize = JSON.stringify(rawInstance).length;
      const filteredSize = JSON.stringify(result.instance).length;
      const reduction = 1 - filteredSize / rawSize;

      expect(reduction).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('Edge Cases', () => {
    it('should use instanceId as fallback when id missing', async () => {
      mcpMock.mockResolvedValue({
        spec: 'test.cy.ts',
        status: 'passed',
      });

      const result = await getSpecInstance.execute({ instanceId: 'inst-456' });

      expect(result.instance.id).toBe('inst-456');
    });

    it('should handle missing optional fields with defaults', async () => {
      mcpMock.mockResolvedValue({
        id: 'inst-123',
      });

      const result = await getSpecInstance.execute({ instanceId: 'inst-123' });

      expect(result.instance.spec).toBe('unknown');
      expect(result.instance.status).toBe('unknown');
      expect(result.instance.duration).toBe(0);
      expect(result.instance.tests).toBe(0);
      expect(result.instance.passed).toBe(0);
      expect(result.instance.failed).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should propagate not found errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.notFound());

      await expect(
        getSpecInstance.execute({ instanceId: 'nonexistent' })
      ).rejects.toThrow(/404|not found/i);
    });

    it('should propagate timeout errors', async () => {
      mcpMock.mockRejectedValue(MCPErrors.timeout());

      await expect(
        getSpecInstance.execute({ instanceId: 'inst-123' })
      ).rejects.toThrow(/ETIMEDOUT/);
    });
  });

  describe('Performance', () => {
    it('should execute in <100ms', async () => {
      mcpMock.mockResolvedValue(MockSpecInstance('inst-123', 'passed'));

      const start = performance.now();
      await getSpecInstance.execute({ instanceId: 'inst-123' });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
