/**
 * Unit Tests for create-project Wrapper
 *
 * These tests validate the create-project wrapper using MOCKED GraphQL responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run create-project.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProject, createProjectParams, createProjectOutput } from './create-project';
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

describe('createProject - Unit Tests', () => {
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
      expect(() => createProjectParams.parse({ team: 'Engineering' })).toThrow();
    });

    it('should require team field', () => {
      expect(() => createProjectParams.parse({ name: 'Test Project' })).toThrow();
    });

    it('should accept valid minimal input', () => {
      const input = { name: 'Test Project', team: 'Engineering' };
      const result = createProjectParams.parse(input);
      expect(result.name).toBe('Test Project');
      expect(result.team).toBe('Engineering');
    });

    it('should reject empty name', () => {
      expect(() => createProjectParams.parse({ name: '', team: 'Engineering' })).toThrow();
    });

    it('should accept optional description', () => {
      const input = { name: 'Test', team: 'Eng', description: 'Project description' };
      const result = createProjectParams.parse(input);
      expect(result.description).toBe('Project description');
    });

    it('should accept optional summary', () => {
      const input = { name: 'Test', team: 'Eng', summary: 'Short summary' };
      const result = createProjectParams.parse(input);
      expect(result.summary).toBe('Short summary');
    });

    it('should accept optional lead', () => {
      const input = { name: 'Test', team: 'Eng', lead: 'me' };
      const result = createProjectParams.parse(input);
      expect(result.lead).toBe('me');
    });

    it('should accept optional state', () => {
      const input = { name: 'Test', team: 'Eng', state: 'planned' };
      const result = createProjectParams.parse(input);
      expect(result.state).toBe('planned');
    });

    it('should accept optional startDate', () => {
      const input = { name: 'Test', team: 'Eng', startDate: '2025-01-01' };
      const result = createProjectParams.parse(input);
      expect(result.startDate).toBe('2025-01-01');
    });

    it('should accept optional targetDate', () => {
      const input = { name: 'Test', team: 'Eng', targetDate: '2025-12-31' };
      const result = createProjectParams.parse(input);
      expect(result.targetDate).toBe('2025-12-31');
    });

    it('should accept priority in range', () => {
      const input = { name: 'Test', team: 'Eng', priority: 1 };
      const result = createProjectParams.parse(input);
      expect(result.priority).toBe(1);
    });

    it('should reject priority below 0', () => {
      expect(() => createProjectParams.parse({ name: 'Test', team: 'Eng', priority: -1 })).toThrow();
    });

    it('should reject priority above 4', () => {
      expect(() => createProjectParams.parse({ name: 'Test', team: 'Eng', priority: 5 })).toThrow();
    });

    it('should accept optional labels', () => {
      const input = { name: 'Test', team: 'Eng', labels: ['bug', 'urgent'] };
      const result = createProjectParams.parse(input);
      expect(result.labels).toEqual(['bug', 'urgent']);
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

      const result = await createProject.execute({ name: 'Test Project', team: 'Engineering' });

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

      const result = await createProject.execute({ name: 'Project', team: 'Eng' });
      expect(() => createProjectOutput.parse(result)).not.toThrow();
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

      const result = await createProject.execute({ name: 'Project', team: 'Eng' });
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

      await expect(createProject.execute({ name: 'Test', team: 'Eng' })).rejects.toThrow('GraphQL execution failed');
    });

    it('should throw when creation fails (success: false)', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: { success: false }
      });

      await expect(createProject.execute({ name: 'Test', team: 'Eng' })).rejects.toThrow('Failed to create project');
    });

    it('should throw on null response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(null);

      await expect(createProject.execute({ name: 'Test', team: 'Eng' })).rejects.toThrow();
    });

    it('should throw on undefined response', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce(undefined);

      await expect(createProject.execute({ name: 'Test', team: 'Eng' })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in name', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProject.execute({ name: input, team: 'Eng' })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in description', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', description: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in team', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProject.execute({ name: 'Test', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in team', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createProject.execute({ name: 'Test', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in team', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createProject.execute({ name: 'Test', team: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in lead', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', lead: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in lead', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', lead: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in lead', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', lead: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in state', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in state', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in state', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in labels', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', labels: [input] })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in labels', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', labels: [input] })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in labels', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => createProject.execute({ name: 'Test', team: 'Eng', labels: [input] })
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
        createProjectParams.parse({ name: `Project ${i}`, team: `Team-${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // GraphQL Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle direct object format from GraphQL', async () => {
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

      const result = await createProject.execute({ name: 'Project', team: 'Eng' });
      expect(result.success).toBe(true);
      expect(result.project.id).toBe('project-uuid');
    });
  });

  // ==========================================================================
  // Template ID Enforcement Tests
  // ==========================================================================

  describe('Template ID Enforcement', () => {
    it('should include templateId in mutation input', async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        projectCreate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Test Project',
            url: 'https://linear.app/project',
          },
        },
      });

      await createProject.execute({ name: 'Test Project', team: 'Engineering' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            templateId: '11156350-e6e1-4712-b992-9e5b6e176ee3'
          })
        })
      );
    });

    it('should always include templateId even with minimal input', async () => {
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

      await createProject.execute({ name: 'Minimal', team: 'Eng' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            name: 'Minimal',
            teamId: 'Eng',
            templateId: '11156350-e6e1-4712-b992-9e5b6e176ee3'
          })
        })
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should pass all params to GraphQL mutation', async () => {
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

      await createProject.execute({
        name: 'Full Project',
        description: 'Full description',
        summary: 'Short summary',
        team: 'Engineering',
        lead: 'me',
        state: 'planned',
        startDate: '2025-01-01',
        targetDate: '2025-12-31',
        priority: 1,
        labels: ['bug', 'urgent'],
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            name: 'Full Project',
            description: 'Full description',
            summary: 'Short summary',
            teamId: 'Engineering',
            leadId: 'me',
            stateId: 'planned',
            startDate: '2025-01-01',
            targetDate: '2025-12-31',
            priority: 1,
            labelIds: ['bug', 'urgent'],
            templateId: '11156350-e6e1-4712-b992-9e5b6e176ee3',
          })
        })
      );
    });

    it('should only pass required fields when minimal input (plus templateId)', async () => {
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

      await createProject.execute({ name: 'Minimal', team: 'Eng' });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.objectContaining({
          input: {
            name: 'Minimal',
            teamId: 'Eng',
            templateId: '11156350-e6e1-4712-b992-9e5b6e176ee3'
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
      expect(createProject.name).toBe('linear.create_project');
    });

    it('should have description', () => {
      expect(createProject.description).toBeDefined();
      expect(typeof createProject.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(createProject.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(createProject.tokenEstimate).toBeDefined();
      expect(createProject.tokenEstimate.reduction).toBe('99%');
    });
  });
});
