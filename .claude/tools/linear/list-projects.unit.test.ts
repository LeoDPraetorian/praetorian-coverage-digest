/**
 * Unit Tests for list-projects Wrapper
 *
 * These tests validate the list-projects wrapper using MOCKED MCP responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run list-projects.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listProjects, listProjectsParams, listProjectsOutput } from './list-projects';
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

describe('listProjects - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response for mocking (matches LIST_PROJECTS_QUERY schema)
  // Note: state is a string in the query, not an object
  const sampleGraphQLResponse = {
    projects: {
      nodes: [
        {
          id: 'project-uuid-123',
          name: 'Auth Overhaul',
          description: 'Security improvements',
          content: null,
          state: 'In Progress',  // String, not object
          lead: { id: 'user-1', name: 'Nathan' },
          startDate: '2025-01-01',
          targetDate: '2025-06-30',
          createdAt: '2024-12-01T00:00:00Z',
          updatedAt: '2025-01-15T00:00:00Z',
        }
      ],
      pageInfo: {
        hasNextPage: false,
        endCursor: null
      }
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
      const result = listProjectsParams.parse(input);
      expect(result).toBeDefined();
    });

    it('should accept valid team filter', () => {
      const input = { team: 'Engineering' };
      const result = listProjectsParams.parse(input);
      expect(result.team).toBe('Engineering');
    });

    it('should accept valid state filter', () => {
      const input = { state: 'In Progress' };
      const result = listProjectsParams.parse(input);
      expect(result.state).toBe('In Progress');
    });

    it('should accept valid query', () => {
      const input = { query: 'Q2 2025' };
      const result = listProjectsParams.parse(input);
      expect(result.query).toBe('Q2 2025');
    });

    it('should accept limit within range', () => {
      const input = { limit: 100 };
      const result = listProjectsParams.parse(input);
      expect(result.limit).toBe(100);
    });

    it('should reject limit below minimum', () => {
      expect(() => listProjectsParams.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit above maximum', () => {
      expect(() => listProjectsParams.parse({ limit: 251 })).toThrow();
    });

    it('should accept valid orderBy values', () => {
      expect(listProjectsParams.parse({ orderBy: 'createdAt' }).orderBy).toBe('createdAt');
      expect(listProjectsParams.parse({ orderBy: 'updatedAt' }).orderBy).toBe('updatedAt');
    });

    it('should reject invalid orderBy values', () => {
      expect(() => listProjectsParams.parse({ orderBy: 'invalid' })).toThrow();
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid-123',
              name: 'Auth Overhaul',
              description: 'Security improvements',
              content: null,
              state: 'In Progress',
              lead: { id: 'user-1', name: 'Nathan' },
              startDate: '2025-01-01',
              targetDate: '2025-06-30',
              createdAt: '2024-12-01T00:00:00Z',
              updatedAt: '2025-01-15T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});

      // Verify essential fields
      expect(result.projects[0].id).toBe('project-uuid-123');
      expect(result.projects[0].name).toBe('Auth Overhaul');
      expect(result.projects[0].state).toBe('In Progress');

      // Verify filtered fields are NOT present (they were never in the GraphQL response)
      expect(result.projects[0]).not.toHaveProperty('issueCount');
      expect(result.projects[0]).not.toHaveProperty('completedIssueCount');
      expect(result.projects[0]).not.toHaveProperty('teams');
      expect(result.projects[0]).not.toHaveProperty('milestones');
    });

    it('should truncate description to 200 characters', async () => {
      const longDescription = 'x'.repeat(500);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: longDescription,
              content: null,
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});

      expect(result.projects[0].description?.length).toBe(200);
    });

    it('should truncate content to 500 characters by default', async () => {
      const longContent = 'y'.repeat(800);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: null,
              content: longContent,
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});

      expect(result.projects[0].content?.length).toBe(500);
    });

    it('should return full content when fullContent is true', async () => {
      const longContent = 'y'.repeat(800);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: null,
              content: longContent,
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({ fullContent: true });

      expect(result.projects[0].content?.length).toBe(800);
    });

    it('should include both description and content fields', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: 'Short summary',
              content: '## Full markdown content\n\nDetailed description',
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});

      expect(result.projects[0].description).toBe('Short summary');
      expect(result.projects[0].content).toBe('## Full markdown content\n\nDetailed description');
    });

    it('should handle projects with description but no content', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: 'Short summary',
              content: null,
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});

      expect(result.projects[0].description).toBe('Short summary');
      expect(result.projects[0].content).toBeUndefined();
    });

    it('should handle projects with content but no description', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: '',
              content: 'Full content here',
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});

      expect(result.projects[0].description).toBeUndefined();
      expect(result.projects[0].content).toBe('Full content here');
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: null,
              content: null,
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});
      expect(() => listProjectsOutput.parse(result)).not.toThrow();
    });

    it('should return totalProjects count', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            { id: 'project-1', name: 'Project 1', description: null, content: null, state: null, lead: null, startDate: null, targetDate: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
            { id: 'project-2', name: 'Project 2', description: null, content: null, state: null, lead: null, startDate: null, targetDate: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
            { id: 'project-3', name: 'Project 3', description: null, content: null, state: null, lead: null, startDate: null, targetDate: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          ]
        }
      } as any);

      const result = await listProjects.execute({});
      expect(result.totalProjects).toBe(3);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(listProjects.execute({})).rejects.toThrow('GraphQL connection failed');
    });

    it('should handle empty array response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: []
        }
      } as any);

      const result = await listProjects.execute({});

      expect(result.projects).toEqual([]);
      expect(result.totalProjects).toBe(0);
    });

    it('should throw on null response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce(null as any);

      await expect(listProjects.execute({})).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in team', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => listProjects.execute({ team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in team', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => listProjects.execute({ team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in team', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => listProjects.execute({ team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in state', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => listProjects.execute({ state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in state', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => listProjects.execute({ state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in state', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => listProjects.execute({ state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in query', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => listProjects.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in query', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => listProjects.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in query', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => listProjects.execute({ query: input })
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
        listProjectsParams.parse({ query: `Project-${i}` });
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
        projects: {
          nodes: [
            { id: 'project-1', name: 'Project 1', description: null, content: null, state: null, lead: null, startDate: null, targetDate: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
            { id: 'project-2', name: 'Project 2', description: null, content: null, state: null, lead: null, startDate: null, targetDate: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          ]
        }
      } as any);

      const result = await listProjects.execute({});
      expect(result.totalProjects).toBe(2);
      expect(result.projects[0].id).toBe('project-1');
    });

    it('should handle response with pageInfo', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            { id: 'project-1', name: 'Project 1', description: null, content: null, state: null, lead: null, startDate: null, targetDate: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          ],
          pageInfo: {
            hasNextPage: true,
            endCursor: 'cursor-123'
          }
        }
      } as any);

      const result = await listProjects.execute({});
      expect(result.totalProjects).toBe(1);
      expect(result.nextOffset).toBe('cursor-123');
    });

    it('should handle response without pageInfo', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            { id: 'project-1', name: 'Project 1', description: null, content: null, state: null, lead: null, startDate: null, targetDate: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          ]
        }
      } as any);

      const result = await listProjects.execute({});
      expect(result.totalProjects).toBe(1);
      expect(result.nextOffset).toBeUndefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle projects without state', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: null,
              content: null,
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});
      expect(result.projects[0].state).toBeUndefined();
    });

    it('should handle projects without lead', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: [
            {
              id: 'project-uuid',
              name: 'Project',
              description: null,
              content: null,
              state: null,
              lead: null,
              startDate: null,
              targetDate: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }
          ]
        }
      } as any);

      const result = await listProjects.execute({});
      expect(result.projects[0].lead).toBeUndefined();
    });

    it('should handle large number of projects', async () => {
      const manyProjects = Array.from({ length: 100 }, (_, i) => ({
        id: `project-${i}`,
        name: `Project ${i}`,
        description: null,
        content: null,
        state: null,
        lead: null,
        startDate: null,
        targetDate: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }));
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: manyProjects
        }
      } as any);

      const result = await listProjects.execute({});
      expect(result.totalProjects).toBe(100);
      expect(result.projects.length).toBe(100);
    });

    it('should pass all params to GraphQL', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projects: {
          nodes: []
        }
      } as any);

      await listProjects.execute({
        team: 'Engineering',
        state: 'In Progress',
        query: 'test',
        includeArchived: true,
        limit: 25,
        orderBy: 'createdAt',
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('query Projects'),
        expect.objectContaining({
          first: 25,
          includeArchived: true,
          orderBy: 'createdAt',
        })
      );
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(listProjects.name).toBe('linear.list_projects');
    });

    it('should have description', () => {
      expect(listProjects.description).toBeDefined();
      expect(typeof listProjects.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(listProjects.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(listProjects.tokenEstimate).toBeDefined();
      expect(listProjects.tokenEstimate.reduction).toBe('99%');
    });
  });
});
