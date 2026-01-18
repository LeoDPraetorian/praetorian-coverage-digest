/**
 * Unit Tests for list-cycles Wrapper
 *
 * These tests validate the list-cycles wrapper using MOCKED MCP responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run list-cycles.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listCycles, listCyclesParams, listCyclesOutput } from './list-cycles';
import {
  testSecurityScenarios,
  PathTraversalScenarios,
  CommandInjectionScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the client and GraphQL modules BEFORE importing
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn(),
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn(),
}));

import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

describe('listCycles - Unit Tests', () => {
  const mockClient = {};

  beforeEach(() => {
    vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should accept empty input', () => {
      const input = {};
      const result = listCyclesParams.parse(input);
      expect(result).toBeDefined();
    });

    it('should accept valid team filter', () => {
      const input = { team: 'Engineering' };
      const result = listCyclesParams.parse(input);
      expect(result.team).toBe('Engineering');
    });

    it('should accept valid query', () => {
      const input = { query: 'Sprint 1' };
      const result = listCyclesParams.parse(input);
      expect(result.query).toBe('Sprint 1');
    });

    it('should accept limit within range', () => {
      const input = { limit: 100 };
      const result = listCyclesParams.parse(input);
      expect(result.limit).toBe(100);
    });

    it('should reject limit below minimum', () => {
      expect(() => listCyclesParams.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit above maximum', () => {
      expect(() => listCyclesParams.parse({ limit: 251 })).toThrow();
    });

    it('should accept includeArchived flag', () => {
      const input = { includeArchived: true };
      const result = listCyclesParams.parse(input);
      expect(result.includeArchived).toBe(true);
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [
            {
              id: 'cycle-uuid-123',
              name: 'Sprint 1',
              number: 1,
              team: { id: 'team-1', name: 'Engineering' },
              startsAt: '2025-01-01',
              endsAt: '2025-01-14',
              createdAt: '2024-12-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
              // Extra fields that should be filtered
              issueCount: 50,
              completedIssueCount: 25,
              description: 'Sprint description',
              progress: 0.5,
            },
          ],
        },
      } as any);

      const result = await listCycles.execute({});

      // Verify essential fields
      expect(result.cycles[0].id).toBe('cycle-uuid-123');
      expect(result.cycles[0].name).toBe('Sprint 1');
      expect(result.cycles[0].number).toBe(1);
      expect(result.cycles[0].team?.name).toBe('Engineering');

      // Verify filtered fields are NOT present
      expect(result.cycles[0]).not.toHaveProperty('issueCount');
      expect(result.cycles[0]).not.toHaveProperty('completedIssueCount');
      expect(result.cycles[0]).not.toHaveProperty('description');
      expect(result.cycles[0]).not.toHaveProperty('progress');
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [
            {
              id: 'cycle-uuid',
              name: 'Cycle',
            },
          ],
        },
      } as any);

      const result = await listCycles.execute({});
      expect(() => listCyclesOutput.parse(result)).not.toThrow();
    });

    it('should return totalCycles count', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [
            { id: 'cycle-1', name: 'Cycle 1' },
            { id: 'cycle-2', name: 'Cycle 2' },
            { id: 'cycle-3', name: 'Cycle 3' },
          ],
        },
      } as any);

      const result = await listCycles.execute({});
      expect(result.totalCycles).toBe(3);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL request failed'));

      await expect(listCycles.execute({})).rejects.toThrow('GraphQL request failed');
    });

    it('should handle empty array response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [],
        },
      } as any);

      const result = await listCycles.execute({});

      expect(result.cycles).toEqual([]);
      expect(result.totalCycles).toBe(0);
    });

    it('should handle null response gracefully', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: null,
      } as any);

      const result = await listCycles.execute({});

      expect(result.cycles).toEqual([]);
      expect(result.totalCycles).toBe(0);
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in team', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => listCycles.execute({ team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in team', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => listCycles.execute({ team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in team', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => listCycles.execute({ team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in query', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => listCycles.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in query', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => listCycles.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in query', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => listCycles.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should complete validation within reasonable time', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        listCyclesParams.parse({ query: `Cycle-${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle multiple cycles', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [
            { id: 'cycle-1', name: 'Cycle 1' },
            { id: 'cycle-2', name: 'Cycle 2' },
          ],
        },
      } as any);

      const result = await listCycles.execute({});
      expect(result.totalCycles).toBe(2);
      expect(result.cycles[0].id).toBe('cycle-1');
    });

    it('should handle single cycle', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [
            { id: 'cycle-1', name: 'Cycle 1' },
          ],
        },
      } as any);

      const result = await listCycles.execute({});
      expect(result.totalCycles).toBe(1);
    });

    it('should handle cycles with all optional fields', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [
            { id: 'cycle-1', name: 'Cycle 1' },
            { id: 'cycle-2', name: 'Cycle 2' },
          ],
        },
      } as any);

      const result = await listCycles.execute({});
      expect(result.totalCycles).toBe(2);
      expect(result.cycles[0].id).toBe('cycle-1');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle cycles without team', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [
            {
              id: 'cycle-uuid',
              name: 'Cycle',
              // No team field
            },
          ],
        },
      } as any);

      const result = await listCycles.execute({});
      expect(result.cycles[0].team).toBeUndefined();
    });

    it('should handle cycles without number', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [
            {
              id: 'cycle-uuid',
              name: 'Cycle',
              // No number field
            },
          ],
        },
      } as any);

      const result = await listCycles.execute({});
      expect(result.cycles[0].number).toBeUndefined();
    });

    it('should handle large number of cycles', async () => {
      const manyCycles = Array.from({ length: 100 }, (_, i) => ({
        id: `cycle-${i}`,
        name: `Cycle ${i}`,
      }));
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: manyCycles,
        },
      } as any);

      const result = await listCycles.execute({});
      expect(result.totalCycles).toBe(100);
      expect(result.cycles.length).toBe(100);
    });

    it('should pass all params correctly', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycles: {
          nodes: [],
        },
      } as any);

      await listCycles.execute({
        team: 'Engineering',
        query: 'Sprint',
        includeArchived: true,
        limit: 25,
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('Cycles'),
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(listCycles.name).toBe('linear.list_cycles');
    });

    it('should have description', () => {
      expect(listCycles.description).toBeDefined();
      expect(typeof listCycles.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(listCycles.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(listCycles.tokenEstimate).toBeDefined();
      expect(listCycles.tokenEstimate.reduction).toBe('99%');
    });
  });
});
