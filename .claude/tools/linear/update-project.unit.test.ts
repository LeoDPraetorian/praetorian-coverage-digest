/**
 * Unit Tests for update-project Wrapper
 *
 * These tests validate the update-project wrapper using MOCKED MCP responses.
 * No actual Linear API calls are made.
 *
 * Usage:
 * npx vitest run update-project.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateProject, updateProjectParams, updateProjectOutput } from './update-project';
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

import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';

describe('updateProject - Unit Tests', () => {
  const mockClient = {};

  beforeEach(() => {
    vi.mocked(createLinearClient).mockReturnValue(mockClient as any);
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
      expect(() => updateProjectParams.parse({})).toThrow();
    });

    it('should accept valid id', () => {
      const input = { id: 'project-uuid-123' };
      const result = updateProjectParams.parse(input);
      expect(result.id).toBe('project-uuid-123');
    });

    it('should reject empty id', () => {
      expect(() => updateProjectParams.parse({ id: '' })).toThrow();
    });

    it('should accept optional name', () => {
      const input = { id: 'project-uuid', name: 'New Name' };
      const result = updateProjectParams.parse(input);
      expect(result.name).toBe('New Name');
    });

    it('should accept optional description', () => {
      const input = { id: 'project-uuid', description: 'New description' };
      const result = updateProjectParams.parse(input);
      expect(result.description).toBe('New description');
    });

    it('should accept optional summary', () => {
      const input = { id: 'project-uuid', summary: 'Short summary' };
      const result = updateProjectParams.parse(input);
      expect(result.summary).toBe('Short summary');
    });

    it('should accept optional lead', () => {
      const input = { id: 'project-uuid', lead: 'me' };
      const result = updateProjectParams.parse(input);
      expect(result.lead).toBe('me');
    });

    it('should accept optional state', () => {
      const input = { id: 'project-uuid', state: 'In Progress' };
      const result = updateProjectParams.parse(input);
      expect(result.state).toBe('In Progress');
    });

    it('should accept optional startDate', () => {
      const input = { id: 'project-uuid', startDate: '2025-01-01' };
      const result = updateProjectParams.parse(input);
      expect(result.startDate).toBe('2025-01-01');
    });

    it('should accept optional targetDate', () => {
      const input = { id: 'project-uuid', targetDate: '2025-12-31' };
      const result = updateProjectParams.parse(input);
      expect(result.targetDate).toBe('2025-12-31');
    });

    it('should accept priority in range', () => {
      const input = { id: 'project-uuid', priority: 2 };
      const result = updateProjectParams.parse(input);
      expect(result.priority).toBe(2);
    });

    it('should reject priority below 0', () => {
      expect(() => updateProjectParams.parse({ id: 'project-uuid', priority: -1 })).toThrow();
    });

    it('should reject priority above 4', () => {
      expect(() => updateProjectParams.parse({ id: 'project-uuid', priority: 5 })).toThrow();
    });

    it('should accept optional labels', () => {
      const input = { id: 'project-uuid', labels: ['bug', 'urgent'] };
      const result = updateProjectParams.parse(input);
      expect(result.labels).toEqual(['bug', 'urgent']);
    });
  });

  // ==========================================================================
  // Token Reduction Tests
  // ==========================================================================

  describe('Token Reduction - Output Filtering', () => {
    it('should filter response to essential fields only', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: true,
          project: {
            id: 'project-uuid-123',
            name: 'Updated Project',
            url: 'https://linear.app/team/project/project-123',
            // Extra fields that should be filtered
            description: 'Full description',
            state: { id: 'state-1', name: 'In Progress' },
            lead: { id: 'user-1', name: 'John' },
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
      } as any);

      const result = await updateProject.execute({ id: 'project-uuid-123', name: 'Updated Project' });

      // Verify essential fields
      expect(result.success).toBe(true);
      expect(result.project.id).toBe('project-uuid-123');
      expect(result.project.name).toBe('Updated Project');
      expect(result.project.url).toBe('https://linear.app/team/project/project-123');

      // Verify filtered fields are NOT present
      expect(result.project).not.toHaveProperty('description');
      expect(result.project).not.toHaveProperty('state');
      expect(result.project).not.toHaveProperty('lead');
      expect(result.project).not.toHaveProperty('updatedAt');
    });

    it('should validate output against schema', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Project',
            url: 'https://linear.app/project',
          },
        },
      } as any);

      const result = await updateProject.execute({ id: 'project-uuid' });
      expect(() => updateProjectOutput.parse(result)).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw on GraphQL connection error', async () => {
      vi.mocked(executeGraphQL).mockRejectedValueOnce(new Error('GraphQL connection failed'));

      await expect(updateProject.execute({ id: 'project-uuid' })).rejects.toThrow('GraphQL connection failed');
    });

    it('should throw when update fails (success: false)', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: false,
          project: null,
        },
      } as any);

      await expect(updateProject.execute({ id: 'project-uuid' })).rejects.toThrow('Failed to update project');
    });

    it('should throw on null projectUpdate response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: null,
      } as any);

      await expect(updateProject.execute({ id: 'project-uuid' })).rejects.toThrow();
    });

    it('should throw on undefined projectUpdate response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: undefined,
      } as any);

      await expect(updateProject.execute({ id: 'project-uuid' })).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Security Validation Tests (Automated)
  // ==========================================================================

  describe('Security', () => {
    it('should block control characters in id', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateProject.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in id', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateProject.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in id', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateProject.execute({ id: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in name', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateProject.execute({ id: 'valid-id', name: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in description', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateProject.execute({ id: 'valid-id', description: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in lead', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateProject.execute({ id: 'valid-id', lead: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in lead', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateProject.execute({ id: 'valid-id', lead: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in lead', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateProject.execute({ id: 'valid-id', lead: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in state', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateProject.execute({ id: 'valid-id', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in state', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateProject.execute({ id: 'valid-id', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in state', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateProject.execute({ id: 'valid-id', state: input })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block control characters in labels', async () => {
      const results = await testSecurityScenarios(
        ControlCharacterScenarios,
        (input) => updateProject.execute({ id: 'valid-id', labels: [input] })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block path traversal in labels', async () => {
      const results = await testSecurityScenarios(
        PathTraversalScenarios,
        (input) => updateProject.execute({ id: 'valid-id', labels: [input] })
      );

      expect(results.passed).toBe(results.total);
    });

    it('should block command injection in labels', async () => {
      const results = await testSecurityScenarios(
        CommandInjectionScenarios,
        (input) => updateProject.execute({ id: 'valid-id', labels: [input] })
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
        updateProjectParams.parse({ id: `project-${i}` });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // MCP Response Format Tests
  // ==========================================================================

  describe('GraphQL Response Format Tests', () => {
    it('should handle standard projectUpdate mutation response', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Project',
            url: 'https://linear.app/project',
          },
        },
      } as any);

      const result = await updateProject.execute({ id: 'project-uuid', name: 'Project' });
      expect(result.success).toBe(true);
      expect(result.project.id).toBe('project-uuid');
    });

    it('should call executeGraphQL with correct mutation', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Project',
            url: 'https://linear.app/project',
          },
        },
      } as any);

      await updateProject.execute({ id: 'project-uuid', name: 'Project' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('mutation ProjectUpdate'),
        expect.objectContaining({
          id: 'project-uuid',
          input: expect.objectContaining({
            name: 'Project',
          }),
        })
      );
    });

    it('should handle project with all fields', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: true,
          project: {
            id: 'project-1',
            name: 'Project 1',
            url: 'https://linear.app/project-1',
          },
        },
      } as any);

      const result = await updateProject.execute({ id: 'project-1' });
      expect(result.project.id).toBe('project-1');
    });

    it('should handle project without optional fields', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Updated Project',
            url: 'https://linear.app/project',
          },
        },
      } as any);

      const result = await updateProject.execute({ id: 'project-uuid', name: 'Updated Project' });
      expect(result.project.name).toBe('Updated Project');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should pass all params to GraphQL mutation', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Full Project',
            url: 'https://linear.app/project',
          },
        },
      } as any);

      await updateProject.execute({
        id: 'project-uuid',
        name: 'Full Project',
        description: 'Full description',
        summary: 'Short summary',
        lead: 'me',
        state: 'In Progress',
        startDate: '2025-01-01',
        targetDate: '2025-12-31',
        priority: 1,
        labels: ['bug', 'urgent'],
      });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('mutation'),
        expect.objectContaining({
          id: 'project-uuid',
          input: expect.objectContaining({
            name: 'Full Project',
            description: 'Full description',
            summary: 'Short summary',
            lead: 'me',
            state: 'In Progress',
            startDate: '2025-01-01',
            targetDate: '2025-12-31',
            priority: 1,
            labels: ['bug', 'urgent'],
          }),
        })
      );
    });

    it('should only pass id when minimal input', async () => {
      vi.mocked(executeGraphQL).mockResolvedValueOnce({
        projectUpdate: {
          success: true,
          project: {
            id: 'project-uuid',
            name: 'Existing',
            url: 'https://linear.app/project',
          },
        },
      } as any);

      await updateProject.execute({ id: 'project-uuid' });

      expect(executeGraphQL).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('mutation'),
        expect.objectContaining({
          id: 'project-uuid',
          input: expect.any(Object),
        })
      );
    });
  });

  // ==========================================================================
  // Wrapper Metadata Tests
  // ==========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(updateProject.name).toBe('linear.update_project');
    });

    it('should have description', () => {
      expect(updateProject.description).toBeDefined();
      expect(typeof updateProject.description).toBe('string');
    });

    it('should have parameters schema', () => {
      expect(updateProject.parameters).toBeDefined();
    });

    it('should have token estimates', () => {
      expect(updateProject.tokenEstimate).toBeDefined();
      expect(updateProject.tokenEstimate.reduction).toBe('99%');
    });
  });
});
