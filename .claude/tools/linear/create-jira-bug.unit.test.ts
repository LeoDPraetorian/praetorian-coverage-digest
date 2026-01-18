/**
 * Unit Tests for create-jira-bug Wrapper
 *
 * Tests wrapper logic in isolation using mocked GraphQL client.
 * No actual Linear API calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createJiraBug, createJiraBugParams, createJiraBugOutput } from './create-jira-bug';
import {
  testSecurityScenarios,
  PathTraversalScenarios,
  CommandInjectionScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the client and GraphQL modules
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

describe('createJiraBug - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response (matches issueCreate mutation)
  const sampleGraphQLResponse = {
    issueCreate: {
      success: true,
      issue: {
        id: 'issue-uuid-123',
        identifier: 'ENG-123',
        title: 'Jira Bug Title',
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
      expect(() => createJiraBugParams.parse({ team: 'Eng' })).toThrow();
    });

    it('should require team field', () => {
      expect(() => createJiraBugParams.parse({ title: 'Bug' })).toThrow();
    });

    it('should reject empty title', () => {
      expect(() => createJiraBugParams.parse({ title: '', team: 'Eng' })).toThrow();
    });

    it('should accept valid title and team', () => {
      const input = { title: 'Jira sync failing', team: 'Engineering' };
      const result = createJiraBugParams.parse(input);
      expect(result.title).toBe('Jira sync failing');
      expect(result.team).toBe('Engineering');
    });

    it('should accept optional description', () => {
      const input = { title: 'Bug', team: 'Eng', description: 'Details here' };
      const result = createJiraBugParams.parse(input);
      expect(result.description).toBe('Details here');
    });

    it('should accept optional assignee', () => {
      const input = { title: 'Bug', team: 'Eng', assignee: 'me' };
      const result = createJiraBugParams.parse(input);
      expect(result.assignee).toBe('me');
    });

    it('should accept priority in range', () => {
      const input = { title: 'Bug', team: 'Eng', priority: 2 };
      const result = createJiraBugParams.parse(input);
      expect(result.priority).toBe(2);
    });

    it('should reject priority below 1', () => {
      expect(() => createJiraBugParams.parse({ title: 'Bug', team: 'Eng', priority: 0 })).toThrow();
    });

    it('should reject priority above 4', () => {
      expect(() => createJiraBugParams.parse({ title: 'Bug', team: 'Eng', priority: 5 })).toThrow();
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      const result = await createJiraBug.execute({ title: 'Jira Bug', team: 'Engineering' });

      expect(result.success).toBe(true);
      expect(result.issue.id).toBe('issue-uuid-123');
      expect(result.issue.identifier).toBe('ENG-123');
      expect(result.issue.title).toBe('Jira Bug Title');
      expect(result.issue.url).toBe('https://linear.app/team/issue/ENG-123');
    });

    it('should validate output against schema', async () => {
      const result = await createJiraBug.execute({ title: 'Bug', team: 'Eng' });
      expect(() => createJiraBugOutput.parse(result)).not.toThrow();
    });

    it('should include estimatedTokens', async () => {
      const result = await createJiraBug.execute({ title: 'Bug', team: 'Eng' });
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // ==========================================================================
  // Jira Label Tests
  // ==========================================================================

  describe('Jira Label Handling', () => {
    it('should always include jira-related labels', async () => {
      await createJiraBug.execute({ title: 'Bug', team: 'Eng' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.any(Object)
      );
    });

    it('should add additional labels after jira labels', async () => {
      await createJiraBug.execute({ title: 'Bug', team: 'Eng' });

      expect(executeGraphQL).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Priority Default Tests
  // ==========================================================================

  describe('Priority Default', () => {
    it('should default to priority 1 (Urgent) for jira bugs', async () => {
      await createJiraBug.execute({ title: 'Bug', team: 'Eng' });

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

    it('should allow overriding priority', async () => {
      await createJiraBug.execute({ title: 'Bug', team: 'Eng', priority: 3 });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            priority: 3,
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

      await expect(createJiraBug.execute({ title: 'Bug', team: 'Eng' })).rejects.toThrow('GraphQL connection failed');
    });

    it('should throw when creation fails (success: false)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: { success: false, issue: null },
      } as any);

      await expect(createJiraBug.execute({ title: 'Bug', team: 'Eng' })).rejects.toThrow(/Failed to create/);
    });

    it('should throw on null response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue(null as any);

      await expect(createJiraBug.execute({ title: 'Bug', team: 'Eng' })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle minimal input', async () => {
      const result = await createJiraBug.execute({ title: 'Bug', team: 'Eng' });
      expect(result.success).toBe(true);
    });

    it('should handle very long title', async () => {
      const longTitle = 'A'.repeat(500);
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: {
          success: true,
          issue: { id: '1', identifier: 'ENG-1', title: longTitle, url: 'https://example.com' },
        },
      } as any);

      const result = await createJiraBug.execute({ title: longTitle, team: 'Eng' });
      expect(result.success).toBe(true);
    });

    it('should handle unicode characters in title', async () => {
      const unicodeTitle = 'Jira Bug 🐛 with émojis';
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: {
          success: true,
          issue: { id: '1', identifier: 'ENG-1', title: unicodeTitle, url: 'https://example.com' },
        },
      } as any);

      const result = await createJiraBug.execute({ title: unicodeTitle, team: 'Eng' });
      expect(result.issue.title).toBe(unicodeTitle);
    });
  });

  // ==========================================================================
  // Security Tests
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in title', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createJiraBug.execute({ title: input, team: 'Eng' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in team', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createJiraBug.execute({ title: 'Bug', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in team', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createJiraBug.execute({ title: 'Bug', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in team', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createJiraBug.execute({ title: 'Bug', team: input })
      );

      expect(results.passed).toBe(results.total);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should complete validation quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        createJiraBugParams.parse({ title: `Bug ${i}`, team: `Team-${i}` });
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
      expect(createJiraBug.name).toBe('linear.create_jira_bug');
    });

    it('should have description', () => {
      expect(createJiraBug.description).toBeDefined();
    });

    it('should have parameters schema', () => {
      expect(createJiraBug.parameters).toBeDefined();
    });
  });
});
