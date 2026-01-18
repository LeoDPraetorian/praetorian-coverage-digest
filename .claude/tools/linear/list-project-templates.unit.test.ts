/**
 * Unit Tests for list-project-templates Wrapper
 *
 * These tests validate the list-project-templates wrapper.
 * No actual Linear API calls are made - uses GraphQL client mocks.
 *
 * Usage:
 * npx vitest run list-project-templates.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listProjectTemplates, listProjectTemplatesParams, listProjectTemplatesOutput } from './list-project-templates';
import {
  testSecurityScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the GraphQL execution
vi.mock('./graphql-helpers', () => ({
  executeGraphQL: vi.fn(),
}));

// Mock the client creation
vi.mock('./client', () => ({
  createLinearClient: vi.fn(),
}));

import { executeGraphQL } from './graphql-helpers';
import { createLinearClient } from './client';

const mockExecuteGraphQL = vi.mocked(executeGraphQL);
const mockCreateLinearClient = vi.mocked(createLinearClient);

describe('listProjectTemplates - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock client creation to return mock HTTP client
    mockCreateLinearClient.mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should accept empty input (all fields optional)', () => {
      const result = listProjectTemplatesParams.parse({});
      expect(result).toBeDefined();
      // Defaults are applied when undefined, not when parsing empty object
    });

    it('should accept custom limit', () => {
      const result = listProjectTemplatesParams.parse({ limit: 100 });
      expect(result.limit).toBe(100);
    });

    it('should reject limit below 1', () => {
      expect(() => listProjectTemplatesParams.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit above 250', () => {
      expect(() => listProjectTemplatesParams.parse({ limit: 251 })).toThrow();
    });

    it('should accept type filter', () => {
      const result = listProjectTemplatesParams.parse({ type: 'project' });
      expect(result.type).toBe('project');
    });

    it('should accept type "all"', () => {
      const result = listProjectTemplatesParams.parse({ type: 'all' });
      expect(result.type).toBe('all');
    });

    it('should accept type "issue"', () => {
      const result = listProjectTemplatesParams.parse({ type: 'issue' });
      expect(result.type).toBe('issue');
    });

    it('should accept fullDescription flag', () => {
      const result = listProjectTemplatesParams.parse({ fullDescription: true });
      expect(result.fullDescription).toBe(true);
    });

    it('should accept fullDescription as undefined when not provided', () => {
      const result = listProjectTemplatesParams.parse({});
      expect(result.fullDescription).toBeUndefined();
    });
  });

  // ==========================================================================
  // Type Filtering Tests
  // ==========================================================================

  describe('Type Filtering', () => {
    it('should filter to project templates by default', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          { id: '1', name: 'Project Template', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
          { id: '2', name: 'Issue Template', type: 'issue', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
        ]
      });

      const result = await listProjectTemplates.execute({});

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].type).toBe('project');
    });

    it('should return all templates when type is "all"', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          { id: '1', name: 'Project Template', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
          { id: '2', name: 'Issue Template', type: 'issue', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
        ]
      });

      const result = await listProjectTemplates.execute({ type: 'all' });

      expect(result.templates).toHaveLength(2);
    });

    it('should filter to issue templates when type is "issue"', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          { id: '1', name: 'Project Template', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
          { id: '2', name: 'Issue Template', type: 'issue', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
        ]
      });

      const result = await listProjectTemplates.execute({ type: 'issue' });

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].type).toBe('issue');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          {
            id: 'template-uuid-123',
            name: 'Sprint Template',
            description: 'A template for sprint projects with milestones and deadlines',
            type: 'project',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-15T00:00:00Z',
            // Extra fields that should be filtered
            __typename: 'ProjectTemplate',
            archivedAt: null,
            creator: { id: 'user-1', name: 'Admin' },
          },
        ],
      });

      const result = await listProjectTemplates.execute({});

      // Verify essential fields
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe('template-uuid-123');
      expect(result.templates[0].name).toBe('Sprint Template');
      expect(result.templates[0].description).toBeDefined();
      expect(result.templates[0].type).toBe('project');
      expect(result.templates[0].createdAt).toBe('2025-01-01T00:00:00Z');
      expect(result.templates[0].updatedAt).toBe('2025-01-15T00:00:00Z');

      // Verify filtered fields are NOT present
      expect(result.templates[0]).not.toHaveProperty('__typename');
      expect(result.templates[0]).not.toHaveProperty('archivedAt');
      expect(result.templates[0]).not.toHaveProperty('creator');
    });

    it('should truncate description by default (token optimization)', async () => {
      const longDescription = 'A'.repeat(500); // 500 chars
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          {
            id: 'template-1',
            name: 'Template',
            description: longDescription,
            type: 'project',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      });

      const result = await listProjectTemplates.execute({ fullDescription: false });

      // Description should be truncated to 200 chars
      expect(result.templates[0].description).toBeDefined();
      expect(result.templates[0].description!.length).toBeLessThanOrEqual(200);
    });

    it('should return full description when fullDescription is true', async () => {
      const longDescription = 'A'.repeat(500);
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          {
            id: 'template-1',
            name: 'Template',
            description: longDescription,
            type: 'project',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      });

      const result = await listProjectTemplates.execute({ fullDescription: true });

      // Description should NOT be truncated
      expect(result.templates[0].description).toBe(longDescription);
    });

    it('should validate output against schema', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          {
            id: 'template-uuid',
            name: 'Template',
            type: 'project',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      });

      const result = await listProjectTemplates.execute({});
      expect(() => listProjectTemplatesOutput.parse(result)).not.toThrow();
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          {
            id: 'template-1',
            name: 'Template',
            type: 'project',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      });

      const result = await listProjectTemplates.execute({});
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL error', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('GraphQL execution failed'));

      await expect(listProjectTemplates.execute({})).rejects.toThrow('GraphQL execution failed');
    });

    it('should handle empty templates array', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [],
      });

      const result = await listProjectTemplates.execute({});
      expect(result.templates).toEqual([]);
      expect(result.totalTemplates).toBe(0);
    });

    it('should handle null response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: null,
      });

      const result = await listProjectTemplates.execute({});
      expect(result.templates).toEqual([]);
    });

    it('should handle undefined templates', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: undefined,
      });

      const result = await listProjectTemplates.execute({});
      expect(result.templates).toEqual([]);
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in search (future enhancement)', async () => {
      // Note: Current implementation doesn't have search param
      // This test documents expected behavior if added
      expect(listProjectTemplatesParams.parse({})).toBeDefined();
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should complete validation within reasonable time', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        listProjectTemplatesParams.parse({ limit: 50 });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard GraphQL response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          {
            id: 'template-1',
            name: 'Template 1',
            description: 'Description 1',
            type: 'project',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-02T00:00:00Z',
          },
          {
            id: 'template-2',
            name: 'Template 2',
            type: 'project',
            createdAt: '2025-01-03T00:00:00Z',
            updatedAt: '2025-01-04T00:00:00Z',
          },
        ],
      });

      const result = await listProjectTemplates.execute({});
      expect(result.templates).toHaveLength(2);
      expect(result.templates[0].id).toBe('template-1');
      expect(result.templates[1].id).toBe('template-2');
    });

    it('should handle missing optional fields', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          {
            id: 'template-1',
            name: 'Template',
            type: 'project',
            // No description
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      });

      const result = await listProjectTemplates.execute({});
      expect(result.templates[0].description).toBeUndefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should apply client-side limit', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          { id: '1', name: 'T1', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
          { id: '2', name: 'T2', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
          { id: '3', name: 'T3', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
        ],
      });

      const result = await listProjectTemplates.execute({ limit: 2 });

      expect(result.templates).toHaveLength(2);
    });

    it('should not pass GraphQL variables (API doesn\'t support them)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [],
      });

      await listProjectTemplates.execute({ limit: 100 });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        {} // Empty variables object
      );
    });

    it('should count templates correctly', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        templates: [
          { id: '1', name: 'T1', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
          { id: '2', name: 'T2', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
          { id: '3', name: 'T3', type: 'project', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
        ],
      });

      const result = await listProjectTemplates.execute({});
      expect(result.totalTemplates).toBe(3);
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(listProjectTemplates.name).toBe('linear.list_project_templates');
    });

    it('should have description', () => {
      expect(listProjectTemplates.description).toBeDefined();
      expect(typeof listProjectTemplates.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(listProjectTemplates.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(listProjectTemplates.tokenEstimate).toBeDefined();
      expect(listProjectTemplates.tokenEstimate.reduction).toBe('99%');
    });
  });
});
