/**
 * Unit Tests for update-roadmap Wrapper
 *
 * These tests validate the update-roadmap wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run update-roadmap.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateRoadmap, updateRoadmapParams, updateRoadmapOutput } from './update-roadmap';
import {
  testSecurityScenarios,
  PathTraversalScenarios,
  CommandInjectionScenarios,
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

describe('updateRoadmap - Unit Tests', () => {
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
    it('should require id field', () => {
      expect(() => updateRoadmapParams.parse({ name: 'New Name' })).toThrow();
    });

    it('should accept valid minimal input (id only)', () => {
      const input = { id: 'roadmap-uuid-123', name: 'Updated Name' };
      const result = updateRoadmapParams.parse(input);
      expect(result.id).toBe('roadmap-uuid-123');
      expect(result.name).toBe('Updated Name');
    });

    it('should reject empty id', () => {
      expect(() => updateRoadmapParams.parse({ id: '', name: 'Test' })).toThrow();
    });

    it('should reject control characters in id', () => {
      expect(() => updateRoadmapParams.parse({ id: 'test\x00id', name: 'Test' })).toThrow();
    });

    it('should reject path traversal in id', () => {
      expect(() => updateRoadmapParams.parse({ id: '../../../etc/passwd', name: 'Test' })).toThrow();
    });

    it('should reject command injection in id', () => {
      expect(() => updateRoadmapParams.parse({ id: 'id; rm -rf /', name: 'Test' })).toThrow();
    });

    it('should accept optional name', () => {
      const input = { id: 'roadmap-uuid', name: 'New Name' };
      const result = updateRoadmapParams.parse(input);
      expect(result.name).toBe('New Name');
    });

    it('should accept optional description', () => {
      const input = { id: 'roadmap-uuid', description: 'New Description' };
      const result = updateRoadmapParams.parse(input);
      expect(result.description).toBe('New Description');
    });

    it('should reject control characters in name', () => {
      expect(() => updateRoadmapParams.parse({ id: 'roadmap-uuid', name: 'Test\x00Name' })).toThrow();
    });

    it('should reject control characters in description', () => {
      expect(() => updateRoadmapParams.parse({ id: 'roadmap-uuid', description: 'Test\x00Desc' })).toThrow();
    });
  });

  // ==========================================================================
  // Happy Path Tests
  // ==========================================================================

  describe('Happy Path', () => {
    it('should update roadmap name', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid-123',
            name: 'Updated Roadmap Name',
            slugId: 'updated-roadmap-name',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      const result = await updateRoadmap.execute({ id: 'roadmap-uuid-123', name: 'Updated Roadmap Name' });

      expect(result.id).toBe('roadmap-uuid-123');
      expect(result.name).toBe('Updated Roadmap Name');
      expect(result.slugId).toBe('updated-roadmap-name');
    });

    it('should update roadmap description', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid-456',
            name: 'Existing Name',
            slugId: 'existing-name',
            description: 'New description',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      const result = await updateRoadmap.execute({
        id: 'roadmap-uuid-456',
        description: 'New description',
      });

      expect(result.description).toBe('New description');
    });

    it('should update both name and description', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid-789',
            name: 'New Name',
            slugId: 'new-name',
            description: 'New description',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      const result = await updateRoadmap.execute({
        id: 'roadmap-uuid-789',
        name: 'New Name',
        description: 'New description',
      });

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New description');
    });

    it('should only pass provided fields to GraphQL', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Updated',
            slugId: 'updated',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      await updateRoadmap.execute({ id: 'roadmap-uuid', name: 'Updated' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          id: 'roadmap-uuid',
          input: { name: 'Updated' }
        })
      );
    });

    it('should not include undefined fields in mutation', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Name',
            slugId: 'name',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      await updateRoadmap.execute({ id: 'roadmap-uuid', name: 'Name' });

      const callArgs = mockExecuteGraphQL.mock.calls[0][2] as any;
      expect(callArgs.input).not.toHaveProperty('description');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid-123',
            name: 'Test Roadmap',
            slugId: 'test-roadmap',
            description: 'Description',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
            // Extra fields that should be filtered
            projects: [],
            owner: { id: 'user-1' },
          },
        },
      });

      const result = await updateRoadmap.execute({ id: 'roadmap-uuid-123', name: 'Test Roadmap' });

      // Verify essential fields
      expect(result.id).toBe('roadmap-uuid-123');
      expect(result.name).toBe('Test Roadmap');
      expect(result.slugId).toBe('test-roadmap');
      expect(result.description).toBe('Description');
      expect(result.createdAt).toBe('2025-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2025-01-03T00:00:00Z');

      // Verify filtered fields are NOT present
      expect(result).not.toHaveProperty('projects');
      expect(result).not.toHaveProperty('owner');
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Roadmap',
            slugId: 'roadmap',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      const result = await updateRoadmap.execute({ id: 'roadmap-uuid', name: 'Roadmap' });
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

      await expect(updateRoadmap.execute({ id: 'test-id', name: 'Test' })).rejects.toThrow('GraphQL execution failed');
    });

    it('should throw when roadmap not found (null)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: null
        }
      });

      await expect(updateRoadmap.execute({ id: 'nonexistent-id', name: 'Test' })).rejects.toThrow('Roadmap not found: nonexistent-id');
    });

    it('should throw on null response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(null);

      await expect(updateRoadmap.execute({ id: 'test-id', name: 'Test' })).rejects.toThrow();
    });

    it('should throw on undefined response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(undefined);

      await expect(updateRoadmap.execute({ id: 'test-id', name: 'Test' })).rejects.toThrow();
    });

    it('should throw on rate limit error', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await expect(updateRoadmap.execute({ id: 'test-id', name: 'Test' })).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw on timeout', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(updateRoadmap.execute({ id: 'test-id', name: 'Test' })).rejects.toThrow('Request timeout');
    });

    it('should throw on server error (500)', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(updateRoadmap.execute({ id: 'test-id', name: 'Test' })).rejects.toThrow('Internal server error');
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in id', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateRoadmap.execute({ id: input, name: 'Test' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in id', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateRoadmap.execute({ id: input, name: 'Test' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in id', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateRoadmap.execute({ id: input, name: 'Test' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in name', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateRoadmap.execute({ id: 'roadmap-uuid', name: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in description', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateRoadmap.execute({ id: 'roadmap-uuid', description: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block null bytes in id', async () => {
      await expect(updateRoadmap.execute({ id: 'test\x00id', name: 'Test' })).rejects.toThrow();
    });

    it('should block null bytes in name', async () => {
      await expect(updateRoadmap.execute({ id: 'roadmap-uuid', name: 'Test\x00Name' })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle undefined description in response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Test',
            slugId: 'test',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      const result = await updateRoadmap.execute({ id: 'roadmap-uuid', name: 'Test' });
      expect(result.description).toBeUndefined();
    });

    it('should handle very long name', async () => {
      const longName = 'A'.repeat(500);
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: longName,
            slugId: 'long-name',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      const result = await updateRoadmap.execute({ id: 'roadmap-uuid', name: longName });
      expect(result.name).toBe(longName);
    });

    it('should handle Unicode characters in name', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Q2 产品路线图 🚀',
            slugId: 'q2-roadmap',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-03T00:00:00Z',
          },
        },
      });

      const result = await updateRoadmap.execute({ id: 'roadmap-uuid', name: 'Q2 产品路线图 🚀' });
      expect(result.name).toBe('Q2 产品路线图 🚀');
    });

    it('should preserve updatedAt timestamp change', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapUpdate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Updated',
            slugId: 'updated',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-04T12:34:56Z',
          },
        },
      });

      const result = await updateRoadmap.execute({ id: 'roadmap-uuid', name: 'Updated' });
      expect(result.updatedAt).toBe('2025-01-04T12:34:56Z');
      expect(result.createdAt).toBe('2025-01-01T00:00:00Z');
    });
  });

});
