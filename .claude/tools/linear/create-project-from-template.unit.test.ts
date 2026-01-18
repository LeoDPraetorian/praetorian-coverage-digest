/**
 * Unit Tests for create-project-from-template Wrapper
 *
 * These tests validate the create-project-from-template wrapper.
 * No actual Linear API calls are made - uses GraphQL client mocks.
 *
 * Usage:
 * npx vitest run create-project-from-template.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProjectFromTemplate, createProjectFromTemplateParams, createProjectFromTemplateOutput } from './create-project-from-template';
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

describe('createProjectFromTemplate - Unit Tests', () => {
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
    it('should require templateId field', () => {
      expect(() => createProjectFromTemplateParams.parse({ name: 'Test', team: 'Eng' })).toThrow();
    });

    it('should require name field', () => {
      expect(() => createProjectFromTemplateParams.parse({ templateId: 'template-123', team: 'Eng' })).toThrow();
    });

    it('should require team field', () => {
      expect(() => createProjectFromTemplateParams.parse({ templateId: 'template-123', name: 'Test' })).toThrow();
    });

    it('should accept valid minimal input', () => {
      const input = { templateId: 'template-123', name: 'Test Project', team: 'Engineering' };
      const result = createProjectFromTemplateParams.parse(input);
      expect(result.templateId).toBe('template-123');
      expect(result.name).toBe('Test Project');
      expect(result.team).toBe('Engineering');
    });

    it('should reject empty templateId', () => {
      expect(() => createProjectFromTemplateParams.parse({ templateId: '', name: 'Test', team: 'Eng' })).toThrow();
    });

    it('should reject empty name', () => {
      expect(() => createProjectFromTemplateParams.parse({ templateId: 'template-123', name: '', team: 'Eng' })).toThrow();
    });

    it('should accept optional description', () => {
      const input = { templateId: 'template-123', name: 'Test', team: 'Eng', description: 'Override description' };
      const result = createProjectFromTemplateParams.parse(input);
      expect(result.description).toBe('Override description');
    });

    it('should accept optional lead', () => {
      const input = { templateId: 'template-123', name: 'Test', team: 'Eng', lead: 'me' };
      const result = createProjectFromTemplateParams.parse(input);
      expect(result.lead).toBe('me');
    });

    it('should accept optional startDate', () => {
      const input = { templateId: 'template-123', name: 'Test', team: 'Eng', startDate: '2025-01-01' };
      const result = createProjectFromTemplateParams.parse(input);
      expect(result.startDate).toBe('2025-01-01');
    });

    it('should accept optional targetDate', () => {
      const input = { templateId: 'template-123', name: 'Test', team: 'Eng', targetDate: '2025-12-31' };
      const result = createProjectFromTemplateParams.parse(input);
      expect(result.targetDate).toBe('2025-12-31');
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: {
          success: true,
          project: {
            id: 'project-uuid-123',
            name: 'Test Project',
            url: 'https://linear.app/team/project/project-123',
            // Extra fields that should be filtered
            description: 'Full description',
            state: { id: 'state-1', name: 'Planned' },
            lead: { id: 'user-1', name: 'John' },
            createdAt: '2025-01-01T00:00:00Z',
          },
        },
      });

      const result = await createProjectFromTemplate.execute({
        templateId: 'template-123',
        name: 'Test Project',
        team: 'Engineering'
      });

      // Verify essential fields
      expect(result.success).toBe(true);
      expect(result.project.id).toBe('project-uuid-123');
      expect(result.project.name).toBe('Test Project');
      expect(result.project.url).toBe('https://linear.app/team/project/project-123');

      // Verify filtered fields are NOT present
      expect(result.project).not.toHaveProperty('description');
      expect(result.project).not.toHaveProperty('state');
      expect(result.project).not.toHaveProperty('lead');
      expect(result.project).not.toHaveProperty('createdAt');
    });

    it('should validate output against schema', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Project',
            url: 'https://linear.app/project',
          },
        },
      });

      const result = await createProjectFromTemplate.execute({
        templateId: 'template-123',
        name: 'Project',
        team: 'Eng'
      });
      expect(() => createProjectFromTemplateOutput.parse(result)).not.toThrow();
    });

    it('should include estimatedTokens in output', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Project',
            url: 'https://linear.app/project',
          },
        },
      });

      const result = await createProjectFromTemplate.execute({
        templateId: 'template-123',
        name: 'Project',
        team: 'Eng'
      });
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

      await expect(
        createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: 'Eng' })
      ).rejects.toThrow('GraphQL execution failed');
    });

    it('should throw when creation fails (success: false)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: { success: false }
      });

      await expect(
        createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: 'Eng' })
      ).rejects.toThrow('Failed to create project from template');
    });

    it('should throw on null response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(null);

      await expect(
        createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: 'Eng' })
      ).rejects.toThrow('Failed to create project from template');
    });

    it('should throw on undefined response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(undefined);

      await expect(
        createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: 'Eng' })
      ).rejects.toThrow('Failed to create project from template');
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in templateId', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: input, name: 'Test', team: 'Eng' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in templateId', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: input, name: 'Test', team: 'Eng' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in templateId', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: input, name: 'Test', team: 'Eng' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in name', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: 'template-123', name: input, team: 'Eng' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in team', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in team', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in team', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in lead', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: 'Eng', lead: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in lead', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: 'Eng', lead: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in lead', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createProjectFromTemplate.execute({ templateId: 'template-123', name: 'Test', team: 'Eng', lead: input })
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
        createProjectFromTemplateParams.parse({
          templateId: `template-${i}`,
          name: `Project ${i}`,
          team: `Team-${i}`
        });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle direct object format', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Project',
            url: 'https://linear.app/project',
          },
        },
      });

      const result = await createProjectFromTemplate.execute({
        templateId: 'template-123',
        name: 'Project',
        team: 'Eng'
      });
      expect(result.success).toBe(true);
      expect(result.project.id).toBe('project-uuid');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should pass templateId to GraphQL variables', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Full Project',
            url: 'https://linear.app/project',
          },
        },
      });

      await createProjectFromTemplate.execute({
        templateId: 'template-abc-123',
        name: 'Full Project',
        team: 'Engineering',
        description: 'Override description',
        lead: 'me',
        startDate: '2025-01-01',
        targetDate: '2025-12-31',
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            name: 'Full Project',
            teamId: 'Engineering',
            templateId: 'template-abc-123',
            description: 'Override description',
            leadId: 'me',
            startDate: '2025-01-01',
            targetDate: '2025-12-31',
          })
        })
      );
    });

    it('should only pass required fields when minimal input', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Minimal',
            url: 'https://linear.app/project',
          },
        },
      });

      await createProjectFromTemplate.execute({
        templateId: 'template-123',
        name: 'Minimal',
        team: 'Eng'
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          input: {
            name: 'Minimal',
            teamId: 'Eng',
            templateId: 'template-123'
          }
        })
      );
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(createProjectFromTemplate.name).toBe('linear.create_project_from_template');
    });

    it('should have description', () => {
      expect(createProjectFromTemplate.description).toBeDefined();
      expect(typeof createProjectFromTemplate.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(createProjectFromTemplate.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(createProjectFromTemplate.tokenEstimate).toBeDefined();
      expect(createProjectFromTemplate.tokenEstimate.reduction).toBe('99%');
    });
  });
});
