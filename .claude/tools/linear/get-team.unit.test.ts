/**
 * Unit Tests for get-team Wrapper
 *
 * These tests validate the get-team wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run get-team.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTeam, getTeamParams, getTeamOutput } from './get-team';
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

describe('getTeam - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response for mocking (matches team query response)
  const sampleGraphQLResponse = {
    team: {
      id: 'team-uuid-123',
      key: 'ENG',
      name: 'Engineering',
      description: 'The engineering team',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
  };

  beforeEach(() => {
    vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
    vi.mocked(executeGraphQL).mockResolvedValue(sampleGraphQLResponse as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should require query field', () => {
      expect(() => getTeamParams.parse({})).toThrow();
    });

    it('should reject empty query', () => {
      expect(() => getTeamParams.parse({ query: '' })).toThrow();
    });

    it('should accept valid team name', () => {
      const input = { query: 'Engineering' };
      const result = getTeamParams.parse(input);
      expect(result.query).toBe('Engineering');
    });

    it('should accept team key', () => {
      const input = { query: 'ENG' };
      const result = getTeamParams.parse(input);
      expect(result.query).toBe('ENG');
    });

    it('should accept UUID format', () => {
      const input = { query: '550e8400-e29b-41d4-a716-446655440000' };
      const result = getTeamParams.parse(input);
      expect(result.query).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        team: {
          id: 'team-uuid-123',
          key: 'ENG',
          name: 'Engineering',
          description: 'The engineering team',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          // Extra fields that should be filtered
          private: false,
          issueCount: 150,
          memberCount: 25,
          workflow: { id: 'workflow-1' },
          states: [{ id: 'state-1' }],
        },
      } as any);

      const result = await getTeam.execute({ query: 'Engineering' });

      // Verify essential fields
      expect(result.id).toBe('team-uuid-123');
      expect(result.key).toBe('ENG');
      expect(result.name).toBe('Engineering');
      expect(result.description).toBe('The engineering team');

      // Verify filtered fields are NOT present
      expect(result).not.toHaveProperty('private');
      expect(result).not.toHaveProperty('issueCount');
      expect(result).not.toHaveProperty('memberCount');
      expect(result).not.toHaveProperty('workflow');
      expect(result).not.toHaveProperty('states');
    });

    it('should truncate description to 500 characters', async () => {
      const longDescription = 'x'.repeat(800);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        team: {
          id: 'team-uuid',
          name: 'Team',
          description: longDescription,
        },
      } as any);

      const result = await getTeam.execute({ query: 'Team' });

      expect(result.description?.length).toBe(500);
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        team: {
          id: 'team-uuid',
          name: 'Team',
        },
      } as any);

      const result = await getTeam.execute({ query: 'Team' });
      expect(() => getTeamOutput.parse(result)).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw when team not found (null team)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        team: null,
      } as any);

      await expect(
        getTeam.execute({ query: 'NonExistent' })
      ).rejects.toThrow('Team not found: NonExistent');
    });

    it('should throw when team not found (missing team field)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({} as any);

      await expect(
        getTeam.execute({ query: 'NonExistent' })
      ).rejects.toThrow('Team not found: NonExistent');
    });

    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(
        getTeam.execute({ query: 'Engineering' })
      ).rejects.toThrow('GraphQL connection failed');
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in query', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => getTeam.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block path traversal in query', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => getTeam.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in query', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => getTeam.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should complete validation within reasonable time', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        getTeamParams.parse({ query: `Team-${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard GraphQL team response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        team: {
          id: 'team-uuid-123',
          name: 'Engineering',
          key: 'ENG',
        },
      } as any);

      const result = await getTeam.execute({ query: 'Engineering' });
      expect(result.id).toBe('team-uuid-123');
      expect(result.name).toBe('Engineering');
    });

    it('should verify GraphQL query is called with correct ID parameter', async () => {
      await getTeam.execute({ query: 'Engineering' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('query Team'),
        expect.objectContaining({
          id: 'Engineering',
        })
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle team without key', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        team: {
          id: 'team-uuid',
          name: 'Team',
          // No key field
        },
      } as any);

      const result = await getTeam.execute({ query: 'Team' });
      expect(result.key).toBeUndefined();
    });

    it('should handle team without description', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        team: {
          id: 'team-uuid',
          name: 'Team',
          // No description field
        },
      } as any);

      const result = await getTeam.execute({ query: 'Team' });
      expect(result.description).toBeUndefined();
    });

    it('should handle team with spaces in name', () => {
      const input = { query: 'Engineering Team Alpha' };
      const result = getTeamParams.parse(input);
      expect(result.query).toBe('Engineering Team Alpha');
    });

    it('should handle team with special characters in key', () => {
      const input = { query: 'TEAM-A' };
      const result = getTeamParams.parse(input);
      expect(result.query).toBe('TEAM-A');
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(getTeam.name).toBe('linear.get_team');
    });

    it('should have description', () => {
      expect(getTeam.description).toBeDefined();
      expect(typeof getTeam.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(getTeam.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(getTeam.tokenEstimate).toBeDefined();
      expect(getTeam.tokenEstimate.reduction).toBe('99%');
    });
  });
});
