/**
 * Unit Tests for get-project Wrapper
 *
 * These tests validate the get-project wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run get-project.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProject, getProjectParams, getProjectOutput } from './get-project';
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

describe('getProject - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response for mocking (matches project query response)
  const sampleGraphQLResponse = {
    project: {
      id: 'project-uuid-123',
      name: 'Auth Overhaul',
      description: 'Security improvements',
      content: 'Full project content',
      state: { id: 'state-1', name: 'In Progress', type: 'started' },
      lead: { id: 'user-1', name: 'Nathan', email: 'nathan@example.com' },
      startDate: '2025-01-01',
      targetDate: '2025-06-30',
      createdAt: '2024-12-01T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z',
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
      expect(() => getProjectParams.parse({})).toThrow();
    });

    it('should reject empty query', () => {
      expect(() => getProjectParams.parse({ query: '' })).toThrow();
    });

    it('should accept valid project name', () => {
      const input = { query: 'Q2 2025 Auth Overhaul' };
      const result = getProjectParams.parse(input);
      expect(result.query).toBe('Q2 2025 Auth Overhaul');
    });

    it('should accept UUID format', () => {
      const input = { query: '550e8400-e29b-41d4-a716-446655440000' };
      const result = getProjectParams.parse(input);
      expect(result.query).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid-123',
          name: 'Auth Overhaul',
          description: 'Security improvements',
          state: { id: 'state-1', name: 'In Progress', type: 'started' },
          lead: { id: 'user-1', name: 'Nathan', email: 'nathan@example.com' },
          startDate: '2025-01-01',
          targetDate: '2025-06-30',
          createdAt: '2024-12-01T00:00:00Z',
          updatedAt: '2025-01-15T00:00:00Z',
          // Extra fields that should be filtered
          issueCount: 50,
          completedIssueCount: 25,
          teams: [{ id: 'team-1' }],
          milestones: [],
        },
      } as any);

      const result = await getProject.execute({ query: 'Auth Overhaul' });

      // Verify essential fields
      expect(result.id).toBe('project-uuid-123');
      expect(result.name).toBe('Auth Overhaul');
      expect(result.state?.name).toBe('In Progress');
      expect(result.lead?.name).toBe('Nathan');

      // Verify filtered fields are NOT present
      expect(result).not.toHaveProperty('issueCount');
      expect(result).not.toHaveProperty('completedIssueCount');
      expect(result).not.toHaveProperty('teams');
      expect(result).not.toHaveProperty('milestones');
    });

    it('should truncate description to 500 characters', async () => {
      const longDescription = 'x'.repeat(800);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          description: longDescription,
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });

      expect(result.description?.length).toBe(500);
    });

    it('should truncate content to 1000 characters by default', async () => {
      const longContent = 'y'.repeat(1500);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          content: longContent,
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });

      expect(result.content?.length).toBe(1000);
    });

    it('should return full content when fullContent is true', async () => {
      const longContent = 'y'.repeat(1500);
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          content: longContent,
        },
      } as any);

      const result = await getProject.execute({ query: 'Project', fullContent: true });

      expect(result.content?.length).toBe(1500);
    });

    it('should include both description and content fields', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          description: 'Short summary',
          content: '## Full markdown content\n\nThis is the detailed description',
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });

      expect(result.description).toBe('Short summary');
      expect(result.content).toBe('## Full markdown content\n\nThis is the detailed description');
    });

    it('should handle projects with description but no content', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          description: 'Short summary',
          content: null,
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });

      expect(result.description).toBe('Short summary');
      expect(result.content).toBeUndefined();
    });

    it('should handle projects with content but no description', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          description: '',
          content: 'Full content here',
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });

      expect(result.description).toBeUndefined();
      expect(result.content).toBe('Full content here');
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });
      expect(() => getProjectOutput.parse(result)).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw when project not found (null project)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: null,
      } as any);

      await expect(
        getProject.execute({ query: 'NonExistent' })
      ).rejects.toThrow('Project not found: NonExistent');
    });

    it('should throw when project not found (missing project field)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({} as any);

      await expect(
        getProject.execute({ query: 'NonExistent' })
      ).rejects.toThrow('Project not found: NonExistent');
    });

    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(
        getProject.execute({ query: 'Project' })
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
        (input) => getProject.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block path traversal in query', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => getProject.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in query', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => getProject.execute({ query: input })
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
        getProjectParams.parse({ query: `Project-${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard GraphQL project response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid-123',
          name: 'Auth Overhaul',
        },
      } as any);

      const result = await getProject.execute({ query: 'Auth Overhaul' });
      expect(result.id).toBe('project-uuid-123');
      expect(result.name).toBe('Auth Overhaul');
    });

    it('should verify GraphQL query is called with correct ID parameter', async () => {
      await getProject.execute({ query: 'Auth Overhaul' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('query Project'),
        expect.objectContaining({
          id: 'Auth Overhaul',
        })
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle project without state', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          // No state field
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });
      expect(result.state).toBeUndefined();
    });

    it('should handle project without lead', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          // No lead field
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });
      expect(result.lead).toBeUndefined();
    });

    it('should handle project without dates', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        project: {
          id: 'project-uuid',
          name: 'Project',
          // No date fields
        },
      } as any);

      const result = await getProject.execute({ query: 'Project' });
      expect(result.startDate).toBeUndefined();
      expect(result.targetDate).toBeUndefined();
    });

    it('should handle project with spaces in name', () => {
      const input = { query: 'Q2 2025 Auth Overhaul Project' };
      const result = getProjectParams.parse(input);
      expect(result.query).toBe('Q2 2025 Auth Overhaul Project');
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(getProject.name).toBe('linear.get_project');
    });

    it('should have description', () => {
      expect(getProject.description).toBeDefined();
      expect(typeof getProject.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(getProject.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(getProject.tokenEstimate).toBeDefined();
      expect(getProject.tokenEstimate.reduction).toBe('99%');
    });
  });
});
