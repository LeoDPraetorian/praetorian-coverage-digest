/**
 * Unit Tests for Linear delete-project Wrapper (GraphQL)
 *
 * Tests validate:
 * - Input validation (security constraints, format validation)
 * - Output schema compliance (required fields, type correctness)
 * - GraphQL call behavior (mutation execution, response parsing)
 * - Error handling (validation failures, GraphQL errors)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { graphql, HttpResponse } from 'msw';
import {
  deleteProject,
  deleteProjectParams,
  deleteProjectOutput,
  type DeleteProjectInput,
  type DeleteProjectOutput,
} from './delete-project';

const linearApi = graphql.link('https://api.linear.app/graphql');

const server = setupServer(
  linearApi.mutation('ProjectDelete', () => {
    return HttpResponse.json({
      data: {
        projectDelete: {
          success: true,
        },
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('deleteProject (GraphQL)', () => {
  // =========================================================================
  // SUCCESSFUL DELETION
  // =========================================================================

  describe('successful deletion', () => {
    it('deletes a project and returns success', async () => {
      const input: DeleteProjectInput = { id: 'proj-123' };
      const result = await deleteProject.execute(input, 'test-token');

      expect(result.success).toBe(true);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should return all required fields (success)', async () => {
      const input: DeleteProjectInput = { id: 'proj-456' };
      const result = await deleteProject.execute(input, 'test-token');

      expect(result.success).toBe(true);
      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // =========================================================================
  // INPUT VALIDATION
  // =========================================================================

  describe('input validation', () => {
    it('should accept valid project ID', async () => {
      const input: DeleteProjectInput = { id: 'proj-valid-uuid-123' };
      const result = await deleteProject.execute(input, 'test-token');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('rejects empty id', async () => {
      const input = { id: '' };

      await expect(deleteProject.execute(input as DeleteProjectInput, 'test-token')).rejects.toThrow();
    });

    it('should reject null id', () => {
      const input = { id: null };
      expect(() => deleteProjectParams.parse(input)).toThrow();
    });

    it('should reject missing id', () => {
      const input = {};
      expect(() => deleteProjectParams.parse(input)).toThrow();
    });
  });

  // =========================================================================
  // SECURITY VALIDATION
  // =========================================================================

  describe('security validation', () => {
    it('rejects id with control characters', async () => {
      const input = { id: 'proj-123\x00' };

      await expect(deleteProject.execute(input as DeleteProjectInput, 'test-token')).rejects.toThrow(/control characters/i);
    });

    it('should reject control character 0x01 in id', () => {
      const input = { id: 'proj-123\u0001' };
      expect(() => deleteProjectParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('rejects id with path traversal', async () => {
      const input = { id: '../../../etc/passwd' };

      await expect(deleteProject.execute(input as DeleteProjectInput, 'test-token')).rejects.toThrow(/path traversal/i);
    });

    it('should reject path traversal patterns', () => {
      const input = { id: '../../malicious' };
      expect(() => deleteProjectParams.parse(input)).toThrow(/path traversal|invalid/i);
    });

    it('should reject command injection attempts', () => {
      const input = { id: 'proj-123; rm -rf /' };
      expect(() => deleteProjectParams.parse(input)).toThrow(/invalid characters/i);
    });
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  describe('error handling', () => {
    it('throws error when deletion fails', async () => {
      server.use(
        linearApi.mutation('ProjectDelete', () => {
          return HttpResponse.json({
            data: {
              projectDelete: {
                success: false,
              },
            },
          });
        })
      );

      const input: DeleteProjectInput = { id: 'proj-123' };

      await expect(
        deleteProject.execute(input, 'test-token')
      ).rejects.toThrow('Failed to delete project');
    });

    it('should throw when GraphQL returns errors', async () => {
      server.use(
        linearApi.mutation('ProjectDelete', () => {
          return HttpResponse.json({
            errors: [
              {
                message: 'Project not found',
                path: ['projectDelete'],
              },
            ],
          });
        })
      );

      const input: DeleteProjectInput = { id: 'proj-nonexistent' };

      await expect(
        deleteProject.execute(input, 'test-token')
      ).rejects.toThrow(/GraphQL errors/);
    });

    it('should throw when HTTP request fails', async () => {
      server.use(
        linearApi.mutation('ProjectDelete', () => {
          return HttpResponse.json(
            { errors: [{ message: 'Internal Server Error' }] },
            { status: 500 }
          );
        })
      );

      const input: DeleteProjectInput = { id: 'proj-123' };

      await expect(
        deleteProject.execute(input, 'test-token')
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // GRAPHQL CALL BEHAVIOR
  // =========================================================================

  describe('GraphQL call behavior', () => {
    it('should send GraphQL mutation with correct structure', async () => {
      let capturedVariables: any;

      server.use(
        linearApi.mutation('ProjectDelete', ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: {
              projectDelete: {
                success: true,
              },
            },
          });
        })
      );

      const input: DeleteProjectInput = { id: 'proj-test-123' };
      await deleteProject.execute(input, 'test-token');

      expect(capturedVariables).toEqual({
        id: 'proj-test-123',
      });
    });

    it('should pass validated ID to GraphQL mutation', async () => {
      let capturedVariables: any;

      server.use(
        linearApi.mutation('ProjectDelete', ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: {
              projectDelete: {
                success: true,
              },
            },
          });
        })
      );

      const input: DeleteProjectInput = { id: 'proj-specific-id' };
      await deleteProject.execute(input, 'test-token');

      expect(capturedVariables.id).toBe('proj-specific-id');
    });
  });

  // =========================================================================
  // OUTPUT SCHEMA VALIDATION
  // =========================================================================

  describe('output schema validation', () => {
    it('should validate output matches schema', async () => {
      const input: DeleteProjectInput = { id: 'proj-123' };
      const result = await deleteProject.execute(input, 'test-token');

      // Should not throw
      expect(() => deleteProjectOutput.parse(result)).not.toThrow();
    });

    it('should include estimatedTokens in output', async () => {
      const input: DeleteProjectInput = { id: 'proj-123' };
      const result = await deleteProject.execute(input, 'test-token');

      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // WRAPPER METADATA
  // =========================================================================

  describe('wrapper metadata', () => {
    it('should have correct name', () => {
      expect(deleteProject.name).toBe('linear.delete_project');
    });

    it('should have descriptive description', () => {
      expect(deleteProject.description).toBe('Delete a project in Linear');
    });

    it('should have parameters schema', () => {
      expect(deleteProject.parameters).toBeDefined();
    });

    it('should have tokenEstimate metadata', () => {
      expect(deleteProject.tokenEstimate).toBeDefined();
      expect(deleteProject.tokenEstimate.reduction).toBe('99%');
    });
  });
});
