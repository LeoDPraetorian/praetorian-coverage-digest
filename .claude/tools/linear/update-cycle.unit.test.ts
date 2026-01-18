/**
 * Unit Tests for update-cycle Wrapper
 *
 * These tests validate the update-cycle wrapper using MOCKED MCP responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run update-cycle.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCycle, updateCycleParams, updateCycleOutput } from './update-cycle';
import {
  testSecurityScenarios,
  PathTraversalScenarios,
  CommandInjectionScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the client and GraphQL modules
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn(),
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn(),
}));

import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

describe('updateCycle - Unit Tests', () => {
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
    it('should require id field', () => {
      expect(() => updateCycleParams.parse({})).toThrow();
    });

    it('should accept valid id', () => {
      const input = { id: 'cycle-uuid-123' };
      const result = updateCycleParams.parse(input);
      expect(result.id).toBe('cycle-uuid-123');
    });

    it('should reject empty id', () => {
      expect(() => updateCycleParams.parse({ id: '' })).toThrow();
    });

    it('should accept optional name', () => {
      const input = { id: 'cycle-uuid', name: 'Sprint 2' };
      const result = updateCycleParams.parse(input);
      expect(result.name).toBe('Sprint 2');
    });

    it('should accept optional startsAt', () => {
      const input = { id: 'cycle-uuid', startsAt: '2025-02-01' };
      const result = updateCycleParams.parse(input);
      expect(result.startsAt).toBe('2025-02-01');
    });

    it('should accept optional endsAt', () => {
      const input = { id: 'cycle-uuid', endsAt: '2025-02-14' };
      const result = updateCycleParams.parse(input);
      expect(result.endsAt).toBe('2025-02-14');
    });

    it('should accept all fields together', () => {
      const input = {
        id: 'cycle-uuid',
        name: 'Sprint 2',
        startsAt: '2025-02-01',
        endsAt: '2025-02-14',
      };
      const result = updateCycleParams.parse(input);
      expect(result).toEqual(input);
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid-123',
            name: 'Sprint 2',
            number: 2,
            team: { id: 'team-1', name: 'Engineering' },
            startsAt: '2025-02-01',
            endsAt: '2025-02-14',
            updatedAt: '2025-02-01T00:00:00Z',
            // Extra fields that should be filtered
            issueCount: 50,
            completedIssueCount: 25,
            description: 'Sprint description',
            progress: 0.5,
            createdAt: '2024-12-01T00:00:00Z',
          },
        },
      } as any);

      const result = await updateCycle.execute({ id: 'cycle-uuid-123', name: 'Sprint 2' });

      // Verify essential fields
      expect(result.id).toBe('cycle-uuid-123');
      expect(result.name).toBe('Sprint 2');
      expect(result.number).toBe(2);
      expect(result.team?.name).toBe('Engineering');
      expect(result.startsAt).toBe('2025-02-01');
      expect(result.endsAt).toBe('2025-02-14');
      expect(result.updatedAt).toBe('2025-02-01T00:00:00Z');

      // Verify filtered fields are NOT present
      expect(result).not.toHaveProperty('issueCount');
      expect(result).not.toHaveProperty('completedIssueCount');
      expect(result).not.toHaveProperty('description');
      expect(result).not.toHaveProperty('progress');
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'Cycle',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      } as any);

      const result = await updateCycle.execute({ id: 'cycle-uuid', name: 'Cycle' });
      expect(() => updateCycleOutput.parse(result)).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(updateCycle.execute({ id: 'cycle-uuid' })).rejects.toThrow('GraphQL connection failed');
    });

    it('should throw on null cycle in response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: null,
        },
      } as any);

      await expect(updateCycle.execute({ id: 'cycle-uuid' })).rejects.toThrow('Cycle not found');
    });

    it('should throw on undefined cycle in response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: undefined,
        },
      } as any);

      await expect(updateCycle.execute({ id: 'cycle-uuid' })).rejects.toThrow('Cycle not found');
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in id', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateCycle.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in id', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateCycle.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in id', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateCycle.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in name', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateCycle.execute({ id: 'valid-id', name: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in startsAt', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateCycle.execute({ id: 'valid-id', startsAt: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in endsAt', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateCycle.execute({ id: 'valid-id', endsAt: input })
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
        updateCycleParams.parse({ id: `cycle-${i}`, name: `Sprint ${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // MCP Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard cycleUpdate mutation response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'Updated Cycle',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      } as any);

      const result = await updateCycle.execute({ id: 'cycle-uuid', name: 'Updated Cycle' });
      expect(result.id).toBe('cycle-uuid');
      expect(result.name).toBe('Updated Cycle');
    });

    it('should call executeGraphQL with correct mutation', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'Updated Cycle',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      } as any);

      await updateCycle.execute({ id: 'cycle-uuid', name: 'Updated Cycle' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('mutation UpdateCycle'),
        expect.objectContaining({
          id: 'cycle-uuid',
          input: expect.objectContaining({
            name: 'Updated Cycle',
          }),
        })
      );
    });

    it('should handle cycle with all optional fields', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-1',
            name: 'Cycle 1',
            number: 1,
            team: { id: 'team-1', name: 'Engineering' },
            startsAt: '2025-01-01',
            endsAt: '2025-01-14',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      } as any);

      const result = await updateCycle.execute({ id: 'cycle-1', name: 'Cycle 1' });
      expect(result.id).toBe('cycle-1');
      expect(result.number).toBe(1);
      expect(result.team?.name).toBe('Engineering');
    });

    it('should handle cycle without optional fields', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'Updated',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      } as any);

      const result = await updateCycle.execute({ id: 'cycle-uuid', name: 'Updated' });
      expect(result.id).toBe('cycle-uuid');
      expect(result.number).toBeUndefined();
      expect(result.team).toBeUndefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle cycle without team', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'Cycle',
            updatedAt: '2025-01-01T00:00:00Z',
            // No team field
          },
        },
      } as any);

      const result = await updateCycle.execute({ id: 'cycle-uuid' });
      expect(result.team).toBeUndefined();
    });

    it('should handle cycle without number', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'Cycle',
            updatedAt: '2025-01-01T00:00:00Z',
            // No number field
          },
        },
      } as any);

      const result = await updateCycle.execute({ id: 'cycle-uuid' });
      expect(result.number).toBeUndefined();
    });

    it('should handle cycle without dates', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'Cycle',
            updatedAt: '2025-01-01T00:00:00Z',
            // No startsAt or endsAt
          },
        },
      } as any);

      const result = await updateCycle.execute({ id: 'cycle-uuid' });
      expect(result.startsAt).toBeUndefined();
      expect(result.endsAt).toBeUndefined();
    });

    it('should pass all params to GraphQL mutation', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'New Name',
            startsAt: '2025-02-01',
            endsAt: '2025-02-14',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      } as any);

      await updateCycle.execute({
        id: 'cycle-uuid',
        name: 'New Name',
        startsAt: '2025-02-01',
        endsAt: '2025-02-14',
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('mutation'),
        expect.objectContaining({
          id: 'cycle-uuid',
          input: expect.objectContaining({
            name: 'New Name',
            startsAt: '2025-02-01',
            endsAt: '2025-02-14',
          }),
        })
      );
    });

    it('should only pass provided fields to GraphQL mutation', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        cycleUpdate: {
          success: true,
          cycle: {
            id: 'cycle-uuid',
            name: 'Cycle',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      } as any);

      await updateCycle.execute({ id: 'cycle-uuid' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('mutation'),
        expect.objectContaining({
          id: 'cycle-uuid',
          input: expect.any(Object),
        })
      );
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(updateCycle.name).toBe('linear.update_cycle');
    });

    it('should have description', () => {
      expect(updateCycle.description).toBeDefined();
      expect(typeof updateCycle.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(updateCycle.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(updateCycle.tokenEstimate).toBeDefined();
      expect(updateCycle.tokenEstimate.reduction).toBe('99%');
    });
  });
});
