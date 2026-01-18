/**
 * Unit Tests for Linear create-initiative Wrapper (GraphQL)
 *
 * Tests validate:
 * - Input validation (security constraints, format validation)
 * - Output schema compliance (required fields, type correctness)
 * - GraphQL call behavior (mutation execution, response parsing)
 * - Edge cases (null values, missing optional fields)
 * - Error handling (validation failures, GraphQL errors)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { graphql, HttpResponse } from 'msw';
import {
  createInitiative,
  createInitiativeParams,
  createInitiativeOutput,
  type CreateInitiativeInput,
  type CreateInitiativeOutput,
} from '../create-initiative';

const linearApi = graphql.link('https://api.linear.app/graphql');

const server = setupServer(
  linearApi.mutation('InitiativeCreate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        initiativeCreate: {
          success: true,
          initiative: {
            id: 'init-uuid-123',
            name: variables.input?.name || 'Test Initiative',
          },
        },
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createInitiative (GraphQL)', () => {
  // =========================================================================
  // INPUT VALIDATION
  // =========================================================================

  describe('Input Validation', () => {
    it('should accept valid initiative with required fields only', async () => {
      const input: CreateInitiativeInput = {
        name: 'Q2 2025 Product Roadmap',
      };
      const result = await createInitiative.execute(input, 'test-api-key');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.initiative.name).toBeDefined();
    });

    it('should accept valid initiative with all optional fields', async () => {
      const input: CreateInitiativeInput = {
        name: 'Annual Platform Modernization',
        description: 'Modernize the entire platform infrastructure',
        targetDate: '2025-12-31',
      };
      const result = await createInitiative.execute(input, 'test-api-key');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.initiative.name).toBe('Annual Platform Modernization');
    });

    it('should reject empty name', () => {
      const input = { name: '' };
      expect(() => createInitiativeParams.parse(input)).toThrow();
    });

    it('should reject null name', () => {
      const input = { name: null };
      expect(() => createInitiativeParams.parse(input)).toThrow();
    });

    it('should reject missing name', () => {
      const input = {};
      expect(() => createInitiativeParams.parse(input)).toThrow();
    });
  });

  // =========================================================================
  // SECURITY VALIDATION
  // =========================================================================

  describe('Security Validation - Control Characters in Name', () => {
    it('should reject null byte injection in name', () => {
      const input = { name: 'Initiative\x00injection' };
      expect(() => createInitiativeParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('should reject control character 0x01 in name', () => {
      const input = { name: 'Initiative\u0001malicious' };
      expect(() => createInitiativeParams.parse(input)).toThrow(/control|invalid/i);
    });
  });

  describe('Security Validation - Control Characters in Description', () => {
    it('should reject dangerous control characters in description', () => {
      const input = {
        name: 'Valid Initiative',
        description: 'Description\x00injection',
      };
      expect(() => createInitiativeParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('should allow newlines and tabs in description', () => {
      const input = {
        name: 'Valid Initiative',
        description: 'Description with\nnewlines\tand\ttabs',
      };
      expect(() => createInitiativeParams.parse(input)).not.toThrow();
    });
  });

  describe('Security Validation - Date Fields', () => {
    it('should reject control characters in targetDate', () => {
      const input = {
        name: 'Valid Initiative',
        targetDate: '2025-12-31\x00injection',
      };
      expect(() => createInitiativeParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('should accept valid ISO date format', () => {
      const input = {
        name: 'Valid Initiative',
        targetDate: '2025-12-31',
      };
      expect(() => createInitiativeParams.parse(input)).not.toThrow();
    });
  });

  // =========================================================================
  // OUTPUT SCHEMA - REQUIRED FIELDS
  // =========================================================================

  describe('Output Schema - Required Fields', () => {
    it('should return all required fields (success, initiative with id and name)', async () => {
      server.use(
        linearApi.mutation('InitiativeCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeCreate: {
                success: true,
                initiative: {
                  id: 'init-1',
                  name: 'Q2 2025 Product Roadmap',
                },
              },
            },
          });
        })
      );

      const result = await createInitiative.execute(
        { name: 'Q2 2025 Product Roadmap' },
        'test-api-key'
      );

      expect(result.success).toBe(true);
      expect(result.initiative.id).toBe('init-1');
      expect(result.initiative.name).toBe('Q2 2025 Product Roadmap');
    });

    it('should include estimatedTokens in output', async () => {
      const result = await createInitiative.execute(
        { name: 'Test Initiative' },
        'test-api-key'
      );

      expect(result.estimatedTokens).toBeDefined();
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  describe('Error Handling', () => {
    it('should throw when GraphQL returns success: false', async () => {
      server.use(
        linearApi.mutation('InitiativeCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeCreate: {
                success: false,
              },
            },
          });
        })
      );

      await expect(
        createInitiative.execute({ name: 'Failed Initiative' }, 'test-api-key')
      ).rejects.toThrow(/Failed to create initiative/);
    });

    it('should throw when GraphQL returns errors', async () => {
      server.use(
        linearApi.mutation('InitiativeCreate', () => {
          return HttpResponse.json({
            errors: [
              {
                message: 'Initiative name already exists',
                path: ['initiativeCreate'],
              },
            ],
          });
        })
      );

      await expect(
        createInitiative.execute({ name: 'Duplicate Initiative' }, 'test-api-key')
      ).rejects.toThrow(/GraphQL errors/);
    });

    it('should throw when HTTP request fails', async () => {
      server.use(
        linearApi.mutation('InitiativeCreate', () => {
          return HttpResponse.json(
            { errors: [{ message: 'Internal Server Error' }] },
            { status: 500 }
          );
        })
      );

      await expect(
        createInitiative.execute({ name: 'Test Initiative' }, 'test-api-key')
      ).rejects.toThrow();
    });

    it('should throw on validation failure - missing initiative id', async () => {
      server.use(
        linearApi.mutation('InitiativeCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeCreate: {
                success: true,
                initiative: {
                  name: 'No ID Initiative',
                  // Missing id
                },
              },
            },
          });
        })
      );

      await expect(
        createInitiative.execute({ name: 'Test Initiative' }, 'test-api-key')
      ).rejects.toThrow();
    });

    it('should throw on validation failure - missing initiative name', async () => {
      server.use(
        linearApi.mutation('InitiativeCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeCreate: {
                success: true,
                initiative: {
                  id: 'init-1',
                  // Missing name
                },
              },
            },
          });
        })
      );

      await expect(
        createInitiative.execute({ name: 'Test Initiative' }, 'test-api-key')
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // GRAPHQL CALL BEHAVIOR
  // =========================================================================

  describe('GraphQL Call Behavior', () => {
    it('should send GraphQL mutation with correct structure', async () => {
      let capturedVariables: any;

      server.use(
        linearApi.mutation('InitiativeCreate', ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: {
              initiativeCreate: {
                success: true,
                initiative: {
                  id: 'init-1',
                  name: 'Test',
                },
              },
            },
          });
        })
      );

      await createInitiative.execute({ name: 'Test' }, 'test-api-key');

      expect(capturedVariables).toEqual({
        input: {
          name: 'Test',
        },
      });
    });

    it('should pass all validated fields to GraphQL mutation', async () => {
      let capturedVariables: any;

      server.use(
        linearApi.mutation('InitiativeCreate', ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: {
              initiativeCreate: {
                success: true,
                initiative: {
                  id: 'init-1',
                  name: 'Q2 2025 Roadmap',
                },
              },
            },
          });
        })
      );

      await createInitiative.execute(
        {
          name: 'Q2 2025 Roadmap',
          description: 'Detailed roadmap for Q2',
          targetDate: '2025-06-30',
        },
        'test-api-key'
      );

      expect(capturedVariables).toEqual({
        input: {
          name: 'Q2 2025 Roadmap',
          description: 'Detailed roadmap for Q2',
          targetDate: '2025-06-30',
        },
      });
    });
  });

  // =========================================================================
  // INTEGRATION - FULL WORKFLOW
  // =========================================================================

  describe('Full Workflow - Complete Initiative Response', () => {
    it('should handle comprehensive initiative response with all fields', async () => {
      server.use(
        linearApi.mutation('InitiativeCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeCreate: {
                success: true,
                initiative: {
                  id: 'abc123-uuid-456',
                  name: '2025 Digital Transformation',
                  description: 'Complete platform modernization initiative',
                  targetDate: '2025-12-31',
                  createdAt: '2025-01-05T10:00:00Z',
                },
              },
            },
          });
        })
      );

      const result = await createInitiative.execute(
        {
          name: '2025 Digital Transformation',
          description: 'Complete platform modernization initiative',
          targetDate: '2025-12-31',
        },
        'test-api-key'
      );

      expect(result.success).toBe(true);
      expect(result.initiative.id).toBe('abc123-uuid-456');
      expect(result.initiative.name).toBe('2025 Digital Transformation');
      expect(result.estimatedTokens).toBeDefined();
    });

    it('should handle minimal initiative response with only required fields', async () => {
      server.use(
        linearApi.mutation('InitiativeCreate', () => {
          return HttpResponse.json({
            data: {
              initiativeCreate: {
                success: true,
                initiative: {
                  id: 'init-1',
                  name: 'Minimal Initiative',
                },
              },
            },
          });
        })
      );

      const result = await createInitiative.execute(
        { name: 'Minimal Initiative' },
        'test-api-key'
      );

      expect(result.success).toBe(true);
      expect(result.initiative.id).toBe('init-1');
      expect(result.initiative.name).toBe('Minimal Initiative');
      expect(result.estimatedTokens).toBeDefined();
    });
  });

  // =========================================================================
  // WRAPPER METADATA
  // =========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(createInitiative.name).toBe('linear.create_initiative');
    });

    it('should have descriptive description', () => {
      expect(createInitiative.description).toBe('Create a new initiative in Linear');
    });

    it('should have parameters schema', () => {
      expect(createInitiative.parameters).toBeDefined();
    });

    it('should have tokenEstimate metadata', () => {
      expect(createInitiative.tokenEstimate).toBeDefined();
      expect(createInitiative.tokenEstimate.reduction).toBe('99%');
    });
  });
});
