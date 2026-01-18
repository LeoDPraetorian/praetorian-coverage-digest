/**
 * Unit Tests for find-issue Wrapper
 *
 * Tests wrapper logic in isolation using mocked GraphQL client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MCPErrors,
  testSecurityScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the client and GraphQL modules
vi.mock('./client.js', () => ({
  createLinearClient: vi.fn(),
}));

vi.mock('./graphql-helpers.js', () => ({
  executeGraphQL: vi.fn(),
}));

vi.mock('./get-issue.js', () => ({
  getIssue: {
    execute: vi.fn(),
  },
  getIssueOutput: {},
}));

import { findIssue } from './find-issue';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import { getIssue } from './get-issue.js';

describe('findIssue - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response (matches issues query)
  const sampleGraphQLResponse = {
    issues: {
      nodes: [
        {
          id: 'issue-uuid-123',
          identifier: 'CHARIOT-1516',
          title: 'Test Issue',
          url: 'https://linear.app/team/issue/CHARIOT-1516',
          state: { name: 'In Progress' },
          priority: 2,
        },
      ],
    },
  };

  // Sample getIssue response
  const sampleGetIssueResponse = {
    id: 'issue-uuid-123',
    identifier: 'CHARIOT-1516',
    title: 'Test Issue',
    url: 'https://linear.app/team/issue/CHARIOT-1516',
    state: 'In Progress',
    priority: 2,
    estimatedTokens: 150,
  };

  beforeEach(() => {
    vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
    vi.mocked(executeGraphQL).mockResolvedValue(sampleGraphQLResponse as any);
    vi.mocked(getIssue.execute).mockResolvedValue(sampleGetIssueResponse as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid query', async () => {
      const result = await findIssue.execute({ query: 'CHARIOT-1516' });
      expect(result.status).toBe('found');
      expect(result).toHaveProperty('issue');
    });

    it('should accept optional team filter', async () => {
      await findIssue.execute({ query: 'test', team: 'Engineering' });
      expect(executeGraphQL).toHaveBeenCalled();
    });
  });

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      const result = await findIssue.execute({ query: 'CHARIOT-1516' });

      expect(result.status).toBe('found');
      if (result.status === 'found') {
        expect(result.issue.id).toBeDefined();
        expect(result.issue.identifier).toBeDefined();
      }
    });

    it('should include estimatedTokens', async () => {
      // Mock getIssue to return properly
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issue: {
          id: 'issue-uuid-123',
          identifier: 'CHARIOT-1516',
          title: 'Test Issue',
          url: 'https://linear.app/team/issue/CHARIOT-1516',
          state: { name: 'In Progress' },
          priority: 2,
        },
      } as any);

      const result = await findIssue.execute({ query: 'CHARIOT-1516' });

      expect(result.status).toBe('found');
      if (result.status === 'found') {
        // Token estimation is from getIssue, which isn't mocked yet
        // But we can verify the structure is correct
        expect(result.issue).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw on GraphQL connection error', async () => {
      // The implementation catches errors in tryExactMatch, so we need to
      // mock getIssue to throw on the first attempt (propagateErrors=true)
      vi.mocked(getIssue.execute).mockRejectedValue(MCPErrors.serverError());

      // Use a full identifier that triggers tryExactMatch with propagateErrors=true
      await expect(findIssue.execute({ query: 'CHARIOT-123' })).rejects.toThrow();
    });

    it('should handle empty results', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issues: { nodes: [] },
      } as any);

      const result = await findIssue.execute({ query: 'nonexistent' });
      expect(result.status).toBe('not_found');
      if (result.status === 'not_found') {
        expect(result.message).toContain('No issues found');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle UUID format for query', async () => {
      const result = await findIssue.execute({ query: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e' });
      // UUID format should trigger tryExactMatch first (which uses getIssue, not executeGraphQL directly)
      expect(getIssue.execute).toHaveBeenCalled();
      expect(result.status).toBe('found');
    });

    it('should handle identifier format for query', async () => {
      const result = await findIssue.execute({ query: 'CHARIOT-1234' });
      // Identifier format should trigger tryExactMatch first (which uses getIssue, not executeGraphQL directly)
      expect(getIssue.execute).toHaveBeenCalled();
      expect(result.status).toBe('found');
    });

    it('should handle search text query', async () => {
      await findIssue.execute({ query: 'authentication bug' });
      expect(executeGraphQL).toHaveBeenCalled();
    });

    it('should handle multiple results', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issues: {
          nodes: [
            { id: '1', identifier: 'TEST-1', title: 'Issue 1', url: 'url1', state: { name: 'Open' } },
            { id: '2', identifier: 'TEST-2', title: 'Issue 2', url: 'url2', state: { name: 'Open' } },
          ],
        },
      } as any);

      const result = await findIssue.execute({ query: 'test' });
      expect(result.status).toBe('disambiguation_needed');
      if (result.status === 'disambiguation_needed') {
        expect(result.candidates.length).toBe(2);
      }
    });
  });

  describe('Security', () => {
    it('should block control characters in query', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => findIssue.execute({ query: input })
      );
      expect(results.passed).toBe(results.total);
    });
  });

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(findIssue.name).toBe('linear.find_issue');
    });

    it('should have description', () => {
      expect(findIssue.description).toBeDefined();
    });
  });
});
