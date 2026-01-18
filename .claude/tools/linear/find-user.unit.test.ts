/**
 * Unit Tests for find-user Wrapper
 *
 * These tests validate the find-user wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run find-user.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findUser, findUserParams, findUserOutput } from './find-user';
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

describe('findUser - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response for mocking (matches users query response)
  const sampleGraphQLResponse = {
    users: {
      nodes: [
        {
          id: 'user-uuid-123',
          name: 'John Doe',
          email: 'john@example.com',
          displayName: 'Johnny',
          avatarUrl: 'https://example.com/avatar.png',
          active: true,
          admin: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
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
      expect(() => findUserParams.parse({})).toThrow();
    });

    it('should accept valid query', () => {
      const input = { query: 'john@example.com' };
      const result = findUserParams.parse(input);
      expect(result.query).toBe('john@example.com');
    });

    it('should reject empty query', () => {
      expect(() => findUserParams.parse({ query: '' })).toThrow();
    });

    it('should accept name query', () => {
      const input = { query: 'John Doe' };
      const result = findUserParams.parse(input);
      expect(result.query).toBe('John Doe');
    });

    it('should accept UUID query', () => {
      const input = { query: 'user-uuid-12345' };
      const result = findUserParams.parse(input);
      expect(result.query).toBe('user-uuid-12345');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            {
              id: 'user-uuid-123',
              name: 'John Doe',
              email: 'john@example.com',
              displayName: 'Johnny',
              avatarUrl: 'https://example.com/avatar.png',
              active: true,
              admin: false,
              createdAt: '2024-01-01T00:00:00Z',
              // Extra fields that should be filtered
              lastSeen: '2025-01-01T00:00:00Z',
              timezone: 'America/New_York',
              guest: false,
              organization: { id: 'org-1', name: 'Org' },
            },
          ],
        },
      } as any);

      const result = await findUser.execute({ query: 'john@example.com' });

      // Verify essential fields
      expect(result.id).toBe('user-uuid-123');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.displayName).toBe('Johnny');
      expect(result.avatarUrl).toBe('https://example.com/avatar.png');
      expect(result.active).toBe(true);
      expect(result.admin).toBe(false);

      // Verify filtered fields are NOT present
      expect(result).not.toHaveProperty('lastSeen');
      expect(result).not.toHaveProperty('timezone');
      expect(result).not.toHaveProperty('guest');
      expect(result).not.toHaveProperty('organization');
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            {
              id: 'user-uuid',
              name: 'User',
              email: 'user@example.com',
            },
          ],
        },
      } as any);

      const result = await findUser.execute({ query: 'user@example.com' });
      expect(() => findUserOutput.parse(result)).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(findUser.execute({ query: 'john@example.com' })).rejects.toThrow('GraphQL connection failed');
    });

    it('should throw when user not found (empty nodes array)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [],
        },
      } as any);

      await expect(findUser.execute({ query: 'nonexistent@example.com' })).rejects.toThrow('User not found');
    });

    it('should throw when user not found (null users)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: null,
      } as any);

      await expect(findUser.execute({ query: 'nonexistent@example.com' })).rejects.toThrow('User not found');
    });

    it('should throw when user not found (missing users field)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({} as any);

      await expect(findUser.execute({ query: 'nonexistent@example.com' })).rejects.toThrow('User not found');
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in query', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => findUser.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in query', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => findUser.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in query', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => findUser.execute({ query: input })
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
        findUserParams.parse({ query: `user${i}@example.com` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard GraphQL users response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
          ],
        },
      } as any);

      const result = await findUser.execute({ query: 'user1@example.com' });
      expect(result.id).toBe('user-1');
    });

    it('should take first match from multiple results', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
            { id: 'user-2', name: 'John Smith', email: 'johnsmith@example.com' },
          ],
        },
      } as any);

      const result = await findUser.execute({ query: 'john' });
      expect(result.id).toBe('user-1');
    });

    it('should verify GraphQL query is called with correct filter', async () => {
      await findUser.execute({ query: 'john@example.com' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('query Users'),
        expect.objectContaining({
          filter: expect.objectContaining({
            or: expect.arrayContaining([
              expect.objectContaining({ email: expect.objectContaining({ containsIgnoreCase: 'john@example.com' }) }),
              expect.objectContaining({ name: expect.objectContaining({ containsIgnoreCase: 'john@example.com' }) }),
            ]),
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle user without displayName', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            {
              id: 'user-uuid',
              name: 'User',
              email: 'user@example.com',
              // No displayName
            },
          ],
        },
      } as any);

      const result = await findUser.execute({ query: 'user@example.com' });
      expect(result.displayName).toBeUndefined();
    });

    it('should handle user without avatarUrl', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            {
              id: 'user-uuid',
              name: 'User',
              email: 'user@example.com',
              // No avatarUrl
            },
          ],
        },
      } as any);

      const result = await findUser.execute({ query: 'user@example.com' });
      expect(result.avatarUrl).toBeUndefined();
    });

    it('should handle user without active flag', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            {
              id: 'user-uuid',
              name: 'User',
              email: 'user@example.com',
              // No active flag
            },
          ],
        },
      } as any);

      const result = await findUser.execute({ query: 'user@example.com' });
      expect(result.active).toBeUndefined();
    });

    it('should use first: 1 in GraphQL query to limit results', async () => {
      await findUser.execute({ query: 'user@example.com' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('first: 1'),
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(findUser.name).toBe('linear.find_user');
    });

    it('should have description', () => {
      expect(findUser.description).toBeDefined();
      expect(typeof findUser.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(findUser.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(findUser.tokenEstimate).toBeDefined();
      expect(findUser.tokenEstimate.reduction).toBe('99%');
    });
  });
});
