/**
 * Unit Tests for Linear link-project-to-initiative Wrapper (GraphQL)
 *
 * Tests validate:
 * - Input validation (security constraints, format validation)
 * - Output schema compliance (required fields, type correctness)
 * - GraphQL HTTP call behavior
 * - Edge cases (null values, missing optional fields)
 * - Error handling (validation failures, GraphQL errors)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { graphql, HttpResponse } from 'msw';
import {
  linkProjectToInitiative,
  linkProjectToInitiativeParams,
  linkProjectToInitiativeOutput,
  type LinkProjectToInitiativeInput,
  type LinkProjectToInitiativeOutput,
} from './link-project-to-initiative';
import {
  CommandInjectionScenarios,
  PathTraversalScenarios,
} from '@claude/testing';

// MSW server setup with Linear GraphQL endpoint
const linearApi = graphql.link('https://api.linear.app/graphql');

const server = setupServer(
  linearApi.mutation('InitiativeToProjectCreate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        initiativeToProjectCreate: {
          success: true,
          initiativeToProject: {
            id: 'link-uuid-123',
          },
        },
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('linkProjectToInitiative (GraphQL)', () => {
  // =========================================================================
  // INPUT VALIDATION
  // =========================================================================

  describe('Input Validation', () => {
    it('should accept valid initiative and project IDs', async () => {
      server.use(
        linearApi.mutation('InitiativeToProjectCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeToProjectCreate: {
                success: true,
                initiativeToProject: {
                  id: 'link-1',
                },
              },
            },
          });
        })
      );

      const input: LinkProjectToInitiativeInput = {
        initiativeId: 'init-1',
        projectId: 'proj-1',
      };
      const result = await linkProjectToInitiative.execute(input, 'test-token');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should reject missing initiativeId', () => {
      const input = { projectId: 'proj-1' } as any;
      expect(() => linkProjectToInitiativeParams.parse(input)).toThrow();
    });

    it('should reject missing projectId', () => {
      const input = { initiativeId: 'init-1' } as any;
      expect(() => linkProjectToInitiativeParams.parse(input)).toThrow();
    });

    it('should reject empty initiativeId', () => {
      const input = { initiativeId: '', projectId: 'proj-1' };
      expect(() => linkProjectToInitiativeParams.parse(input)).toThrow();
    });

    it('should reject empty projectId', () => {
      const input = { initiativeId: 'init-1', projectId: '' };
      expect(() => linkProjectToInitiativeParams.parse(input)).toThrow();
    });
  });

  // =========================================================================
  // SECURITY VALIDATION
  // =========================================================================

  describe('Security Validation - Path Traversal', () => {
    PathTraversalScenarios.forEach(scenario => {
      it(`should block in initiativeId: ${scenario.description}`, () => {
        const input = { initiativeId: scenario.input, projectId: 'proj-1' };
        expect(() => linkProjectToInitiativeParams.parse(input)).toThrow(/traversal|invalid/i);
      });

      it(`should block in projectId: ${scenario.description}`, () => {
        const input = { initiativeId: 'init-1', projectId: scenario.input };
        expect(() => linkProjectToInitiativeParams.parse(input)).toThrow(/traversal|invalid/i);
      });
    });
  });

  describe('Security Validation - Command Injection', () => {
    CommandInjectionScenarios.forEach(scenario => {
      it(`should block in initiativeId: ${scenario.description}`, () => {
        const input = { initiativeId: scenario.input, projectId: 'proj-1' };
        expect(() => linkProjectToInitiativeParams.parse(input)).toThrow(/invalid|characters/i);
      });

      it(`should block in projectId: ${scenario.description}`, () => {
        const input = { initiativeId: 'init-1', projectId: scenario.input };
        expect(() => linkProjectToInitiativeParams.parse(input)).toThrow(/invalid|characters/i);
      });
    });
  });

  describe('Security Validation - Control Characters', () => {
    it('should reject null byte injection in initiativeId', () => {
      const input = { initiativeId: 'init\x00injection', projectId: 'proj-1' };
      expect(() => linkProjectToInitiativeParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('should reject control character in projectId', () => {
      const input = { initiativeId: 'init-1', projectId: 'proj\u0001malicious' };
      expect(() => linkProjectToInitiativeParams.parse(input)).toThrow(/control|invalid/i);
    });
  });

  // =========================================================================
  // OUTPUT SCHEMA - REQUIRED FIELDS
  // =========================================================================

  describe('Output Schema - Required Fields', () => {
    it('should return success: true when link succeeds', async () => {
      server.use(
        linearApi.mutation('InitiativeToProjectCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeToProjectCreate: {
                success: true,
                initiativeToProject: {
                  id: 'link-1',
                },
              },
            },
          });
        })
      );

      const result = await linkProjectToInitiative.execute(
        { initiativeId: 'init-1', projectId: 'proj-1' },
        'test-token'
      );

      expect(result.success).toBe(true);
    });

    it('should include initiativeToProjectId in output', async () => {
      server.use(
        linearApi.mutation('InitiativeToProjectCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeToProjectCreate: {
                success: true,
                initiativeToProject: {
                  id: 'link-uuid-abc',
                },
              },
            },
          });
        })
      );

      const result = await linkProjectToInitiative.execute(
        { initiativeId: 'init-1', projectId: 'proj-1' },
        'test-token'
      );

      expect(result.initiativeToProjectId).toBe('link-uuid-abc');
    });

    it('should include estimatedTokens in output', async () => {
      server.use(
        linearApi.mutation('InitiativeToProjectCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeToProjectCreate: {
                success: true,
                initiativeToProject: {
                  id: 'link-1',
                },
              },
            },
          });
        })
      );

      const result = await linkProjectToInitiative.execute(
        { initiativeId: 'init-1', projectId: 'proj-1' },
        'test-token'
      );

      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  describe('Error Handling', () => {
    it('should throw when mutation returns success: false', async () => {
      server.use(
        linearApi.mutation('InitiativeToProjectCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeToProjectCreate: {
                success: false,
                initiativeToProject: null,
              },
            },
          });
        })
      );

      await expect(
        linkProjectToInitiative.execute(
          { initiativeId: 'init-1', projectId: 'proj-1' },
          'test-token'
        )
      ).rejects.toThrow(/Failed to link/);
    });

    it('should throw when GraphQL returns errors', async () => {
      server.use(
        linearApi.mutation('InitiativeToProjectCreate', () => {
          return HttpResponse.json({
            errors: [{ message: 'GraphQL server error' }],
          });
        })
      );

      await expect(
        linkProjectToInitiative.execute(
          { initiativeId: 'init-1', projectId: 'proj-1' },
          'test-token'
        )
      ).rejects.toThrow(/GraphQL/);
    });

    it('should throw on validation failure - missing initiativeToProject', async () => {
      server.use(
        linearApi.mutation('InitiativeToProjectCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeToProjectCreate: {
                success: true,
                // Missing initiativeToProject
              },
            },
          });
        })
      );

      await expect(
        linkProjectToInitiative.execute(
          { initiativeId: 'init-1', projectId: 'proj-1' },
          'test-token'
        )
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // INTEGRATION - FULL WORKFLOW
  // =========================================================================

  describe('Full Workflow - Link Project to Initiative', () => {
    it('should handle complete link workflow with all fields', async () => {
      server.use(
        linearApi.mutation('InitiativeToProjectCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeToProjectCreate: {
                success: true,
                initiativeToProject: {
                  id: 'link-full-uuid-123',
                },
              },
            },
          });
        })
      );

      const result = await linkProjectToInitiative.execute(
        { initiativeId: 'Q2 2025 Roadmap', projectId: 'Authentication Overhaul' },
        'test-token'
      );

      expect(result.success).toBe(true);
      expect(result.initiativeToProjectId).toBe('link-full-uuid-123');
      expect(result.estimatedTokens).toBeDefined();
    });
  });

  // =========================================================================
  // WRAPPER METADATA
  // =========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(linkProjectToInitiative.name).toBe('linear.link_project_to_initiative');
    });

    it('should have tokenEstimate metadata', () => {
      expect(linkProjectToInitiative.tokenEstimate).toBeDefined();
      expect(linkProjectToInitiative.tokenEstimate.reduction).toBe('99%');
    });
  });
});
