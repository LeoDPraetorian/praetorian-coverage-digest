/**
 * Unit Tests for list-users Wrapper
 *
 * These tests validate the list-users wrapper using MOCKED MCP responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run list-users.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listUsers, listUsersParams, listUsersOutput } from './list-users';
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

describe('listUsers - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response for mocking (matches users query response)
  const sampleGraphQLResponse = {
    users: {
      nodes: [
        {
          id: 'user-uuid-123',
          name: 'Nathan Sportsman',
          email: 'nathan@example.com',
          active: true,
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
    it('should accept empty input', () => {
      const input = {};
      const result = listUsersParams.parse(input);
      expect(result).toBeDefined();
    });

    it('should accept valid query', () => {
      const input = { query: 'nathan' };
      const result = listUsersParams.parse(input);
      expect(result.query).toBe('nathan');
    });

    it('should accept email-like query', () => {
      const input = { query: 'user@example.com' };
      const result = listUsersParams.parse(input);
      expect(result.query).toBe('user@example.com');
    });

    it('should accept query with spaces', () => {
      const input = { query: 'Nathan Sportsman' };
      const result = listUsersParams.parse(input);
      expect(result.query).toBe('Nathan Sportsman');
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
              name: 'Nathan Sportsman',
              email: 'nathan@example.com',
              active: true,
              createdAt: '2024-01-01T00:00:00Z',
              // Extra fields that should be filtered
              displayName: 'Nathan',
              avatarUrl: 'https://...',
              admin: false,
              organization: { id: 'org-1' },
            },
          ],
        },
      } as any);

      const result = await listUsers.execute({});

      // Verify essential fields
      expect(result.users[0].id).toBe('user-uuid-123');
      expect(result.users[0].name).toBe('Nathan Sportsman');
      expect(result.users[0].email).toBe('nathan@example.com');

      // Verify filtered fields are NOT present
      expect(result.users[0]).not.toHaveProperty('displayName');
      expect(result.users[0]).not.toHaveProperty('avatarUrl');
      expect(result.users[0]).not.toHaveProperty('admin');
      expect(result.users[0]).not.toHaveProperty('organization');
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            {
              id: 'user-uuid',
              name: 'User',
              email: 'user@test.com',
            },
          ],
        },
      } as any);

      const result = await listUsers.execute({});
      expect(() => listUsersOutput.parse(result)).not.toThrow();
    });

    it('should return totalUsers count', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
            { id: 'user-2', name: 'User 2', email: 'user2@test.com' },
            { id: 'user-3', name: 'User 3', email: 'user3@test.com' },
          ],
        },
      } as any);

      const result = await listUsers.execute({});
      expect(result.totalUsers).toBe(3);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(listUsers.execute({})).rejects.toThrow('GraphQL connection failed');
    });

    it('should handle empty array response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [],
        },
      } as any);

      const result = await listUsers.execute({});

      expect(result.users).toEqual([]);
      expect(result.totalUsers).toBe(0);
    });

    it('should handle null users response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: null,
      } as any);

      const result = await listUsers.execute({});

      expect(result.users).toEqual([]);
      expect(result.totalUsers).toBe(0);
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in query', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => listUsers.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block path traversal in query', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => listUsers.execute({ query: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in query', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => listUsers.execute({ query: input })
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
        listUsersParams.parse({ query: `User-${i}` });
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
            { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
            { id: 'user-2', name: 'User 2', email: 'user2@test.com' },
          ],
        },
      } as any);

      const result = await listUsers.execute({});
      expect(result.totalUsers).toBe(2);
      expect(result.users[0].id).toBe('user-1');
    });

    it('should filter users by query (client-side)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            { id: 'user-1', name: 'Nathan Sportsman', email: 'nathan@test.com' },
            { id: 'user-2', name: 'John Doe', email: 'john@test.com' },
          ],
        },
      } as any);

      const result = await listUsers.execute({ query: 'nathan' });
      expect(result.totalUsers).toBe(1);
      expect(result.users[0].id).toBe('user-1');
    });

    it('should verify GraphQL query is called correctly', async () => {
      await listUsers.execute({});

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('query Users'),
        {}
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle users without active flag', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            {
              id: 'user-uuid',
              name: 'User',
              email: 'user@test.com',
              // No active field
            },
          ],
        },
      } as any);

      const result = await listUsers.execute({});
      expect(result.users[0].active).toBeUndefined();
    });

    it('should handle users without createdAt', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            {
              id: 'user-uuid',
              name: 'User',
              email: 'user@test.com',
              // No createdAt field
            },
          ],
        },
      } as any);

      const result = await listUsers.execute({});
      expect(result.users[0].createdAt).toBeUndefined();
    });

    it('should handle large number of users', async () => {
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@test.com`,
      }));
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: manyUsers,
        },
      } as any);

      const result = await listUsers.execute({});
      expect(result.totalUsers).toBe(100);
      expect(result.users.length).toBe(100);
    });

    it('should filter by email query', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        users: {
          nodes: [
            { id: 'user-1', name: 'Nathan', email: 'nathan@test.com' },
            { id: 'user-2', name: 'John', email: 'john@test.com' },
          ],
        },
      } as any);

      const result = await listUsers.execute({ query: 'nathan@test.com' });

      expect(result.totalUsers).toBe(1);
      expect(result.users[0].email).toBe('nathan@test.com');
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(listUsers.name).toBe('linear.list_users');
    });

    it('should have description', () => {
      expect(listUsers.description).toBeDefined();
      expect(typeof listUsers.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(listUsers.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(listUsers.tokenEstimate).toBeDefined();
      expect(listUsers.tokenEstimate.reduction).toBe('99%');
    });
  });
});
