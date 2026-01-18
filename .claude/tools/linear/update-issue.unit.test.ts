/**
 * Unit Tests for update-issue Wrapper
 *
 * These tests validate the update-issue wrapper using MOCKED MCP responses.
 * No actual Linear API calls are made.
 *
 * Test Categories:
 * 1. Input Validation - Zod schema enforcement
 * 2. Token Reduction - Output filtering verification
 * 3. Error Handling - Various failure scenarios
 * 4. Security - Input sanitization and validation
 * 5. Performance - Response time verification
 * 6. MCP Response Formats - Different response structures
 * 7. Edge Cases - Boundary conditions
 *
 * Usage:
 * npx vitest run update-issue.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateIssue, updateIssueParams, updateIssueOutput } from './update-issue';
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

// Mock resolve-ids to avoid additional GraphQL calls
vi.mock('./lib/resolve-ids.js', () => ({
  resolveStateId: vi.fn().mockResolvedValue('state-uuid'),
  resolveAssigneeId: vi.fn().mockResolvedValue('assignee-uuid'),
  resolveProjectId: vi.fn().mockResolvedValue('project-uuid'),
  resolveTeamId: vi.fn().mockResolvedValue('team-uuid'),
}));

import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

describe('updateIssue - Unit Tests', () => {
  const mockClient = {};

  beforeEach(() => {
    vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should require id field', () => {
      expect(() => updateIssueParams.parse({})).toThrow();
    });

    it('should reject empty id', () => {
      expect(() => updateIssueParams.parse({ id: '' })).toThrow();
    });

    it('should accept valid id with optional fields', () => {
      const input = {
        id: 'CHARIOT-1234',
        title: 'Updated Title',
        description: 'Updated description',
        assignee: 'me',
        state: 'In Progress',
        priority: 2,
      };
      const result = updateIssueParams.parse(input);
      expect(result.id).toBe('CHARIOT-1234');
      expect(result.title).toBe('Updated Title');
      expect(result.priority).toBe(2);
    });

    it('should validate priority range (0-4)', () => {
      expect(() => updateIssueParams.parse({ id: 'TEST-1', priority: -1 })).toThrow();
      expect(() => updateIssueParams.parse({ id: 'TEST-1', priority: 5 })).toThrow();
      expect(() => updateIssueParams.parse({ id: 'TEST-1', priority: 0 })).not.toThrow();
      expect(() => updateIssueParams.parse({ id: 'TEST-1', priority: 4 })).not.toThrow();
    });

    it('should accept labels as array of strings', () => {
      const input = {
        id: 'TEST-1',
        labels: ['bug', 'high-priority'],
      };
      const result = updateIssueParams.parse(input);
      expect(result.labels).toEqual(['bug', 'high-priority']);
    });

    it('should accept dueDate as string', () => {
      const input = {
        id: 'TEST-1',
        dueDate: '2024-12-31',
      };
      const result = updateIssueParams.parse(input);
      expect(result.dueDate).toBe('2024-12-31');
    });

    it('should accept cycle field for sprint assignment', () => {
      const input = {
        id: 'TEST-1',
        cycle: 'sprint-123',
      };
      const result = updateIssueParams.parse(input);
      expect(result.cycle).toBe('sprint-123');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: 'uuid-123',
            identifier: 'CHARIOT-1234',
            title: 'Updated Issue',
            url: 'https://linear.app/chariot/issue/CHARIOT-1234',
            // Extra fields that should be filtered out
            description: 'Full description here',
            priority: 2,
            state: { id: 'state-1', name: 'In Progress' },
            assignee: { id: 'user-1', name: 'John Doe' },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
            project: { id: 'proj-1', name: 'Q1 Planning' },
            labels: [{ id: 'label-1', name: 'bug' }],
          },
        },
      } as any);

      const result = await updateIssue.execute({ id: 'CHARIOT-1234', title: 'Updated Issue' });

      // Verify only essential fields are returned (flattened structure)
      expect(result.id).toBe('uuid-123');
      expect(result.identifier).toBe('CHARIOT-1234');
      expect(result.title).toBe('Updated Issue');
      expect(result.url).toBe('https://linear.app/chariot/issue/CHARIOT-1234');
      expect(result.estimatedTokens).toBeDefined();

      // Verify filtered fields are NOT present
      expect(result).not.toHaveProperty('description');
      expect(result).not.toHaveProperty('priority');
      expect(result).not.toHaveProperty('state');
      expect(result).not.toHaveProperty('assignee');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: 'uuid-123',
            identifier: 'TEST-1',
            title: 'Test',
            url: 'https://linear.app/test',
          },
        },
      } as any);

      const result = await updateIssue.execute({ id: 'TEST-1', title: 'Test' });
      expect(() => updateIssueOutput.parse(result)).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(
        updateIssue.execute({ id: 'TEST-1', title: 'Test' })
      ).rejects.toThrow('GraphQL connection failed');
    });

    it('should throw when success is false', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: false,
          issue: null,
        },
      } as any);

      await expect(
        updateIssue.execute({ id: 'TEST-1', title: 'Test' })
      ).rejects.toThrow('Failed to update issue');
    });

    it('should throw when no issue returned', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: null,
        },
      } as any);

      await expect(
        updateIssue.execute({ id: 'TEST-1', title: 'Test' })
      ).rejects.toThrow('Failed to update issue');
    });

    it('should throw when issue is undefined', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: undefined,
        },
      } as any);

      await expect(
        updateIssue.execute({ id: 'TEST-1', title: 'Test' })
      ).rejects.toThrow('Failed to update issue');
    });

    it('should handle null issueUpdate response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: null,
      } as any);

      await expect(
        updateIssue.execute({ id: 'TEST-1', title: 'Test' })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    // Title and description are user content fields - they should allow special chars
    // but block control characters. Path traversal and command injection validation
    // is applied to ID/reference fields (id, assignee, state, project, etc.)

    it('should block control character injection in title', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateIssue.execute({ id: 'TEST-1', title: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed control char scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block control character injection in description', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateIssue.execute({ id: 'TEST-1', description: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed control char scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block path traversal in id', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateIssue.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed path traversal scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in id', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateIssue.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed command injection scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block path traversal in assignee', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateIssue.execute({ id: 'TEST-1', assignee: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed path traversal scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in state', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateIssue.execute({ id: 'TEST-1', state: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed command injection scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in project', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateIssue.execute({ id: 'TEST-1', project: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed command injection scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block path traversal in parentId', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateIssue.execute({ id: 'TEST-1', parentId: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed path traversal scenarios:', results.results.filter(r => !r.passed));
      }
    });

    it('should block command injection in cycle', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateIssue.execute({ id: 'TEST-1', cycle: input })
      );

      expect(results.passed).toBe(results.total);
      if (results.failed > 0) {
        console.error('Failed command injection scenarios:', results.results.filter(r => !r.passed));
      }
    });

    // User content fields should ALLOW special characters (but not control chars)
    it('should allow special characters in title (user content)', () => {
      // Title is user content - should allow special chars like &, <, >
      const input = { id: 'TEST-1', title: 'Fix bug & improve <performance>' };
      const result = updateIssueParams.parse(input);
      expect(result.title).toBe('Fix bug & improve <performance>');
    });

    it('should allow markdown-like formatting in description (user content)', () => {
      // Note: Control char validation blocks newlines (\n = 0x0A)
      // Description can still contain markdown characters on single line
      const input = {
        id: 'TEST-1',
        description: '## Header - Item 1, Item 2, `code`',
      };
      const result = updateIssueParams.parse(input);
      expect(result.description).toContain('## Header');
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should complete validation within reasonable time', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        updateIssueParams.parse({
          id: `TEST-${i}`,
          title: 'Performance test',
          description: 'Testing validation performance',
        });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // 1000 validations < 1 second
    });

    it('should handle large descriptions efficiently', () => {
      const largeDescription = 'x'.repeat(10000);
      const start = Date.now();
      updateIssueParams.parse({ id: 'TEST-1', description: largeDescription });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Single validation < 100ms
    });
  });

  // ==========================================================================
  // MCP Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard issueUpdate mutation response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: 'uuid-123',
            identifier: 'TEST-1',
            title: 'Updated Issue',
            url: 'https://linear.app/test',
          },
        },
      } as any);

      const result = await updateIssue.execute({ id: 'TEST-1', title: 'Updated Issue' });
      expect(result.id).toBe('uuid-123');
      expect(result.identifier).toBe('TEST-1');
    });

    it('should call executeGraphQL with correct mutation', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: 'uuid-123',
            identifier: 'TEST-1',
            title: 'Updated',
            url: 'https://linear.app/test',
          },
        },
      } as any);

      await updateIssue.execute({ id: 'TEST-1', title: 'Updated' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('mutation IssueUpdate'),
        expect.objectContaining({
          id: 'TEST-1',
          input: expect.objectContaining({
            title: 'Updated',
          }),
        })
      );
    });

    it('should handle issue with all fields', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: 'uuid-1',
            identifier: 'TEST-1',
            title: 'Complete',
            url: 'https://linear.app/test/1',
          },
        },
      } as any);

      const result = await updateIssue.execute({ id: 'TEST-1', title: 'Complete' });
      expect(result.id).toBe('uuid-1');
      expect(result.title).toBe('Complete');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle UUID format for id', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            identifier: 'TEST-1',
            title: 'Test',
            url: 'https://linear.app/test',
          },
        },
      } as any);

      const result = await updateIssue.execute({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test'
      });
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle identifier format for id', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: 'uuid-123',
            identifier: 'CHARIOT-9999',
            title: 'Test',
            url: 'https://linear.app/chariot/issue/CHARIOT-9999',
          },
        },
      } as any);

      const result = await updateIssue.execute({
        id: 'CHARIOT-9999',
        title: 'Test'
      });
      expect(result.id).toBe('uuid-123');
      expect(result.identifier).toBe('CHARIOT-9999');
    });

    it('should handle update with only id (no changes)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: 'uuid-123',
            identifier: 'TEST-1',
            title: 'Original Title',
            url: 'https://linear.app/test',
          },
        },
      } as any);

      // Technically valid - request to update with no changes
      const result = await updateIssue.execute({ id: 'TEST-1' });
      expect(result.id).toBe('uuid-123');
      expect(result.identifier).toBe('TEST-1');
    });

    it('should handle all optional fields at once', async () => {
      // Mock the team query (needed for state resolution)
      vi.mocked(executeGraphQL)
        .mockResolvedValueOnce({
          issue: {
            team: {
              id: 'team-uuid',
            },
          },
        } as any)
        // Mock the update mutation
        .mockResolvedValueOnce({
          issueUpdate: {
            success: true,
            issue: {
              id: 'uuid-123',
              identifier: 'TEST-1',
              title: 'Fully Updated',
              url: 'https://linear.app/test',
            },
          },
        } as any);

      const result = await updateIssue.execute({
        id: 'TEST-1',
        title: 'Fully Updated',
        description: 'New description',
        assignee: 'me',
        state: 'Done',
        priority: 1,
        project: 'Q1 Project',
        labels: ['critical', 'bug'],
        dueDate: '2024-12-31',
        parentId: 'PARENT-1',
        cycle: 'sprint-42',
      });

      expect(result.id).toBe('uuid-123');
      expect(result.identifier).toBe('TEST-1');
      expect(result.title).toBe('Fully Updated');
    });

    it('should handle special characters in identifier', async () => {
      // Some teams might have hyphens or underscores
      const input = { id: 'TEAM-SUB-1234' };
      const result = updateIssueParams.parse(input);
      expect(result.id).toBe('TEAM-SUB-1234');
    });

    it('should handle empty labels array', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        issueUpdate: {
          success: true,
          issue: {
            id: 'uuid-123',
            identifier: 'TEST-1',
            title: 'Test',
            url: 'https://linear.app/test',
          },
        },
      } as any);

      const result = await updateIssue.execute({
        id: 'TEST-1',
        labels: []
      });
      expect(result.id).toBe('uuid-123');
      expect(result.identifier).toBe('TEST-1');
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(updateIssue.name).toBe('linear.update_issue');
    });

    it('should have description', () => {
      expect(updateIssue.description).toBeDefined();
      expect(typeof updateIssue.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(updateIssue.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(updateIssue.tokenEstimate).toBeDefined();
      expect(updateIssue.tokenEstimate.reduction).toBe('99%');
    });
  });
});
