/**
 * Unit Tests for list-teams Wrapper
 *
 * These tests validate the list-teams wrapper using MOCKED MCP responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run list-teams.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listTeams, listTeamsParams, listTeamsOutput } from './list-teams';
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

describe('listTeams - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response for mocking (matches LIST_TEAMS_QUERY response)
  const sampleGraphQLResponse = {
    teams: {
      nodes: [
        {
          id: 'team-uuid-123',
          key: 'ENG',
          name: 'Engineering',
          description: 'The engineering team',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          parent: null
        }
      ]
    }
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
    it('should accept empty input', () => {
      const input = {};
      const result = listTeamsParams.parse(input);
      expect(result).toBeDefined();
    });

    it('should accept valid query', () => {
      const input = { query: 'Engineering' };
      const result = listTeamsParams.parse(input);
      expect(result.query).toBe('Engineering');
    });

    it('should accept limit within range', () => {
      const input = { limit: 100 };
      const result = listTeamsParams.parse(input);
      expect(result.limit).toBe(100);
    });

    it('should reject limit below minimum', () => {
      expect(() => listTeamsParams.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit above maximum', () => {
      expect(() => listTeamsParams.parse({ limit: 251 })).toThrow();
    });

    it('should accept includeArchived flag', () => {
      const input = { includeArchived: true };
      const result = listTeamsParams.parse(input);
      expect(result.includeArchived).toBe(true);
    });

    it('should accept valid orderBy values', () => {
      expect(listTeamsParams.parse({ orderBy: 'createdAt' }).orderBy).toBe('createdAt');
      expect(listTeamsParams.parse({ orderBy: 'updatedAt' }).orderBy).toBe('updatedAt');
    });

    it('should reject invalid orderBy values', () => {
      expect(() => listTeamsParams.parse({ orderBy: 'invalid' })).toThrow();
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            {
              id: 'team-uuid-123',
              key: 'ENG',
              name: 'Engineering',
              description: 'The engineering team',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z',
              parent: null
            }
          ]
        }
      } as any);

      const result = await listTeams.execute({});

      // Verify essential fields
      expect(result.teams[0].id).toBe('team-uuid-123');
      expect(result.teams[0].key).toBe('ENG');
      expect(result.teams[0].name).toBe('Engineering');

      // Verify filtered fields are NOT present (they were never in the GraphQL response)
      expect(result.teams[0]).not.toHaveProperty('private');
      expect(result.teams[0]).not.toHaveProperty('issueCount');
      expect(result.teams[0]).not.toHaveProperty('memberCount');
      expect(result.teams[0]).not.toHaveProperty('states');
    });

    it('should truncate description to 200 characters', async () => {
      const longDescription = 'x'.repeat(500);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            {
              id: 'team-uuid',
              key: null,
              name: 'Team',
              description: longDescription,
              createdAt: undefined,
              updatedAt: undefined,
              parent: null
            }
          ]
        }
      } as any);

      const result = await listTeams.execute({});

      expect(result.teams[0].description?.length).toBe(200);
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            {
              id: 'team-uuid',
              key: null,
              name: 'Team',
              description: null,
              createdAt: undefined,
              updatedAt: undefined,
              parent: null
            }
          ]
        }
      } as any);

      const result = await listTeams.execute({});
      expect(() => listTeamsOutput.parse(result)).not.toThrow();
    });

    it('should return totalTeams count', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            { id: 'team-1', key: null, name: 'Team 1', description: null, createdAt: undefined, updatedAt: undefined, parent: null },
            { id: 'team-2', key: null, name: 'Team 2', description: null, createdAt: undefined, updatedAt: undefined, parent: null },
            { id: 'team-3', key: null, name: 'Team 3', description: null, createdAt: undefined, updatedAt: undefined, parent: null },
          ]
        }
      } as any);

      const result = await listTeams.execute({});
      expect(result.totalTeams).toBe(3);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(listTeams.execute({})).rejects.toThrow('GraphQL connection failed');
    });

    it('should handle empty array response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: []
        }
      } as any);

      const result = await listTeams.execute({});

      expect(result.teams).toEqual([]);
      expect(result.totalTeams).toBe(0);
    });

    it('should throw on null response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce(null as any);

      await expect(listTeams.execute({})).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in query', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => listTeams.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block path traversal in query', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => listTeams.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in query', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => listTeams.execute({ query: input })
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
        listTeamsParams.parse({ query: `Team-${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard GraphQL response with nodes', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            { id: 'team-1', key: null, name: 'Team 1', description: null, createdAt: undefined, updatedAt: undefined, parent: null },
            { id: 'team-2', key: null, name: 'Team 2', description: null, createdAt: undefined, updatedAt: undefined, parent: null },
          ]
        }
      } as any);

      const result = await listTeams.execute({});
      expect(result.totalTeams).toBe(2);
      expect(result.teams[0].id).toBe('team-1');
    });

    it('should handle single team response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            { id: 'team-1', key: null, name: 'Team 1', description: null, createdAt: undefined, updatedAt: undefined, parent: null },
          ]
        }
      } as any);

      const result = await listTeams.execute({});
      expect(result.totalTeams).toBe(1);
    });

    it('should handle response with all fields populated', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            { id: 'team-1', key: 'ENG', name: 'Engineering', description: 'Engineering team', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z', parent: { id: 'parent-1', name: 'Parent Team' } },
            { id: 'team-2', key: 'PROD', name: 'Product', description: 'Product team', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z', parent: null },
          ]
        }
      } as any);

      const result = await listTeams.execute({});
      expect(result.totalTeams).toBe(2);
      expect(result.teams[0].id).toBe('team-1');
      expect(result.teams[0].parent).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle teams without key', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            {
              id: 'team-uuid',
              key: null,
              name: 'Team',
              description: null,
              createdAt: undefined,
              updatedAt: undefined,
              parent: null
            }
          ]
        }
      } as any);

      const result = await listTeams.execute({});
      expect(result.teams[0].key).toBeUndefined();
    });

    it('should handle teams without description', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: [
            {
              id: 'team-uuid',
              key: null,
              name: 'Team',
              description: null,
              createdAt: undefined,
              updatedAt: undefined,
              parent: null
            }
          ]
        }
      } as any);

      const result = await listTeams.execute({});
      expect(result.teams[0].description).toBeUndefined();
    });

    it('should handle query with spaces', () => {
      const input = { query: 'Engineering Team Alpha' };
      const result = listTeamsParams.parse(input);
      expect(result.query).toBe('Engineering Team Alpha');
    });

    it('should handle large number of teams', async () => {
      const manyTeams = Array.from({ length: 100 }, (_, i) => ({
        id: `team-${i}`,
        key: null,
        name: `Team ${i}`,
        description: null,
        createdAt: undefined,
        updatedAt: undefined,
        parent: null
      }));
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: manyTeams
        }
      } as any);

      const result = await listTeams.execute({});
      expect(result.totalTeams).toBe(100);
      expect(result.teams.length).toBe(100);
    });

    it('should pass all params to GraphQL', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        teams: {
          nodes: []
        }
      } as any);

      await listTeams.execute({
        query: 'test',
        includeArchived: true,
        limit: 25,
        orderBy: 'createdAt',
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('query ListTeams'),
        expect.objectContaining({
          first: 25,
          orderBy: 'createdAt',
          filter: expect.objectContaining({
            name: { contains: 'test' },
            includeArchived: true
          })
        })
      );
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(listTeams.name).toBe('linear.list_teams');
    });

    it('should have description', () => {
      expect(listTeams.description).toBeDefined();
      expect(typeof listTeams.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(listTeams.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(listTeams.tokenEstimate).toBeDefined();
      expect(listTeams.tokenEstimate.reduction).toBe('99%');
    });
  });
});
