/**
 * Unit Tests for Linear create-cycle Wrapper (GraphQL)
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
  createCycle,
  createCycleParams,
  createCycleOutput,
  type CreateCycleInput,
  type CreateCycleOutput,
} from './create-cycle';

const linearApi = graphql.link('https://api.linear.app/graphql');

const server = setupServer(
  linearApi.mutation('CycleCreate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        cycleCreate: {
          success: true,
          cycle: {
            id: 'cycle-uuid-123',
            name: variables.input?.name || 'Test Cycle',
            url: 'https://linear.app/team/cycle/123'
          },
        },
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createCycle (GraphQL)', () => {
  // =========================================================================
  // INPUT VALIDATION
  // =========================================================================

  describe('Input Validation', () => {
    it('should accept valid cycle with required fields only', async () => {
      const input: CreateCycleInput = {
        name: 'Sprint 1',
        team: 'Engineering'
      };
      const result = await createCycle.execute(input, 'test-token');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.cycle.name).toBeDefined();
    });

    it('should accept valid cycle with all optional fields', async () => {
      const input: CreateCycleInput = {
        name: 'Sprint 2',
        description: 'Q1 Sprint 2',
        team: 'Engineering',
        startsAt: '2025-01-15',
        endsAt: '2025-01-28'
      };
      const result = await createCycle.execute(input, 'test-token');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.cycle.name).toBe('Sprint 2');
    });

    it('should reject empty name', () => {
      const input = { name: '', team: 'Engineering' };
      expect(() => createCycleParams.parse(input)).toThrow();
    });

    it('should reject null name', () => {
      const input = { name: null, team: 'Engineering' };
      expect(() => createCycleParams.parse(input)).toThrow();
    });

    it('should reject missing name', () => {
      const input = { team: 'Engineering' };
      expect(() => createCycleParams.parse(input)).toThrow();
    });

    it('should reject empty team', () => {
      const input = { name: 'Sprint 1', team: '' };
      expect(() => createCycleParams.parse(input)).toThrow();
    });
  });

  // =========================================================================
  // SECURITY VALIDATION
  // =========================================================================

  describe('Security Validation - Control Characters in Name', () => {
    it('should reject null byte injection in name', () => {
      const input = { name: 'Sprint\x00injection', team: 'Engineering' };
      expect(() => createCycleParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('should reject control character 0x01 in name', () => {
      const input = { name: 'Sprint\u0001malicious', team: 'Engineering' };
      expect(() => createCycleParams.parse(input)).toThrow(/control|invalid/i);
    });
  });

  describe('Security Validation - Team Field', () => {
    it('should reject path traversal in team', () => {
      const input = { name: 'Sprint 1', team: '../../../etc/passwd' };
      expect(() => createCycleParams.parse(input)).toThrow(/path traversal/i);
    });

    it('should reject command injection in team', () => {
      const input = { name: 'Sprint 1', team: 'team; rm -rf /' };
      expect(() => createCycleParams.parse(input)).toThrow(/invalid characters/i);
    });
  });

  describe('Security Validation - Date Fields', () => {
    it('should reject control characters in startsAt', () => {
      const input = {
        name: 'Sprint 1',
        team: 'Engineering',
        startsAt: '2025-01-01\x00injection'
      };
      expect(() => createCycleParams.parse(input)).toThrow(/control|invalid/i);
    });

    it('should reject control characters in endsAt', () => {
      const input = {
        name: 'Sprint 1',
        team: 'Engineering',
        endsAt: '2025-01-28\x00injection'
      };
      expect(() => createCycleParams.parse(input)).toThrow(/control|invalid/i);
    });
  });

  // =========================================================================
  // OUTPUT SCHEMA - REQUIRED FIELDS
  // =========================================================================

  describe('Output Schema - Required Fields', () => {
    it('should return all required fields (success, cycle with id, name, url)', async () => {
      server.use(
        linearApi.mutation('CycleCreate', () => {
          return HttpResponse.json({
            data: {
              cycleCreate: {
                success: true,
                cycle: {
                  id: 'cycle-1',
                  name: 'Sprint 1',
                  url: 'https://linear.app/team/cycle/1'
                },
              },
            },
          });
        })
      );

      const result = await createCycle.execute(
        { name: 'Sprint 1', team: 'Engineering' },
        'test-token'
      );

      expect(result.success).toBe(true);
      expect(result.cycle.id).toBe('cycle-1');
      expect(result.cycle.name).toBe('Sprint 1');
      expect(result.cycle.url).toBe('https://linear.app/team/cycle/1');
    });

    it('should include estimatedTokens in output', async () => {
      const result = await createCycle.execute(
        { name: 'Test Cycle', team: 'Engineering' },
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
    it('should throw when GraphQL returns success: false', async () => {
      server.use(
        linearApi.mutation('CycleCreate', () => {
          return HttpResponse.json({
            data: {
              cycleCreate: {
                success: false,
              },
            },
          });
        })
      );

      await expect(
        createCycle.execute({ name: 'Failed Cycle', team: 'Engineering' }, 'test-token')
      ).rejects.toThrow(/Failed to create cycle/);
    });

    it('should throw when GraphQL returns errors', async () => {
      server.use(
        linearApi.mutation('CycleCreate', () => {
          return HttpResponse.json({
            errors: [
              {
                message: 'Team not found',
                path: ['cycleCreate'],
              },
            ],
          });
        })
      );

      await expect(
        createCycle.execute({ name: 'Cycle', team: 'NonExistent' }, 'test-token')
      ).rejects.toThrow(/GraphQL error/);
    });

    it('should throw when HTTP request fails', async () => {
      server.use(
        linearApi.mutation('CycleCreate', () => {
          return HttpResponse.json(
            { errors: [{ message: 'Internal Server Error' }] },
            { status: 500 }
          );
        })
      );

      await expect(
        createCycle.execute({ name: 'Test Cycle', team: 'Engineering' }, 'test-token')
      ).rejects.toThrow();
    });

    it('should throw on validation failure - missing cycle id', async () => {
      server.use(
        linearApi.mutation('CycleCreate', () => {
          return HttpResponse.json({
            data: {
              cycleCreate: {
                success: true,
                cycle: {
                  name: 'No ID Cycle',
                  url: 'https://linear.app/team/cycle/1'
                  // Missing id
                },
              },
            },
          });
        })
      );

      await expect(
        createCycle.execute({ name: 'Test Cycle', team: 'Engineering' }, 'test-token')
      ).rejects.toThrow();
    });

    it('should throw on validation failure - missing cycle url', async () => {
      server.use(
        linearApi.mutation('CycleCreate', () => {
          return HttpResponse.json({
            data: {
              cycleCreate: {
                success: true,
                cycle: {
                  id: 'cycle-1',
                  name: 'No URL Cycle',
                  // Missing url
                },
              },
            },
          });
        })
      );

      await expect(
        createCycle.execute({ name: 'Test Cycle', team: 'Engineering' }, 'test-token')
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
        linearApi.mutation('CycleCreate', ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: {
              cycleCreate: {
                success: true,
                cycle: {
                  id: 'cycle-1',
                  name: 'Test',
                  url: 'https://linear.app/team/cycle/1'
                },
              },
            },
          });
        })
      );

      await createCycle.execute({ name: 'Test', team: 'Engineering' }, 'test-token');

      expect(capturedVariables).toEqual({
        input: {
          name: 'Test',
          team: 'Engineering',
        },
      });
    });

    it('should pass all validated fields to GraphQL mutation', async () => {
      let capturedVariables: any;

      server.use(
        linearApi.mutation('CycleCreate', ({ variables }) => {
          capturedVariables = variables;
          return HttpResponse.json({
            data: {
              cycleCreate: {
                success: true,
                cycle: {
                  id: 'cycle-2',
                  name: 'Sprint 2',
                  url: 'https://linear.app/team/cycle/2'
                },
              },
            },
          });
        })
      );

      await createCycle.execute(
        {
          name: 'Sprint 2',
          description: 'Q1 Sprint 2',
          team: 'Engineering',
          startsAt: '2025-01-15',
          endsAt: '2025-01-28',
        },
        'test-token'
      );

      expect(capturedVariables).toEqual({
        input: {
          name: 'Sprint 2',
          description: 'Q1 Sprint 2',
          team: 'Engineering',
          startsAt: '2025-01-15',
          endsAt: '2025-01-28',
        },
      });
    });
  });

  // =========================================================================
  // INTEGRATION - FULL WORKFLOW
  // =========================================================================

  describe('Full Workflow - Complete Cycle Response', () => {
    it('should handle comprehensive cycle response with all fields', async () => {
      server.use(
        linearApi.mutation('CycleCreate', () => {
          return HttpResponse.json({
            data: {
              cycleCreate: {
                success: true,
                cycle: {
                  id: 'abc123-uuid-456',
                  name: 'Q2 2025 Sprint 1',
                  url: 'https://linear.app/engineering/cycle/abc123',
                  description: 'First sprint of Q2 2025',
                  startsAt: '2025-04-01',
                  endsAt: '2025-04-14',
                },
              },
            },
          });
        })
      );

      const result = await createCycle.execute(
        {
          name: 'Q2 2025 Sprint 1',
          description: 'First sprint of Q2 2025',
          team: 'Engineering',
          startsAt: '2025-04-01',
          endsAt: '2025-04-14',
        },
        'test-token'
      );

      expect(result.success).toBe(true);
      expect(result.cycle.id).toBe('abc123-uuid-456');
      expect(result.cycle.name).toBe('Q2 2025 Sprint 1');
      expect(result.cycle.url).toBe('https://linear.app/engineering/cycle/abc123');
      expect(result.estimatedTokens).toBeDefined();
    });

    it('should handle minimal cycle response with only required fields', async () => {
      server.use(
        linearApi.mutation('CycleCreate', () => {
          return HttpResponse.json({
            data: {
              cycleCreate: {
                success: true,
                cycle: {
                  id: 'cycle-1',
                  name: 'Minimal Cycle',
                  url: 'https://linear.app/team/cycle/1'
                },
              },
            },
          });
        })
      );

      const result = await createCycle.execute(
        { name: 'Minimal Cycle', team: 'Engineering' },
        'test-token'
      );

      expect(result.success).toBe(true);
      expect(result.cycle.id).toBe('cycle-1');
      expect(result.cycle.name).toBe('Minimal Cycle');
      expect(result.cycle.url).toBe('https://linear.app/team/cycle/1');
      expect(result.estimatedTokens).toBeDefined();
    });
  });

  // =========================================================================
  // WRAPPER METADATA
  // =========================================================================

  describe('Wrapper Metadata', () => {
    it('should have correct name', () => {
      expect(createCycle.name).toBe('linear.create_cycle');
    });

    it('should have descriptive description', () => {
      expect(createCycle.description).toBe('Create a new cycle in Linear');
    });

    it('should have parameters schema', () => {
      expect(createCycle.parameters).toBeDefined();
    });

    it('should have tokenEstimate metadata', () => {
      expect(createCycle.tokenEstimate).toBeDefined();
      expect(createCycle.tokenEstimate.reduction).toBe('99%');
    });
  });
});
