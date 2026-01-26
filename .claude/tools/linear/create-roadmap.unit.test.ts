/**
 * Unit Tests for create-roadmap Wrapper
 *
 * These tests validate the create-roadmap wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run create-roadmap.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoadmap, createRoadmapParams, createRoadmapOutput } from './create-roadmap';
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

describe('createRoadmap - Unit Tests', () => {
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
    it('should require name field', () => {
      expect(() => createRoadmapParams.parse({})).toThrow();
    });

    it('should accept valid minimal input', () => {
      const input = { name: 'Q2 2025 Roadmap' };
      const result = createRoadmapParams.parse(input);
      expect(result.name).toBe('Q2 2025 Roadmap');
    });

    it('should reject empty name', () => {
      expect(() => createRoadmapParams.parse({ name: '' })).toThrow();
    });

    it('should accept optional description', () => {
      const input = { name: 'Q2 Roadmap', description: 'Key initiatives for Q2' };
      const result = createRoadmapParams.parse(input);
      expect(result.description).toBe('Key initiatives for Q2');
    });

    it('should accept multiline description (Markdown)', () => {
      const description = 'Line 1\nLine 2\nLine 3';
      const input = { name: 'Roadmap', description };
      const result = createRoadmapParams.parse(input);
      expect(result.description).toBe(description);
    });

    it('should reject control characters in name (except whitespace)', () => {
      expect(() => createRoadmapParams.parse({ name: 'Test\x00Name' })).toThrow();
    });

    it('should accept whitespace characters in name', () => {
      const input = { name: 'Q2 2025 Product Roadmap' };
      const result = createRoadmapParams.parse(input);
      expect(result.name).toBe('Q2 2025 Product Roadmap');
    });
  });

  // ==========================================================================
  // Happy Path Tests
  // ==========================================================================

  describe('Happy Path', () => {
    it('should create roadmap with minimal input', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid-123',
            name: 'Q2 2025 Roadmap',
            slugId: 'q2-2025-roadmap',
          },
        },
      });

      const result = await createRoadmap.execute({ name: 'Q2 2025 Roadmap' });

      expect(result.success).toBe(true);
      expect(result.roadmap.id).toBe('roadmap-uuid-123');
      expect(result.roadmap.name).toBe('Q2 2025 Roadmap');
      expect(result.roadmap.slugId).toBe('q2-2025-roadmap');
    });

    it('should create roadmap with description', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid-456',
            name: 'Q3 Engineering',
            slugId: 'q3-engineering',
            description: 'Key engineering priorities',
          },
        },
      });

      const result = await createRoadmap.execute({
        name: 'Q3 Engineering',
        description: 'Key engineering priorities',
      });

      expect(result.success).toBe(true);
      expect(result.roadmap.description).toBe('Key engineering priorities');
    });

    it('should pass only provided fields to GraphQL', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Minimal',
            slugId: 'minimal',
          },
        },
      });

      await createRoadmap.execute({ name: 'Minimal' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          input: { name: 'Minimal' }
        })
      );
    });

    it('should include description when provided', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'With Description',
            slugId: 'with-description',
            description: 'Test description',
          },
        },
      });

      await createRoadmap.execute({
        name: 'With Description',
        description: 'Test description',
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          input: {
            name: 'With Description',
            description: 'Test description',
          }
        })
      );
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid-123',
            name: 'Test Roadmap',
            slugId: 'test-roadmap',
            description: 'Description',
            // Extra fields that should be filtered
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-02T00:00:00Z',
            projects: [],
          },
        },
      });

      const result = await createRoadmap.execute({ name: 'Test Roadmap' });

      // Verify essential fields
      expect(result.success).toBe(true);
      expect(result.roadmap.id).toBe('roadmap-uuid-123');
      expect(result.roadmap.name).toBe('Test Roadmap');
      expect(result.roadmap.slugId).toBe('test-roadmap');
      expect(result.roadmap.description).toBe('Description');

      // Verify filtered fields are NOT present
      expect(result.roadmap).not.toHaveProperty('createdAt');
      expect(result.roadmap).not.toHaveProperty('updatedAt');
      expect(result.roadmap).not.toHaveProperty('projects');
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Roadmap',
            slugId: 'roadmap',
          },
        },
      });

      const result = await createRoadmap.execute({ name: 'Roadmap' });
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

      await expect(createRoadmap.execute({ name: 'Test' })).rejects.toThrow('GraphQL execution failed');
    });

    it('should throw when creation fails (success: false)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: { success: false }
      });

      await expect(createRoadmap.execute({ name: 'Test' })).rejects.toThrow('Failed to create roadmap');
    });

    it('should throw when roadmap is null', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: null
        }
      });

      await expect(createRoadmap.execute({ name: 'Test' })).rejects.toThrow('Failed to create roadmap');
    });

    it('should throw on null response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(null);

      await expect(createRoadmap.execute({ name: 'Test' })).rejects.toThrow();
    });

    it('should throw on undefined response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(undefined);

      await expect(createRoadmap.execute({ name: 'Test' })).rejects.toThrow();
    });

    it('should throw on rate limit error', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await expect(createRoadmap.execute({ name: 'Test' })).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw on timeout', async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(createRoadmap.execute({ name: 'Test' })).rejects.toThrow('Request timeout');
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in name', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createRoadmap.execute({ name: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in description (except newlines)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Test',
            slugId: 'test',
            description: 'Line 1\nLine 2',
          },
        },
      });

      // Newlines are allowed in description (Markdown)
      const result = await createRoadmap.execute({
        name: 'Test',
        description: 'Line 1\nLine 2'
      });

      expect(result.roadmap.description).toBe('Line 1\nLine 2');
    });

    it('should block null bytes in name', async () => {
      await expect(createRoadmap.execute({ name: 'Test\x00Name' })).rejects.toThrow();
    });

    it('should block null bytes in description', async () => {
      await expect(createRoadmap.execute({
        name: 'Test',
        description: 'Desc\x00ription'
      })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle Unicode characters in name', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Q2 2025 产品路线图 🚀',
            slugId: 'q2-2025-roadmap',
          },
        },
      });

      const result = await createRoadmap.execute({ name: 'Q2 2025 产品路线图 🚀' });
      expect(result.roadmap.name).toBe('Q2 2025 产品路线图 🚀');
    });

    it('should handle very long name', async () => {
      const longName = 'A'.repeat(500);
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: longName,
            slugId: 'long-roadmap',
          },
        },
      });

      const result = await createRoadmap.execute({ name: longName });
      expect(result.roadmap.name).toBe(longName);
    });

    it('should handle empty optional description', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Test',
            slugId: 'test',
          },
        },
      });

      const result = await createRoadmap.execute({ name: 'Test' });
      expect(result.roadmap.description).toBeUndefined();
    });

    it('should handle description with Markdown formatting', async () => {
      const markdown = '# Heading\n\n**Bold** and *italic*\n\n- Item 1\n- Item 2';
      mockExecuteGraphQL.mockResolvedValueOnce({
        roadmapCreate: {
          success: true,
          roadmap: {
            id: 'roadmap-uuid',
            name: 'Test',
            slugId: 'test',
            description: markdown,
          },
        },
      });

      const result = await createRoadmap.execute({ name: 'Test', description: markdown });
      expect(result.roadmap.description).toBe(markdown);
    });
  });

});
