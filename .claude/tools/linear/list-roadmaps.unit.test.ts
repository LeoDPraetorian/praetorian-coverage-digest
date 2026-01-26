/**
 * Unit Tests for list-roadmaps Wrapper
 *
 * These tests validate the list-roadmaps wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run list-roadmaps.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listRoadmaps, listRoadmapsParams, listRoadmapsOutput } from './list-roadmaps';

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

describe('listRoadmaps - Unit Tests', () => {
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
    it('should accept empty input (no parameters required)', () => {
      const input = {};
      const result = listRoadmapsParams.parse(input);
      expect(result.limit).toBeUndefined(); // Optional field
    });

    it('should accept valid limit', () => {
      const input = { limit: 10 };
      const result = listRoadmapsParams.parse(input);
      expect(result.limit).toBe(10);
    });

    it('should reject limit below 1', () => {
      expect(() => listRoadmapsParams.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit above 250', () => {
      expect(() => listRoadmapsParams.parse({ limit: 251 })).toThrow();
    });

    it('should accept limit at boundary (1)', () => {
      const input = { limit: 1 };
      const result = listRoadmapsParams.parse(input);
      expect(result.limit).toBe(1);
    });

    it('should accept limit at boundary (250)', () => {
      const input = { limit: 250 };
      const result = listRoadmapsParams.parse(input);
      expect(result.limit).toBe(250);
    });

    it('should handle undefined limit (uses GraphQL default)', () => {
      const input = {};
      const result = listRoadmapsParams.parse(input);
      expect(result.limit).toBeUndefined(); // GraphQL will use its default (50)
    });
  });

  // ==========================================================================
  // Happy Path Tests
  // ==========================================================================

  describe('Happy Path', () => {
    it('should list roadmaps with default limit', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Q2 2025',
              slugId: 'q2-2025',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
            },
            {
              id: 'roadmap-2',
              name: 'Q3 2025',
              slugId: 'q3-2025',
              description: 'Q3 initiatives',
              createdAt: '2025-01-03T00:00:00Z',
              updatedAt: '2025-01-04T00:00:00Z',
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({});

      expect(result.roadmaps).toHaveLength(2);
      expect(result.totalRoadmaps).toBe(2);
      expect(result.roadmaps[0].id).toBe('roadmap-1');
      expect(result.roadmaps[1].id).toBe('roadmap-2');
    });

    it('should list roadmaps with custom limit', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Test',
              slugId: 'test',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({ limit: 1 });

      expect(result.roadmaps).toHaveLength(1);
      expect(result.totalRoadmaps).toBe(1);
    });

    it('should pass limit to GraphQL query', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: { nodes: [] },
      });

      await listRoadmaps.execute({ limit: 25 });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        { first: 25 }
      );
    });

    it('should handle roadmaps with descriptions', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Q2 2025',
              slugId: 'q2-2025',
              description: 'Key initiatives',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({});

      expect(result.roadmaps[0].description).toBe('Key initiatives');
    });

    it('should handle roadmaps without descriptions', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Q2 2025',
              slugId: 'q2-2025',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({});

      expect(result.roadmaps[0].description).toBeUndefined();
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Test Roadmap',
              slugId: 'test-roadmap',
              description: 'Description',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
              // Extra fields that should be filtered
              projects: [],
              owner: { id: 'user-1', name: 'John' },
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({});

      // Verify essential fields
      expect(result.roadmaps[0].id).toBe('roadmap-1');
      expect(result.roadmaps[0].name).toBe('Test Roadmap');
      expect(result.roadmaps[0].slugId).toBe('test-roadmap');
      expect(result.roadmaps[0].description).toBe('Description');
      expect(result.roadmaps[0].createdAt).toBe('2025-01-01T00:00:00Z');
      expect(result.roadmaps[0].updatedAt).toBe('2025-01-02T00:00:00Z');

      // Verify filtered fields are NOT present
      expect(result.roadmaps[0]).not.toHaveProperty('projects');
      expect(result.roadmaps[0]).not.toHaveProperty('owner');
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: { nodes: [] },
      });

      const result = await listRoadmaps.execute({});
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });

    it('should convert null description to undefined', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Test',
              slugId: 'test',
              description: null,
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({});
      expect(result.roadmaps[0].description).toBeUndefined();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL error', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('GraphQL execution failed'));

      await expect(listRoadmaps.execute({})).rejects.toThrow('GraphQL execution failed');
    });

    it('should handle null roadmaps response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: null
      });

      const result = await listRoadmaps.execute({});
      expect(result.roadmaps).toEqual([]);
      expect(result.totalRoadmaps).toBe(0);
    });

    it('should handle undefined roadmaps response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({});

      const result = await listRoadmaps.execute({});
      expect(result.roadmaps).toEqual([]);
      expect(result.totalRoadmaps).toBe(0);
    });

    it('should throw on null response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(null);

      await expect(listRoadmaps.execute({})).rejects.toThrow();
    });

    it('should throw on rate limit error', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await expect(listRoadmaps.execute({})).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw on timeout', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(listRoadmaps.execute({})).rejects.toThrow('Request timeout');
    });

    it('should throw on server error (500)', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(listRoadmaps.execute({})).rejects.toThrow('Internal server error');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty roadmaps list', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: { nodes: [] },
      });

      const result = await listRoadmaps.execute({});

      expect(result.roadmaps).toEqual([]);
      expect(result.totalRoadmaps).toBe(0);
    });

    it('should handle large number of roadmaps', async () => {
      const roadmaps = Array.from({ length: 250 }, (_, i) => ({
        id: `roadmap-${i}`,
        name: `Roadmap ${i}`,
        slugId: `roadmap-${i}`,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
      }));

      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: { nodes: roadmaps },
      });

      const result = await listRoadmaps.execute({ limit: 250 });

      expect(result.roadmaps).toHaveLength(250);
      expect(result.totalRoadmaps).toBe(250);
    });

    it('should handle Unicode characters in roadmap names', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Q2 产品路线图 🚀',
              slugId: 'q2-roadmap',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({});
      expect(result.roadmaps[0].name).toBe('Q2 产品路线图 🚀');
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(5000);
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Test',
              slugId: 'test',
              description: longDescription,
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({});
      expect(result.roadmaps[0].description).toBe(longDescription);
    });

    it('should calculate totalRoadmaps correctly', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmaps: {
          nodes: [
            {
              id: 'roadmap-1',
              name: 'Roadmap 1',
              slugId: 'roadmap-1',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-02T00:00:00Z',
            },
            {
              id: 'roadmap-2',
              name: 'Roadmap 2',
              slugId: 'roadmap-2',
              createdAt: '2025-01-03T00:00:00Z',
              updatedAt: '2025-01-04T00:00:00Z',
            },
            {
              id: 'roadmap-3',
              name: 'Roadmap 3',
              slugId: 'roadmap-3',
              createdAt: '2025-01-05T00:00:00Z',
              updatedAt: '2025-01-06T00:00:00Z',
            },
          ],
        },
      });

      const result = await listRoadmaps.execute({});
      expect(result.totalRoadmaps).toBe(3);
      expect(result.roadmaps.length).toBe(3);
    });
  });

});
