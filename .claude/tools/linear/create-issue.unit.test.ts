/**
 * Unit Tests for create-issue Wrapper
 *
 * Tests wrapper logic in isolation using mocked GraphQL client.
 * Validates filtering, token reduction, schema validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MCPErrors,
  testSecurityScenarios,
  ControlCharacterScenarios,
} from '@claude/testing';

// Mock the client and GraphQL modules BEFORE importing
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

// Mock resolve-template for template lookup
vi.mock('./lib/resolve-template.js', () => ({
  resolveTemplateForProject: vi.fn(),
}));

// Import the wrapper to test
import { createIssue } from './create-issue';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import { resolveTemplateForProject } from './lib/resolve-template.js';
import { resolveProjectId } from './lib/resolve-ids.js';

describe('createIssue - Unit Tests', () => {
  const mockClient = {};

  // Sample GraphQL response for mocking (matches issueCreate mutation response)
  const sampleGraphQLResponse = {
    issueCreate: {
      success: true,
      issue: {
        id: 'issue-123',
        identifier: 'CHARIOT-1516',
        title: 'Test Issue',
        url: 'https://linear.app/team/issue/CHARIOT-1516',
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
  // Category 1: Wrapper Logic Tests (Mocked)
  // ==========================================================================

  describe('Filtering logic', () => {
    it('should filter response to essential fields only', async () => {
      const result = await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
      });

      // Verify success wrapper
      expect(result.success).toBe(true);
      expect(result.issue).toBeDefined();

      // Verify filtered fields
      expect(result.issue.id).toBe('issue-123');
      expect(result.issue.identifier).toBe('CHARIOT-1516');
      expect(result.issue.title).toBe('Test Issue');
      expect(result.issue.url).toBe('https://linear.app/team/issue/CHARIOT-1516');
    });

    it('should pass all parameters to GraphQL', async () => {
      await createIssue.execute({
        title: 'Full Issue',
        description: 'Detailed description',
        team: 'Engineering',
        assignee: 'me',
        state: 'In Progress',
        priority: 1,
        project: 'Q1 Sprint',
        labels: ['bug', 'urgent'],
        dueDate: '2025-02-01',
        parentId: 'parent-issue-123',
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            title: 'Full Issue',
            description: 'Detailed description',
          }),
        })
      );
    });

    it('should work with minimal required fields', async () => {
      const result = await createIssue.execute({
        title: 'Minimal Issue',
        team: 'Engineering',
      });

      expect(result.success).toBe(true);
      expect(result.issue.identifier).toBe('CHARIOT-1516');
    });
  });

  describe('Token estimation', () => {
    it('should include estimatedTokens in output', async () => {
      const result = await createIssue.execute({
        title: 'Test',
        team: 'Engineering',
      });

      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Category 2: Error Handling Tests
  // ==========================================================================

  describe('GraphQL errors', () => {
    it('should handle rate limit errors', async () => {
      vi.mocked(executeGraphQL).mockRejectedValue(MCPErrors.rateLimit());

      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering' })
      ).rejects.toThrow(/rate limit/i);
    });

    it('should handle server errors', async () => {
      vi.mocked(executeGraphQL).mockRejectedValue(MCPErrors.serverError());

      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering' })
      ).rejects.toThrow(/server.*error/i);
    });

    it('should handle network timeout', async () => {
      vi.mocked(executeGraphQL).mockRejectedValue(MCPErrors.timeout());

      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering' })
      ).rejects.toThrow(/ETIMEDOUT/);
    });

    it('should throw when issueCreate returns success: false', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: {
          success: false,
          issue: null,
        },
      } as any);

      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering' })
      ).rejects.toThrow(/Failed to create issue/);
    });

    it('should throw when response missing issue', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: {
          success: true,
          issue: null,
        },
      } as any);

      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering' })
      ).rejects.toThrow(/Failed to create issue/);
    });
  });

  describe('Malformed responses', () => {
    it('should handle unexpected null response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue(null as any);

      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering' })
      ).rejects.toThrow();
    });

    it('should handle missing issueCreate in response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValue({} as any);

      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering' })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 3: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should reject empty title', async () => {
      await expect(
        createIssue.execute({ title: '', team: 'Engineering' })
      ).rejects.toThrow();
    });

    it('should reject missing team', async () => {
      await expect(
        createIssue.execute({ title: 'Test' } as any)
      ).rejects.toThrow();
    });

    it('should reject invalid priority value', async () => {
      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering', priority: 5 })
      ).rejects.toThrow();
    });

    it('should reject negative priority', async () => {
      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering', priority: -1 })
      ).rejects.toThrow();
    });

    it('should accept valid priority values', async () => {
      for (const priority of [0, 1, 2, 3, 4]) {
        await createIssue.execute({ title: 'Test', team: 'Engineering', priority });
      }

      expect(executeGraphQL).toHaveBeenCalledTimes(5);
    });
  });

  // ==========================================================================
  // Category 4: Security Tests
  // ==========================================================================

  describe('Security', () => {
    it('should block control character injection in title', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createIssue.execute({ title: input, team: 'Engineering' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should allow special characters in title (user content)', async () => {
      const result = await createIssue.execute({
        title: 'Fix: bug && issue | <urgent>',
        team: 'Engineering',
      });

      expect(result.success).toBe(true);
    });

    it('should block path traversal in team field', async () => {
      await expect(
        createIssue.execute({ title: 'Test', team: '../../../etc/passwd' })
      ).rejects.toThrow(/traversal/i);
    });

    it('should block command injection in team field', async () => {
      await expect(
        createIssue.execute({ title: 'Test', team: '; rm -rf /' })
      ).rejects.toThrow(/invalid characters/i);
    });

    it('should block control characters in team field', async () => {
      await expect(
        createIssue.execute({ title: 'Test', team: 'team\x00id' })
      ).rejects.toThrow(/control characters/i);
    });

    it('should block path traversal in assignee field', async () => {
      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering', assignee: '../etc/passwd' })
      ).rejects.toThrow(/traversal/i);
    });

    it('should block control characters in description', async () => {
      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering', description: 'test\x1fnull' })
      ).rejects.toThrow(/control characters/i);
    });

    it('should block control characters in labels', async () => {
      await expect(
        createIssue.execute({ title: 'Test', team: 'Engineering', labels: ['bug\x00'] })
      ).rejects.toThrow(/control characters/i);
    });

    it('should allow valid inputs', async () => {
      const result = await createIssue.execute({
        title: 'Valid Title',
        team: 'Engineering',
        description: 'Valid description with *markdown* and <html>',
        labels: ['bug', 'high-priority'],
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should have minimal wrapper overhead', async () => {
      const start = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await createIssue.execute({ title: 'Test', team: 'Engineering' });
      }

      const avgTime = (Date.now() - start) / iterations;
      expect(avgTime).toBeLessThan(10);
      console.log(`Average execution time: ${avgTime.toFixed(2)}ms per call`);
    });
  });

  // ==========================================================================
  // Category 6: Edge Case Tests
  // ==========================================================================

  describe('Edge Case Tests', () => {
    it('should handle issue with very long title', async () => {
      const longTitle = 'A'.repeat(200);
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: {
          success: true,
          issue: {
            id: 'issue-123',
            identifier: 'CHARIOT-1516',
            title: longTitle,
            url: 'https://linear.app/test',
          },
        },
      } as any);

      const result = await createIssue.execute({
        title: longTitle,
        team: 'Engineering',
      });

      expect(result.issue.title).toBe(longTitle);
    });

    it('should handle unicode in title', async () => {
      const unicodeTitle = 'Fix bug in 日本語 module 🔧';
      vi.mocked(executeGraphQL).mockResolvedValue({
        issueCreate: {
          success: true,
          issue: {
            id: 'issue-123',
            identifier: 'CHARIOT-1516',
            title: unicodeTitle,
            url: 'https://linear.app/test',
          },
        },
      } as any);

      const result = await createIssue.execute({
        title: unicodeTitle,
        team: 'Engineering',
      });

      expect(result.issue.title).toBe(unicodeTitle);
    });

    it('should handle empty labels array', async () => {
      const result = await createIssue.execute({
        title: 'Test',
        team: 'Engineering',
        labels: [],
      });

      expect(result.success).toBe(true);
    });

    it('should handle team as UUID', async () => {
      await createIssue.execute({
        title: 'Test',
        team: 'eee0788c-9b67-4b3c-8a08-c9cd4224403e',
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.any(Object)
      );
    });

    it('should handle assignee as "me"', async () => {
      await createIssue.execute({
        title: 'Test',
        team: 'Engineering',
        assignee: 'me',
      });

      expect(executeGraphQL).toHaveBeenCalled();
    });

    it('should handle ISO date format', async () => {
      await createIssue.execute({
        title: 'Test',
        team: 'Engineering',
        dueDate: '2025-02-15T00:00:00.000Z',
      });

      expect(executeGraphQL).toHaveBeenCalled();
    });
  });

  describe('Template Support', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
      vi.mocked(executeGraphQL).mockResolvedValue(sampleGraphQLResponse as any);
      vi.mocked(resolveProjectId).mockResolvedValue('project-uuid');
      vi.mocked(resolveTemplateForProject).mockReset();
    });

    it('should pass templateId to GraphQL mutation when provided', async () => {
      const templateId = 'template-uuid-123';

      await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
        templateId,
      });

      // Verify GraphQL mutation was called with templateId in input
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            templateId,
          }),
        })
      );
    });

    it('should not include templateId in mutation when not provided', async () => {
      await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
      });

      // Verify mutation input does not have templateId
      const callArgs = vi.mocked(executeGraphQL).mock.calls[0];
      const variables = callArgs[2] as any;
      expect(variables.input.templateId).toBeUndefined();
    });

    it('should lookup template when autoApplyProjectTemplate is true and project provided', async () => {
      const projectId = 'project-uuid';
      const templateId = 'resolved-template-uuid';

      vi.mocked(resolveTemplateForProject).mockResolvedValueOnce(templateId);

      await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
        project: 'My Project',
        autoApplyProjectTemplate: true,
      });

      // Verify resolveTemplateForProject was called with resolved project ID
      expect(resolveTemplateForProject).toHaveBeenCalledWith(mockClient, projectId);

      // Verify templateId was included in mutation
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            templateId,
          }),
        })
      );
    });

    it('should not lookup template when autoApplyProjectTemplate is false', async () => {
      await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
        project: 'My Project',
        autoApplyProjectTemplate: false,
      });

      // Verify resolveTemplateForProject was NOT called
      expect(resolveTemplateForProject).not.toHaveBeenCalled();
    });

    it('should use provided templateId over auto-lookup', async () => {
      const explicitTemplateId = 'explicit-template-uuid';
      const autoTemplateId = 'auto-template-uuid';

      vi.mocked(resolveTemplateForProject).mockResolvedValueOnce(autoTemplateId);

      await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
        project: 'My Project',
        templateId: explicitTemplateId,
        autoApplyProjectTemplate: true,
      });

      // Verify resolveTemplateForProject was NOT called (explicit ID takes precedence)
      expect(resolveTemplateForProject).not.toHaveBeenCalled();

      // Verify explicit templateId was used
      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('issueCreate'),
        expect.objectContaining({
          input: expect.objectContaining({
            templateId: explicitTemplateId,
          }),
        })
      );
    });

    it('should proceed without template if auto-lookup finds nothing', async () => {
      // Clear previous mocks and set up this test's mocks
      vi.clearAllMocks();
      vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
      vi.mocked(executeGraphQL).mockResolvedValue(sampleGraphQLResponse as any);
      vi.mocked(resolveProjectId).mockResolvedValue('project-uuid');

      // Mock resolveTemplateForProject returning undefined
      vi.mocked(resolveTemplateForProject).mockResolvedValueOnce(undefined);

      await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
        project: 'My Project',
        autoApplyProjectTemplate: true,
      });

      // Verify issue was still created
      expect(executeGraphQL).toHaveBeenCalled();

      // Verify templateId was NOT included in mutation
      const callArgs = vi.mocked(executeGraphQL).mock.calls[0];
      const variables = callArgs[2] as any;
      expect(variables.input.templateId).toBeUndefined();
    });

    it('should proceed without template if auto-lookup throws error', async () => {
      // Clear previous mocks and set up this test's mocks
      vi.clearAllMocks();
      vi.mocked(createLinearClient).mockResolvedValue(mockClient as any);
      vi.mocked(executeGraphQL).mockResolvedValue(sampleGraphQLResponse as any);
      vi.mocked(resolveProjectId).mockResolvedValue('project-uuid');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock resolveTemplateForProject throwing error
      vi.mocked(resolveTemplateForProject).mockRejectedValueOnce(new Error('Template lookup failed'));

      await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
        project: 'My Project',
        autoApplyProjectTemplate: true,
      });

      // Verify issue was still created
      expect(executeGraphQL).toHaveBeenCalled();

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Template lookup failed')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should not auto-lookup template when project is not provided', async () => {
      await createIssue.execute({
        title: 'Test Issue',
        team: 'Engineering',
        autoApplyProjectTemplate: true,
        // No project provided
      });

      // Verify resolveTemplateForProject was NOT called
      expect(resolveTemplateForProject).not.toHaveBeenCalled();
    });
  });
});
