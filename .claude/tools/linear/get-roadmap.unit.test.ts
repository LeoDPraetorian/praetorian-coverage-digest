/**
 * Unit Tests for get-roadmap Wrapper
 *
 * These tests validate the get-roadmap wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run get-roadmap.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRoadmap, getRoadmapParams, getRoadmapOutput } from './get-roadmap';
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

describe('getRoadmap - Unit Tests', () => {
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
      expect(() => getRoadmapParams.parse({})).toThrow();
    });

    it('should accept valid UUID', () => {
      const input = { id: 'roadmap-uuid-123' };
      const result = getRoadmapParams.parse(input);
      expect(result.id).toBe('roadmap-uuid-123');
    });

    it('should reject empty id', () => {
      expect(() => getRoadmapParams.parse({ id: '' })).toThrow();
    });

    it('should reject control characters in id', () => {
      expect(() => getRoadmapParams.parse({ id: 'test\x00id' })).toThrow();
    });

    it('should reject path traversal in id', () => {
      expect(() => getRoadmapParams.parse({ id: '../../../etc/passwd' })).toThrow();
    });

    it('should reject command injection in id', () => {
      expect(() => getRoadmapParams.parse({ id: 'id; rm -rf /' })).toThrow();
    });
  });

  // ==========================================================================
  // Happy Path Tests
  // ==========================================================================

  describe('Happy Path', () => {
    it('should get roadmap by id', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'roadmap-uuid-123',
          name: 'Q2 2025 Roadmap',
          slugId: 'q2-2025-roadmap',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const result = await getRoadmap.execute({ id: 'roadmap-uuid-123' });

      expect(result.id).toBe('roadmap-uuid-123');
      expect(result.name).toBe('Q2 2025 Roadmap');
      expect(result.slugId).toBe('q2-2025-roadmap');
      expect(result.createdAt).toBe('2025-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2025-01-02T00:00:00Z');
    });

    it('should get roadmap with description', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'roadmap-uuid-456',
          name: 'Q3 Engineering',
          slugId: 'q3-engineering',
          description: 'Key engineering priorities',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const result = await getRoadmap.execute({ id: 'roadmap-uuid-456' });

      expect(result.description).toBe('Key engineering priorities');
    });

    it('should pass id to GraphQL query', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'test-uuid',
          name: 'Test',
          slugId: 'test',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      await getRoadmap.execute({ id: 'test-uuid' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        { id: 'test-uuid' }
      );
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'roadmap-uuid-123',
          name: 'Test Roadmap',
          slugId: 'test-roadmap',
          description: 'Description',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
          // Extra fields that should be filtered
          projects: [],
          owner: { id: 'user-1', name: 'John' },
        },
      });

      const result = await getRoadmap.execute({ id: 'roadmap-uuid-123' });

      // Verify essential fields
      expect(result.id).toBe('roadmap-uuid-123');
      expect(result.name).toBe('Test Roadmap');
      expect(result.slugId).toBe('test-roadmap');
      expect(result.description).toBe('Description');
      expect(result.createdAt).toBe('2025-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2025-01-02T00:00:00Z');

      // Verify filtered fields are NOT present
      expect(result).not.toHaveProperty('projects');
      expect(result).not.toHaveProperty('owner');
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'roadmap-uuid',
          name: 'Roadmap',
          slugId: 'roadmap',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const result = await getRoadmap.execute({ id: 'roadmap-uuid' });
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

      await expect(getRoadmap.execute({ id: 'test-id' })).rejects.toThrow('GraphQL execution failed');
    });

    it('should throw when roadmap not found (null)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: null
      });

      await expect(getRoadmap.execute({ id: 'nonexistent-id' })).rejects.toThrow('Roadmap not found: nonexistent-id');
    });

    it('should throw on null response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(null);

      await expect(getRoadmap.execute({ id: 'test-id' })).rejects.toThrow();
    });

    it('should throw on undefined response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(undefined);

      await expect(getRoadmap.execute({ id: 'test-id' })).rejects.toThrow();
    });

    it('should throw on rate limit error', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await expect(getRoadmap.execute({ id: 'test-id' })).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw on timeout', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(getRoadmap.execute({ id: 'test-id' })).rejects.toThrow('Request timeout');
    });

    it('should throw on server error (500)', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(getRoadmap.execute({ id: 'test-id' })).rejects.toThrow('Internal server error');
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in id', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => getRoadmap.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in id', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => getRoadmap.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in id', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => getRoadmap.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block null bytes in id', async () => {
      await expect(getRoadmap.execute({ id: 'test\x00id' })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle null description', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'roadmap-uuid',
          name: 'Test',
          slugId: 'test',
          description: null,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const result = await getRoadmap.execute({ id: 'roadmap-uuid' });
      expect(result.description).toBeUndefined();
    });

    it('should handle undefined description', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'roadmap-uuid',
          name: 'Test',
          slugId: 'test',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const result = await getRoadmap.execute({ id: 'roadmap-uuid' });
      expect(result.description).toBeUndefined();
    });

    it('should handle UUID format id', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: uuid,
          name: 'Test',
          slugId: 'test',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const result = await getRoadmap.execute({ id: uuid });
      expect(result.id).toBe(uuid);
    });

    it('should handle slugId format id', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'roadmap-uuid',
          name: 'Test',
          slugId: 'test-roadmap',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const result = await getRoadmap.execute({ id: 'test-roadmap' });
      expect(result.slugId).toBe('test-roadmap');
    });

    it('should handle very long description', async () => {
      const longDescription = 'A'.repeat(5000);
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmap: {
          id: 'roadmap-uuid',
          name: 'Test',
          slugId: 'test',
          description: longDescription,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      });

      const result = await getRoadmap.execute({ id: 'roadmap-uuid' });
      expect(result.description).toBe(longDescription);
    });
  });

});
