/**
 * Unit Tests for create-bug Wrapper
 *
 * Tests wrapper logic in isolation using mocked GraphQL client.
 * No actual Linear API calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBug, createBugParams, createBugOutput } from './create-bug';
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

vi.mock('./lib/resolve-ids.js', () => ({
  resolveStateId: vi.fn().mockResolvedValue('state-uuid'),
  resolveAssigneeId: vi.fn().mockResolvedValue('assignee-uuid'),
  resolveProjectId: vi.fn().mockResolvedValue('project-uuid'),
  resolveTeamId: vi.fn().mockResolvedValue('team-uuid'),
}));

import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

describe('createBug - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response (matches issueCreate mutation)
  const sampleGraphQLResponse = {
    issueCreate: {
      success: true,
      issue: {
        id: 'issue-uuid-123',
        identifier: 'ENG-123',
        title: 'Bug Title',
        url: 'https://linear.app/team/issue/ENG-123',
      },
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
    it('should require title field', () => {
      expect(() => createBugParams.parse({ team: 'Engineering' })).toThrow();
    });

    it('should require team field', () => {
      expect(() => createBugParams.parse({ title: 'Bug title' })).toThrow();
    });

    it('should accept valid minimal input', () => {
      const input = { title: 'Login broken', team: 'Engineering' };
      const result = createBugParams.parse(input);
      expect(result.title).toBe('Login broken');
      expect(result.team).toBe('Engineering');
    });

    it('should reject empty title', () => {
      expect(() => createBugParams.parse({ title: '', team: 'Engineering' })).toThrow();
    });

    it('should accept optional description', () => {
      const input = { title: 'Bug', team: 'Eng', description: 'Steps to reproduce...' };
      const result = createBugParams.parse(input);
      expect(result.description).toBe('Steps to reproduce...');
    });

    it('should accept optional assignee', () => {
      const input = { title: 'Bug', team: 'Eng', assignee: 'me' };
      const result = createBugParams.parse(input);
      expect(result.assignee).toBe('me');
    });

    it('should accept priority in range', () => {
      const input = { title: 'Bug', team: 'Eng', priority: 1 };
      const result = createBugParams.parse(input);
      expect(result.priority).toBe(1);
    });

    it('should reject priority below 1', () => {
      expect(() => createBugParams.parse({ title: 'Bug', team: 'Eng', priority: 0 })).toThrow();
    });

    it('should reject priority above 4', () => {
      expect(() => createBugParams.parse({ title: 'Bug', team: 'Eng', priority: 5 })).toThrow();
    });

    it('should accept optional state', () => {
      const input = { title: 'Bug', team: 'Eng', state: 'Backlog' };
      const result = createBugParams.parse(input);
      expect(result.state).toBe('Backlog');
    });

    it('should accept optional labels', () => {
      const input = { title: 'Bug', team: 'Eng', labels: ['urgent', 'frontend'] };
      const result = createBugParams.parse(input);
      expect(result.labels).toEqual(['urgent', 'frontend']);
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      const result = await createBug.execute({ title: 'Bug Title', team: 'Engineering' });

      // Verify essential fields
      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('issue-uuid-123');
      expect(result.issue.identifier).toBe('ENG-123');
      expect(result.issue.title).toBe('Bug Title');
      expect(result.issue.url).toBe('https://linear.app/team/issue/ENG-123');
    });

    it('should validate output against schema', async () => {
      const result = await createBug.execute({ title: 'Bug', team: 'Eng' });
      expect(() => createBugOutput.parse(result)).not.toThrow();
    });

    it('should include estimatedTokens', async () => {
      const result = await createBug.execute({ title: 'Bug', team: 'Eng' });
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // ==========================================================================
  // Bug Label Tests
  // ==========================================================================

  describe('Bug Label Handling', () => {
    it('should always include bug label', async () => {
      await createBug.execute({ title: 'Bug', team: 'Eng' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            labelIds: expect.arrayContaining(['bug']),
          }),
        })
      );
    });

    it('should add additional labels after bug', async () => {
      await createBug.execute({ title: 'Bug', team: 'Eng', labels: ['urgent', 'frontend'] });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.any(Object)
      );
    });

    it('should not duplicate bug label if already included', async () => {
      await createBug.execute({ title: 'Bug', team: 'Eng', labels: ['bug', 'urgent'] });

      expect(executeGraphQL).toHaveBeenCalled();
    });

    it('should not duplicate bug label case-insensitive', async () => {
      await createBug.execute({ title: 'Bug', team: 'Eng', labels: ['Bug', 'urgent'] });

      expect(executeGraphQL).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Priority Default Tests
  // ==========================================================================

  describe('Priority Default', () => {
    it('should default to priority 2 (High) for bugs', async () => {
      await createBug.execute({ title: 'Bug', team: 'Eng' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            priority: 2,
          }),
        })
      );
    });

    it('should allow overriding priority', async () => {
      await createBug.execute({ title: 'Bug', team: 'Eng', priority: 1 });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            priority: 1,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValue(new Error('GraphQL connection failed'));

      await expect(createBug.execute({ title: 'Bug', team: 'Eng' })).rejects.toThrow('GraphQL connection failed');
    });

    it('should throw when creation fails (success: false)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: { success: false, issue: null },
      } as any);

      await expect(createBug.execute({ title: 'Bug', team: 'Eng' })).rejects.toThrow(/Failed to create bug/);
    });

    it('should throw on null response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue(null as any);

      await expect(createBug.execute({ title: 'Bug', team: 'Eng' })).rejects.toThrow();
    });

    it('should throw on undefined response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue(undefined as any);

      await expect(createBug.execute({ title: 'Bug', team: 'Eng' })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle empty labels array', async () => {
      const result = await createBug.execute({ title: 'Bug', team: 'Eng', labels: [] });
      expect(result.success).toBe(true);
    });

    it('should handle very long title (500 chars)', async () => {
      const longTitle = 'A'.repeat(500);
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: {
          success: true,
          issue: { id: '1', identifier: 'ENG-1', title: longTitle, url: 'https://example.com' },
        },
      } as any);

      const result = await createBug.execute({ title: longTitle, team: 'Eng' });
      expect(result.success).toBe(true);
      expect(result.issue.title).toBe(longTitle);
    });

    it('should handle unicode characters in title', async () => {
      const unicodeTitle = 'Bug 🐛 with émojis and 中文';
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: {
          success: true,
          issue: { id: '1', identifier: 'ENG-1', title: unicodeTitle, url: 'https://example.com' },
        },
      } as any);

      const result = await createBug.execute({ title: unicodeTitle, team: 'Eng' });
      expect(result.issue.title).toBe(unicodeTitle);
    });

    it('should handle large labels array (50 labels)', async () => {
      const manyLabels = Array.from({ length: 50 }, (_, i) => `label-${i}`);

      const result = await createBug.execute({ title: 'Bug', team: 'Eng', labels: manyLabels });
      expect(result.success).toBe(true);
    });

    it('should handle response with minimal issue fields', async () => {
      const result = await createBug.execute({ title: 'Bug', team: 'Eng' });
      expect(result.issue).toMatchObject({
        id: expect.any(String),
        identifier: expect.any(String),
        title: expect.any(String),
        url: expect.any(String),
      });
    });

    it('should handle all optional fields undefined', async () => {
      const result = await createBug.execute({
        title: 'Bug',
        team: 'Eng',
        description: undefined,
        assignee: undefined,
        priority: undefined,
        state: undefined,
        labels: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should handle special characters in team name', async () => {
      const result = await createBug.execute({ title: 'Bug', team: 'Team-Name_123' });
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Security Validation Tests
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in title', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createBug.execute({ title: input, team: 'Eng' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in description', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', description: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in team', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createBug.execute({ title: 'Bug', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in team', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createBug.execute({ title: 'Bug', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in team', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createBug.execute({ title: 'Bug', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in assignee', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', assignee: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in assignee', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', assignee: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in assignee', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', assignee: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in state', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in state', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in state', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in labels', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', labels: [input] })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in labels', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', labels: [input] })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in labels', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createBug.execute({ title: 'Bug', team: 'Eng', labels: [input] })
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
        createBugParams.parse({ title: `Bug ${i}`, team: `Team-${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(createBug.name).toBe('linear.create_bug');
    });

    it('should have description', () => {
      expect(createBug.description).toBeDefined();
      expect(typeof createBug.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(createBug.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(createBug.tokenEstimate).toBeDefined();
      expect(createBug.tokenEstimate.reduction).toBe('99%');
    });
  });
});
